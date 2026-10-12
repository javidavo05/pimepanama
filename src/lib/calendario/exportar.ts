/**
 * Pime en Google Calendar (migración 0046): una dirección .ics a la que Google se suscribe.
 * Lleva las citas, las tareas pendientes con fecha, los vencimientos de facturas y cuotas por cobrar
 * y los gastos por pagar. Es al revés que ics.ts, que lee la agenda de Google para «Tu día».
 */
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { pagadoEfectivo } from "@/lib/portal/saldo";
import { getSiteUrl } from "@/lib/site-url";

const DIA = 86_400_000;
/** Lo que mira Google: un mes hacia atrás y seis hacia adelante. */
const ATRAS_DIAS = 31;
const ADELANTE_DIAS = 183;

export type EventoExportado = {
  uid: string;
  titulo: string;
  inicio: Date;
  /** Sin fin en los de todo el día (duran ese día). */
  fin: Date | null;
  todoElDia: boolean;
  descripcion?: string | null;
  lugar?: string | null;
  enlace?: string | null;
};

export function nuevoToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Dirección .ics para suscribirse; webcal:// la abren directo Google y el Calendario de Apple. */
export function direccionesDelFeed(token: string) {
  const https = `${getSiteUrl()}/api/calendario/${token}.ics`;
  const webcal = https.replace(/^https?:\/\//, "webcal://");
  return { https, webcal, google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}` };
}

// ── Formato iCalendar (RFC 5545) ────────────────────────────────────────────

function texto(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Corta las líneas a 75 octetos sin partir caracteres (los acentos ocupan 2). */
function plegar(linea: string): string {
  const out: string[] = [];
  let actual = "";
  let bytes = 0;
  for (const ch of linea) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(actual);
      actual = "";
      bytes = 0;
    }
    actual += ch;
    bytes += b;
  }
  out.push(actual);
  return out.join("\r\n ");
}

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Fecha en Panamá (UTC−5, sin horario de verano) como AAAAMMDD. */
function fechaPanama(d: Date): string {
  const p = new Date(d.getTime() - 5 * 3600_000);
  return `${p.getUTCFullYear()}${String(p.getUTCMonth() + 1).padStart(2, "0")}${String(p.getUTCDate()).padStart(2, "0")}`;
}

export function armarIcs(eventos: EventoExportado[], ahora = new Date()): string {
  const l = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pime Panama//Pime Suite//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Pime Suite",
    "X-WR-TIMEZONE:America/Panama",
    "X-WR-CALDESC:Citas\\, tareas y vencimientos de Pime Suite",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of eventos) {
    l.push("BEGIN:VEVENT", `UID:${e.uid}@pimepanama.com`, `DTSTAMP:${utc(ahora)}`);
    if (e.todoElDia) {
      const d = fechaPanama(e.inicio);
      const sig = fechaPanama(new Date(e.inicio.getTime() + DIA));
      l.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${sig}`, "TRANSP:TRANSPARENT");
    } else {
      l.push(`DTSTART:${utc(e.inicio)}`, `DTEND:${utc(e.fin ?? new Date(e.inicio.getTime() + 30 * 60_000))}`);
    }
    l.push(`SUMMARY:${texto(e.titulo)}`);
    if (e.descripcion) l.push(`DESCRIPTION:${texto(e.descripcion)}`);
    if (e.lugar) l.push(`LOCATION:${texto(e.lugar)}`);
    if (e.enlace) l.push(`URL:${e.enlace}`);
    l.push("END:VEVENT");
  }
  l.push("END:VCALENDAR");
  return l.map(plegar).join("\r\n") + "\r\n";
}

// ── Datos ───────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `USD ${n.toFixed(2)}`;

export async function eventosParaGoogle(userId: string, ahora = new Date()): Promise<EventoExportado[]> {
  const desde = new Date(ahora.getTime() - ATRAS_DIAS * DIA);
  const hasta = new Date(ahora.getTime() + ADELANTE_DIAS * DIA);
  const site = getSiteUrl();
  const nombre = (c: { name: string; company: string | null } | null | undefined, alterno?: string | null) => c?.company || c?.name || alterno || "Sin cliente";

  const [citas, tareas, facturas, pagos, gastos] = await Promise.all([
    prisma.booking.findMany({
      where: { userId, status: { not: "CANCELLED" }, startTime: { gte: desde, lt: hasta } },
      select: { id: true, startTime: true, endTime: true, attendeeName: true, attendeeEmail: true, attendeePhone: true, notes: true, meetingUrl: true, eventType: { select: { title: true } } },
    }),
    prisma.task.findMany({
      where: { userId, completed: false, dueDate: { gte: desde, lt: hasta } },
      select: { id: true, title: true, description: true, dueDate: true, endDate: true, allDay: true, projectId: true, project: { select: { name: true } } },
    }),
    prisma.document.findMany({
      where: { userId, type: "FACTURA", status: { notIn: ["DRAFT", "CANCELLED", "PAID"] } },
      select: { id: true, number: true, total: true, amountPaid: true, status: true, dueDate: true, clientName: true, client: { select: { name: true, company: true } }, paymentSchedules: { where: { status: { in: ["PENDING", "OVERDUE"] } }, select: { id: true, description: true, amount: true, dueDate: true } } },
    }),
    prisma.payment.findMany({ where: { userId, status: "confirmado", documentId: { not: null } }, select: { documentId: true, amount: true, status: true } }),
    prisma.expense.findMany({
      where: { userId, status: "PENDING", dueDate: { gte: desde, lt: hasta } },
      select: { id: true, title: true, amount: true, currency: true, dueDate: true, vendor: true },
    }),
  ]);

  const out: EventoExportado[] = [];

  for (const c of citas) {
    out.push({
      uid: `cita-${c.id}`,
      titulo: `${c.eventType?.title ?? "Cita"} · ${c.attendeeName}`,
      inicio: c.startTime,
      fin: c.endTime,
      todoElDia: false,
      descripcion: [c.attendeeEmail, c.attendeePhone, c.notes].filter(Boolean).join("\n") || null,
      lugar: c.meetingUrl,
      enlace: `${site}/empresa/citas`,
    });
  }

  for (const t of tareas) {
    if (!t.dueDate) continue;
    out.push({
      uid: `tarea-${t.id}`,
      titulo: t.project?.name ? `${t.title} · ${t.project.name}` : t.title,
      inicio: t.dueDate,
      fin: t.allDay ? null : t.endDate && t.endDate > t.dueDate ? t.endDate : null,
      todoElDia: t.allDay,
      descripcion: t.description,
      enlace: t.projectId ? `${site}/empresa/proyectos/${t.projectId}?tab=tareas` : `${site}/empresa/tareas`,
    });
  }

  // Por cobrar: lo que falta de cada factura emitida; con plan de pagos, cada cuota en su fecha.
  for (const f of facturas) {
    const falta = Math.max(0, r2(Number(f.total ?? 0) - pagadoEfectivo(f, pagos)));
    if (falta <= 0.005) continue;
    const cliente = nombre(f.client, f.clientName);
    const enlace = `${site}/empresa/facturas/${f.id}`;
    if (f.paymentSchedules.length) {
      for (const s of f.paymentSchedules) {
        if (s.dueDate < desde || s.dueDate >= hasta) continue;
        out.push({ uid: `cuota-${s.id}`, titulo: `Cobrar ${s.description} · ${cliente}`, inicio: s.dueDate, fin: null, todoElDia: true, descripcion: `${usd(Number(s.amount))} · ${f.number ?? "Factura"}`, enlace });
      }
    } else if (f.dueDate && f.dueDate >= desde && f.dueDate < hasta) {
      out.push({ uid: `factura-${f.id}`, titulo: `Cobrar ${f.number ?? "factura"} · ${cliente}`, inicio: f.dueDate, fin: null, todoElDia: true, descripcion: `Falta ${usd(falta)}`, enlace });
    }
  }

  for (const g of gastos) {
    if (!g.dueDate) continue;
    out.push({
      uid: `gasto-${g.id}`,
      titulo: `Pagar ${g.title}`,
      inicio: g.dueDate,
      fin: null,
      todoElDia: true,
      descripcion: [`${g.currency} ${Number(g.amount).toFixed(2)}`, g.vendor].filter(Boolean).join(" · "),
      enlace: `${site}/empresa/por-pagar`,
    });
  }

  return out.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
