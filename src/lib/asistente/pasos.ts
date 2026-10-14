/**
 * Deshacer, en un solo lugar. Cada acción del asistente anota lo que hizo como una lista de pasos:
 *   crear  → se deshace borrando lo creado
 *   editar → se deshace devolviendo los valores anteriores
 *   borrar → se deshace volviendo a crear la fila tal como estaba (mismo id)
 *   pago   → un pago creado: se borra con su factura si nació por él (motor/pagos.ts)
 * Los pasos se deshacen en orden inverso. Las filas se guardan como JSON (fechas en ISO, decimales en texto).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { borrarPago, borrarFactura } from "@/lib/motor/pagos";

export type Modelo =
  | "client" | "project" | "projectPhase" | "payment" | "document" | "task" | "ticket" | "ticketMessage" | "expense"
  | "meeting" | "platform" | "activityEvent" | "booking" | "paymentSchedule" | "contract" | "projectClient"
  | "deliverable";

export type Paso =
  | { t: "crear"; m: Modelo; id: string }
  | { t: "editar"; m: Modelo; id: string; antes: Record<string, unknown> }
  | { t: "borrar"; m: Modelo; fila: Record<string, unknown> }
  | { t: "pago"; id: string }
  | { t: "unir"; projectId: string; clientId: string }
  | { t: "recalc"; id: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabla = (m: Modelo) => (prisma as any)[m] as { findUnique: (a: unknown) => Promise<Record<string, unknown> | null>; create: (a: unknown) => Promise<unknown>; update: (a: unknown) => Promise<unknown>; deleteMany: (a: unknown) => Promise<{ count: number }> };

/** Fila lista para guardar en JSON y volver a crear: sin nulos (son el valor por defecto) y sin JSON vacío. */
export function filaParaGuardar(fila: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fila)) {
    if (v === null || v === undefined) continue;
    out[k] = v instanceof Prisma.Decimal ? v.toString() : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

/** Valores anteriores de unos campos, para editar → deshacer. */
export function antesDe(fila: Record<string, unknown>, campos: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of campos) {
    const v = fila[k];
    out[k] = v instanceof Prisma.Decimal ? v.toString() : v instanceof Date ? v.toISOString() : v ?? null;
  }
  return out;
}

export async function filaDe(m: Modelo, id: string) {
  const f = await tabla(m).findUnique({ where: { id } });
  return f ? filaParaGuardar(f) : null;
}

const MENSAJE_FK = "Ya tiene cosas ligadas (pagos, facturas u otros registros); deshazlas primero o cámbialo a mano.";

async function deshacerPaso(userId: string, p: Paso) {
  if (p.t === "pago") { await borrarPago(userId, p.id); return; }
  if (p.t === "recalc") { const { recalcularFactura } = await import("@/lib/portal/empresa"); await recalcularFactura(p.id); return; }
  if (p.t === "unir") { await prisma.projectClient.deleteMany({ where: { projectId: p.projectId, clientId: p.clientId } }); return; }
  if (p.t === "editar") {
    // Los JSON nulos se devuelven como nulo de base de datos.
    const data = Object.fromEntries(Object.entries(p.antes).map(([k, v]) => [k, v === null && (k === "financingPlan" || k === "githubCheck") ? Prisma.DbNull : v]));
    await tabla(p.m).update({ where: { id: p.id }, data });
    return;
  }
  if (p.t === "borrar") { await tabla(p.m).create({ data: p.fila }); return; }
  // crear → borrar lo creado
  if (p.m === "document") {
    const pagos = await prisma.payment.count({ where: { documentId: p.id } });
    if (pagos) throw new Error("La factura ya tiene pagos; deshaz primero los pagos.");
    await borrarFactura(userId, p.id);
    return;
  }
  if (p.m === "payment") { await borrarPago(userId, p.id); return; }
  // Los eventos de la línea de tiempo de un proyecto nuevo se van con él.
  if (p.m === "project") await prisma.activityEvent.deleteMany({ where: { projectId: p.id, userId } });
  try {
    await tabla(p.m).deleteMany({ where: { id: p.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2014")) throw new Error(MENSAJE_FK);
    throw e;
  }
}

/**
 * Borra una factura anotando cómo volverla a crear: sus cuotas, las fases que apuntaban a ella y la fila.
 * Devuelve los pasos en el orden en que se deshacen bien (al revés: factura, fases, cuotas).
 */
export async function borrarFacturaConPasos(userId: string, documentId: string): Promise<Paso[]> {
  const [doc, cuotas, fases] = await Promise.all([
    prisma.document.findFirst({ where: { id: documentId, userId } }),
    prisma.paymentSchedule.findMany({ where: { documentId } }),
    prisma.projectPhase.findMany({ where: { invoiceId: documentId }, select: { id: true } }),
  ]);
  if (!doc) return [];
  await borrarFactura(userId, documentId);
  return [
    ...cuotas.map((c) => ({ t: "borrar" as const, m: "paymentSchedule" as const, fila: filaParaGuardar(c as unknown as Record<string, unknown>) })),
    ...fases.map((f) => ({ t: "editar" as const, m: "projectPhase" as const, id: f.id, antes: { invoiceId: documentId } })),
    { t: "borrar", m: "document", fila: filaParaGuardar(doc as unknown as Record<string, unknown>) },
  ];
}

/** Deshace los pasos en orden inverso. Si uno falla, para y avisa cuál. */
export async function deshacerPasos(userId: string, pasos: Paso[]) {
  for (const p of [...pasos].reverse()) await deshacerPaso(userId, p);
}
