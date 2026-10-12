/**
 * Todo pago queda con su factura (pedido del 2026-10-12): la factura se emite (no queda en borrador) y queda
 * en la cuenta del cliente para descargar. No se le envía nada: los envíos a clientes siguen apagados.
 *   - Pago de una fase: se abona a la factura de la fase; si no tiene, se emite la de la fase por su precio.
 *   - Pago de un proyecto: se abona a una factura abierta del proyecto que alcance; si no hay, se emite una
 *     por el monto del pago, dentro del proyecto, ya pagada.
 *   - Pago suelto: una factura por el monto, ya pagada, con la fecha del pago como fecha de emisión.
 * Deshacer un pago borra la factura si se creó por un pago y ya no le queda ninguno.
 */
import { prisma } from "@/lib/prisma";
import { crearCobro, type Equipo } from "./cobros";
import { pagadoEfectivo } from "@/lib/portal/saldo";

const r2 = (n: number) => Math.round(n * 100) / 100;
const ABIERTAS = ["SENT", "ACCEPTED", "PARTIALLY_PAID"] as const;

export type DestinoPago = { clientId: string; projectId?: string | null; phaseId?: string | null; monto: number; fecha: string; conItbms?: boolean };

/** La factura a la que va un pago, creándola si hace falta. creada = true si nació por este pago. */
export async function facturaParaPago(u: Equipo, d: DestinoPago): Promise<{ id: string; number: string | null; creada: boolean }> {
  const emitida = { fecha: d.fecha, origenPago: true };
  if (d.phaseId) {
    const f = await prisma.projectPhase.findFirst({ where: { id: d.phaseId, project: { userId: u.id } }, select: { id: true, invoiceId: true, invoice: { select: { id: true, number: true, status: true } } } });
    if (!f) throw new Error("No encontré esa fase.");
    if (f.invoice && f.invoice.status !== "CANCELLED") {
      // La factura de la fase en borrador se emite: el pago ya llegó.
      if (f.invoice.status === "DRAFT") await prisma.document.update({ where: { id: f.invoice.id }, data: { status: "SENT" } });
      return { id: f.invoice.id, number: f.invoice.number, creada: false };
    }
    if (f.invoiceId) await prisma.projectPhase.update({ where: { id: f.id }, data: { invoiceId: null } });
    const n = await crearCobro(u, { tipo: "fase", faseId: f.id, sinImpuesto: !d.conItbms, emitida });
    return { ...n, creada: true };
  }
  if (d.projectId) {
    const p = await prisma.project.findFirst({ where: { id: d.projectId, userId: u.id }, select: { id: true, name: true } });
    if (!p) throw new Error("No encontré ese proyecto.");
    const [abiertas, pagos] = await Promise.all([
      prisma.document.findMany({ where: { userId: u.id, projectId: p.id, clientId: d.clientId, type: "FACTURA", status: { in: [...ABIERTAS] } }, orderBy: { issueDate: "asc" }, select: { id: true, number: true, status: true, total: true, amountPaid: true } }),
      prisma.payment.findMany({ where: { userId: u.id, document: { projectId: p.id } }, select: { documentId: true, amount: true, status: true } }),
    ]);
    const alcanza = abiertas.find((f) => Number(f.total ?? 0) - pagadoEfectivo(f, pagos) >= d.monto - 0.005);
    if (alcanza) return { id: alcanza.id, number: alcanza.number, creada: false };
    const n = await crearCobro(u, { tipo: "monto", clientId: d.clientId, projectId: p.id, concepto: `Abono a ${p.name}`, monto: d.monto, sinImpuesto: !d.conItbms, emitida });
    return { ...n, creada: true };
  }
  const n = await crearCobro(u, { tipo: "monto", clientId: d.clientId, projectId: null, concepto: "Pago recibido", monto: d.monto, sinImpuesto: !d.conItbms, emitida });
  return { ...n, creada: true };
}

/** ¿La factura nació por un pago? (content.origenPago) */
export function nacioPorPago(content: unknown): boolean {
  return !!(content && typeof content === "object" && (content as Record<string, unknown>).origenPago === true);
}

/**
 * Borra un pago y recalcula su factura. Si la factura nació por un pago y ya no le queda ninguno, se borra
 * también (y la fase vuelve a quedar sin factura). Devuelve si borró la factura.
 */
export async function borrarPago(userId: string, paymentId: string): Promise<{ facturaBorrada: boolean; documentId: string | null }> {
  const pg = await prisma.payment.findFirst({ where: { id: paymentId, userId }, select: { id: true, documentId: true } });
  if (!pg) return { facturaBorrada: false, documentId: null };
  await prisma.payment.delete({ where: { id: pg.id } });
  if (!pg.documentId) return { facturaBorrada: false, documentId: null };
  const borrada = await borrarFacturaSiQuedoVacia(userId, pg.documentId);
  if (!borrada) {
    const { recalcularFactura } = await import("@/lib/portal/empresa");
    await recalcularFactura(pg.documentId);
  }
  return { facturaBorrada: borrada, documentId: pg.documentId };
}

export async function borrarFacturaSiQuedoVacia(userId: string, documentId: string): Promise<boolean> {
  const [doc, quedan] = await Promise.all([
    prisma.document.findFirst({ where: { id: documentId, userId }, select: { id: true, content: true } }),
    prisma.payment.count({ where: { documentId } }),
  ]);
  if (!doc || quedan > 0 || !nacioPorPago(doc.content)) return false;
  await borrarFactura(userId, doc.id);
  return true;
}

/** Borra una factura y suelta lo que apuntaba a ella (fase, horas, tareas). */
export async function borrarFactura(userId: string, documentId: string) {
  await prisma.$transaction([
    prisma.projectPhase.updateMany({ where: { invoiceId: documentId }, data: { invoiceId: null } }),
    prisma.timeEntry.updateMany({ where: { invoiceId: documentId }, data: { invoiceId: null } }),
    prisma.task.updateMany({ where: { documentId }, data: { documentId: null } }),
    prisma.payment.updateMany({ where: { documentId }, data: { documentId: null } }),
    prisma.document.updateMany({ where: { linkedDocumentId: documentId }, data: { linkedDocumentId: null } }),
    prisma.document.deleteMany({ where: { id: documentId, userId } }),
  ]);
}

/**
 * Factura pagos ya registrados que no tienen factura (pagos viejos o confirmados sin factura). Agrupa por
 * fase o proyecto cuando el pago lo dice; los sueltos llevan una factura cada uno, con la fecha del pago.
 * Devuelve las facturas que creó.
 */
export async function facturarPagosSinFactura(u: Equipo, paymentIds: string[]): Promise<{ pagoId: string; facturaId: string; creada: boolean }[]> {
  const pagos = await prisma.payment.findMany({ where: { id: { in: paymentIds }, userId: u.id, documentId: null, status: "confirmado" }, orderBy: { paidAt: "asc" }, select: { id: true, clientId: true, projectId: true, phaseId: true, amount: true, paidAt: true } });
  const { recalcularFactura } = await import("@/lib/portal/empresa");
  const hechos: { pagoId: string; facturaId: string; creada: boolean }[] = [];
  for (const p of pagos) {
    if (!p.clientId) continue;
    const f = await facturaParaPago(u, { clientId: p.clientId, projectId: p.projectId, phaseId: p.phaseId, monto: r2(Number(p.amount)), fecha: p.paidAt.toISOString().slice(0, 10) });
    await prisma.payment.update({ where: { id: p.id }, data: { documentId: f.id } });
    await recalcularFactura(f.id);
    hechos.push({ pagoId: p.id, facturaId: f.id, creada: f.creada });
  }
  return hechos;
}

