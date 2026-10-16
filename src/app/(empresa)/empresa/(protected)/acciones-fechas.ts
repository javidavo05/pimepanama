"use server";

/**
 * Fechas de pago de un cliente (pedido de Javier, 2026-10-16: «como dueño debo poder mover o modificar sus fechas
 * de pago»). Se mueve el vencimiento de una factura o de una cuota, o se programa el cobro de lo que falta emitir.
 * Lo que ve el cliente en su cuenta y sus recordatorios salen de estas mismas fechas.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { registrarEvento } from "@/lib/portal/eventos";

export type EstadoFecha = { ok?: boolean; error?: string; mensaje?: string } | null;

const txt = (v: FormDataEntryValue | null, max = 80) => String(v ?? "").trim().slice(0, max);
/** «2026-11-01» → mediodía UTC de ese día, como el resto de las fechas de cobro (no se corre de día por la zona horaria). */
function fechaDe(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
const legible = (d: Date) => d.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function refrescar(clientId: string) {
  revalidatePath(`/empresa/clientes/${clientId}`);
  revalidatePath("/cliente/facturas");
  revalidatePath("/cliente");
}

export async function moverVencimientoAction(_: EstadoFecha, form: FormData): Promise<EstadoFecha> {
  const u = await getEmpresaUser();
  const fecha = fechaDe(txt(form.get("fecha"), 10));
  if (!fecha) return { error: "Elige una fecha válida." };
  const f = await prisma.document.findFirst({ where: { id: txt(form.get("documentId")), userId: u.id, type: "FACTURA" }, select: { id: true, number: true, clientId: true, dueDate: true } });
  if (!f?.clientId) return { error: "No encontré esa factura." };
  await prisma.document.update({ where: { id: f.id }, data: { dueDate: fecha } });
  await registrarEvento({ userId: u.id, clientId: f.clientId, entityType: "factura", entityId: f.id, kind: "vencimiento_movido", title: `${f.number ?? "Factura"}: vence el ${legible(fecha)}`, detail: f.dueDate ? `Antes: ${legible(f.dueDate)}` : null, visibility: "interno", actorEmpresaUserId: u.id });
  refrescar(f.clientId);
  return { ok: true, mensaje: `Ahora vence el ${legible(fecha)}.` };
}

export async function moverCuotaAction(_: EstadoFecha, form: FormData): Promise<EstadoFecha> {
  const u = await getEmpresaUser();
  const fecha = fechaDe(txt(form.get("fecha"), 10));
  if (!fecha) return { error: "Elige una fecha válida." };
  const c = await prisma.paymentSchedule.findFirst({ where: { id: txt(form.get("cuotaId")), userId: u.id }, select: { id: true, description: true, status: true, dueDate: true, document: { select: { id: true, number: true, clientId: true } } } });
  if (!c?.document.clientId) return { error: "No encontré esa cuota." };
  if (c.status === "PAID" || c.status === "CANCELLED") return { error: "Esa cuota ya está pagada o anulada." };
  // Una cuota vencida que se corre al futuro vuelve a estar pendiente y a recibir su recordatorio.
  const futura = fecha.getTime() > Date.now();
  await prisma.paymentSchedule.update({ where: { id: c.id }, data: { dueDate: fecha, reminderSent: false, ...(futura ? { status: "PENDING" } : {}) } });
  await registrarEvento({ userId: u.id, clientId: c.document.clientId, entityType: "factura", entityId: c.document.id, kind: "cuota_movida", title: `${c.document.number ?? "Factura"} · ${c.description}: ${legible(fecha)}`, detail: `Antes: ${legible(c.dueDate)}`, visibility: "interno", actorEmpresaUserId: u.id });
  refrescar(c.document.clientId);
  return { ok: true, mensaje: `${c.description} se cobra el ${legible(fecha)}.` };
}

/** Programa el cobro de lo que falta emitir de una factura (por ejemplo, el 50 % final de un contrato). */
export async function programarCobroAction(_: EstadoFecha, form: FormData): Promise<EstadoFecha> {
  const u = await getEmpresaUser();
  const fecha = fechaDe(txt(form.get("fecha"), 10));
  const monto = Number(txt(form.get("monto"), 20).replace(/,/g, ""));
  if (!fecha) return { error: "Elige la fecha del cobro." };
  if (!Number.isFinite(monto) || monto <= 0) return { error: "Escribe el monto del cobro." };
  const f = await prisma.document.findFirst({
    where: { id: txt(form.get("documentId")), userId: u.id, type: "FACTURA" },
    select: { id: true, number: true, clientId: true, total: true, amountPaid: true, paymentSchedules: { where: { status: { in: ["PENDING", "OVERDUE"] } }, select: { amount: true } } },
  });
  if (!f?.clientId) return { error: "No encontré esa factura." };
  const programado = f.paymentSchedules.reduce((a, s) => a + Number(s.amount), 0);
  const libre = Number(f.total ?? 0) - Number(f.amountPaid ?? 0) - programado;
  if (monto > libre + 0.005) return { error: `No puede pasar de lo que falta programar: ${libre.toFixed(2)}.` };
  const n = f.paymentSchedules.length + 1;
  await prisma.paymentSchedule.create({ data: { userId: u.id, documentId: f.id, description: `Cobro ${n}`, amount: monto, dueDate: fecha, status: "PENDING" } });
  await registrarEvento({ userId: u.id, clientId: f.clientId, entityType: "factura", entityId: f.id, kind: "cobro_programado", title: `${f.number ?? "Factura"}: cobro de ${monto.toFixed(2)} el ${legible(fecha)}`, visibility: "interno", actorEmpresaUserId: u.id });
  refrescar(f.clientId);
  return { ok: true, mensaje: `Cobro programado para el ${legible(fecha)}. El cliente lo ve en su cuenta como próxima cuota.` };
}

/** Corre todas las cuotas pendientes de una factura N meses (negativo, las adelanta). Conserva el día de cada una. */
export async function correrCuotasAction(_: EstadoFecha, form: FormData): Promise<EstadoFecha> {
  const u = await getEmpresaUser();
  const meses = Math.trunc(Number(txt(form.get("meses"), 4)));
  if (!Number.isFinite(meses) || meses === 0 || Math.abs(meses) > 12) return { error: "Escribe cuántos meses, entre -12 y 12." };
  const f = await prisma.document.findFirst({
    where: { id: txt(form.get("documentId")), userId: u.id, type: "FACTURA" },
    select: { id: true, number: true, clientId: true, paymentSchedules: { where: { status: { in: ["PENDING", "OVERDUE"] } }, select: { id: true, dueDate: true } } },
  });
  if (!f?.clientId) return { error: "No encontré esa factura." };
  if (!f.paymentSchedules.length) return { error: "Esa factura no tiene cuotas pendientes." };
  const ahora = Date.now();
  await prisma.$transaction(f.paymentSchedules.map((c) => {
    // Mismo día en el mes destino; si ese mes es más corto (31 → febrero), el último día del mes.
    const o = new Date(c.dueDate);
    const y = o.getUTCFullYear(), m = o.getUTCMonth() + meses;
    const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const d = new Date(Date.UTC(y, m, Math.min(o.getUTCDate(), ultimo), 12));
    return prisma.paymentSchedule.update({ where: { id: c.id }, data: { dueDate: d, reminderSent: false, status: d.getTime() > ahora ? "PENDING" : "OVERDUE" } });
  }));
  const texto = `${Math.abs(meses)} ${Math.abs(meses) === 1 ? "mes" : "meses"}`;
  await registrarEvento({ userId: u.id, clientId: f.clientId, entityType: "factura", entityId: f.id, kind: "cuotas_corridas", title: `${f.number ?? "Factura"}: ${f.paymentSchedules.length} cuotas ${meses > 0 ? "corridas" : "adelantadas"} ${texto}`, visibility: "interno", actorEmpresaUserId: u.id });
  refrescar(f.clientId);
  return { ok: true, mensaje: `Listo: ${f.paymentSchedules.length} cuotas ${meses > 0 ? "corridas" : "adelantadas"} ${texto}.` };
}
