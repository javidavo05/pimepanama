import { prisma } from "@/lib/prisma";
import { resolveOwnerUserId } from "@/lib/owner-user";
import { bookingMinNoticeHours, bookingTimezone } from "./config";

/** Alias histórico: la resolución del dueño vive en `@/lib/owner-user`. */
export function resolveBookingOwnerUserId(explicitUserId?: string | null) {
  return resolveOwnerUserId(explicitUserId);
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Desfase (minutos) de una zona horaria en un instante: UTC − hora local. Panamá = 300 todo el año. */
export function desfaseZona(tz: string, instante: Date): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(instante).map((x) => [x.type, x.value]));
  const comoUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return Math.round((instante.getTime() - comoUtc) / 60000);
}

/** El instante UTC de una hora de reloj (minutos desde medianoche) de una fecha YYYY-MM-DD en una zona. */
export function horaEnZona(fecha: string, minutos: number, tz: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  const aproximado = new Date(Date.UTC(y, m - 1, d, Math.floor(minutos / 60), minutos % 60));
  return new Date(aproximado.getTime() + desfaseZona(tz, aproximado) * 60000);
}

/** Fecha YYYY-MM-DD de un instante en una zona, y su día de la semana (0 = domingo). */
function fechaEnZona(instante: Date, tz: string): { fecha: string; weekday: number } {
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
  const [y, m, d] = fecha.split("-").map(Number);
  return { fecha, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

type Regla = { weekday: number; startTime: string; endTime: string; timezone: string };

/**
 * Turnos posibles entre [from, to) según las reglas, cada una en SU zona horaria (antes se usaba la hora del
 * servidor: en Vercel, UTC, y las 9:00 de Panamá salían a las 4:00). Puro: sin base de datos.
 */
export function turnosPosibles(reglas: Regla[], from: Date, to: Date, duracion: number, buffer: number): { startTime: Date; endTime: Date; start: string; end: string }[] {
  const out: { startTime: Date; endTime: Date; start: string; end: string }[] = [];
  const vistos = new Set<string>();
  for (const r of reglas) {
    const tz = r.timezone || "America/Panama";
    // Se recorren las fechas locales que tocan el rango (un día de margen a cada lado) y se filtra por instante.
    for (let t = from.getTime() - 86_400_000; t <= to.getTime() + 86_400_000; t += 86_400_000) {
      const { fecha, weekday } = fechaEnZona(new Date(t), tz);
      if (weekday !== r.weekday || vistos.has(`${fecha}|${r.startTime}|${r.endTime}|${tz}`)) continue;
      vistos.add(`${fecha}|${r.startTime}|${r.endTime}|${tz}`);
      for (let c = parseTime(r.startTime); c + duracion <= parseTime(r.endTime); c += duracion + buffer) {
        const startTime = horaEnZona(fecha, c, tz);
        if (startTime < from || startTime >= to) continue;
        out.push({ startTime, endTime: new Date(startTime.getTime() + duracion * 60000), start: formatTime(c), end: formatTime(c + duracion) });
      }
    }
  }
  return out.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export type Slot = { start: string; end: string; startTime: Date; endTime: Date };

export async function computeAvailableSlots(opts: {
  userId: string;
  eventTypeSlug: string;
  from: Date;
  to: Date;
}): Promise<Slot[]> {
  const eventType = await prisma.bookingEventType.findFirst({
    where: { userId: opts.userId, slug: opts.eventTypeSlug, active: true },
  });
  if (!eventType) return [];

  const availability = await prisma.bookingAvailability.findMany({
    where: { userId: opts.userId },
  });
  if (!availability.length) return [];

  const minStart = new Date(Date.now() + bookingMinNoticeHours() * 60 * 60 * 1000);

  const existingBookings = await prisma.booking.findMany({
    where: {
      userId: opts.userId,
      status: "CONFIRMED",
      startTime: { gte: opts.from, lte: opts.to },
    },
    select: { startTime: true, endTime: true },
  });

  const busyTasks = await prisma.task.findMany({
    where: {
      userId: opts.userId,
      completed: false,
      dueDate: { gte: opts.from, lte: opts.to },
    },
    select: { dueDate: true, endDate: true, allDay: true },
  });

  const slots: Slot[] = [];
  const duration = eventType.durationMin;
  const buffer = eventType.bufferMin;

  for (const t of turnosPosibles(availability, opts.from, opts.to, duration, buffer)) {
    const { startTime, endTime } = t;
    if (startTime < minStart) continue;
    const bufferedStart = new Date(startTime.getTime() - buffer * 60 * 1000);
    const bufferedEnd = new Date(endTime.getTime() + buffer * 60 * 1000);
    const bookingConflict = existingBookings.some((b) => b.startTime < bufferedEnd && b.endTime > bufferedStart);
    const taskConflict = busyTasks.some((tk) => {
      if (!tk.dueDate || tk.allDay) return false;
      const tEnd = tk.endDate ?? new Date(tk.dueDate.getTime() + 60 * 60 * 1000);
      return tk.dueDate < bufferedEnd && tEnd > bufferedStart;
    });
    if (!bookingConflict && !taskConflict) slots.push({ start: t.start, end: t.end, startTime, endTime });
  }

  return slots;
}

export async function ensureDefaultBookingSetup(userId: string) {
  const count = await prisma.bookingEventType.count({ where: { userId } });
  if (count > 0) return;

  await prisma.bookingEventType.create({
    data: {
      userId,
      slug: "consulta",
      title: "Consulta",
      durationMin: 30,
      bufferMin: 10,
      description: "Reunión inicial de 30 minutos",
    },
  });

  const weekdays = [1, 2, 3, 4, 5];
  for (const weekday of weekdays) {
    await prisma.bookingAvailability.create({
      data: {
        userId,
        weekday,
        startTime: "09:00",
        endTime: "17:00",
        timezone: bookingTimezone(),
      },
    });
  }
}
