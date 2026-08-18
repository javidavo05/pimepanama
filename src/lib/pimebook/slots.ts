import { prisma } from "@/lib/prisma";
import { bookingMinNoticeHours, bookingTimezone } from "./config";

export async function resolveBookingOwnerUserId(explicitUserId?: string | null) {
  if (explicitUserId) {
    const u = await prisma.empresaUser.findUnique({ where: { id: explicitUserId } });
    if (u) return u.id;
  }

  const email = process.env.BOOKING_OWNER_EMAIL?.trim();
  if (email) {
    const u = await prisma.empresaUser.findUnique({ where: { email } });
    if (u) return u.id;
  }

  const first = await prisma.empresaUser.findFirst({ orderBy: { createdAt: "asc" } });
  if (!first) throw new Error("No hay usuario empresa configurado para citas.");
  return first.id;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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

  for (let day = startOfDay(opts.from); day <= opts.to; day = addDays(day, 1)) {
    const weekday = day.getDay();
    const rules = availability.filter((a) => a.weekday === weekday);
    for (const rule of rules) {
      let cursor = parseTime(rule.startTime);
      const endLimit = parseTime(rule.endTime);
      while (cursor + duration <= endLimit) {
        const startTime = new Date(day);
        startTime.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

        if (startTime >= minStart) {
          const bufferedStart = new Date(startTime.getTime() - buffer * 60 * 1000);
          const bufferedEnd = new Date(endTime.getTime() + buffer * 60 * 1000);

          const bookingConflict = existingBookings.some(
            (b) => b.startTime < bufferedEnd && b.endTime > bufferedStart
          );
          const taskConflict = busyTasks.some((t) => {
            if (!t.dueDate) return false;
            const tEnd = t.endDate ?? new Date(t.dueDate.getTime() + 60 * 60 * 1000);
            return t.dueDate < bufferedEnd && tEnd > bufferedStart;
          });

          if (!bookingConflict && !taskConflict) {
            slots.push({
              start: formatTime(cursor),
              end: formatTime(cursor + duration),
              startTime,
              endTime,
            });
          }
        }
        cursor += duration + buffer;
      }
    }
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
