/**
 * Factura de horas del mes (decisión del plan: «una factura al mes con todas las horas»).
 * Corre en la tarea diaria de cobros. Los días 1 a 3 de cada mes (hora de Panamá) arma un BORRADOR por
 * cliente con las horas sin facturar hasta el último día del mes anterior y avisa al equipo.
 * No se envía nada al cliente: el equipo revisa y envía. Es idempotente: las horas facturadas quedan
 * ligadas a su factura y no se vuelven a tomar.
 */
import { prisma } from "@/lib/prisma";
import { facturarHoras } from "./empresa";
import { avisarAlEquipo } from "./avisos";
import { dinero } from "./datos";

const DIAS_DE_CIERRE = 3;

/** Fecha de hoy en Panamá (UTC−5, sin horario de verano). */
export function hoyEnPanama(ahora = new Date()) {
  const p = new Date(ahora.getTime() - 5 * 3600_000);
  return { anio: p.getUTCFullYear(), mes: p.getUTCMonth(), dia: p.getUTCDate() };
}

/** Si hoy toca cerrar el mes y hasta qué día (último del mes anterior, como fecha @db.Date). */
export function cierreDeMes(ahora = new Date()): Date | null {
  const h = hoyEnPanama(ahora);
  if (h.dia > DIAS_DE_CIERRE) return null;
  return new Date(Date.UTC(h.anio, h.mes, 0));
}

export async function facturacionMensual(ahora = new Date()) {
  const hasta = cierreDeMes(ahora);
  if (!hasta) return { corrio: false, facturas: 0 };
  const pendientes = await prisma.timeEntry.groupBy({
    by: ["userId", "clientId"],
    where: { invoiceId: null, billable: true, amount: { gt: 0 }, workDate: { lte: hasta } },
  });
  const porEquipo = new Map<string, { numero: string | null; total: number }[]>();
  for (const g of pendientes) {
    const u = await prisma.empresaUser.findUnique({ where: { id: g.userId }, select: { id: true, fullName: true, configId: true, config: { select: { invoicePrefix: true, quotePrefix: true, taxRatePercent: true, paymentTermsDays: true } } } });
    if (!u) continue;
    try {
      const doc = await facturarHoras(u, g.clientId, hasta);
      const lista = porEquipo.get(u.id) ?? [];
      lista.push({ numero: doc.number, total: Number(doc.total ?? 0) });
      porEquipo.set(u.id, lista);
    } catch (e) {
      console.error("[factura-mensual]", g.clientId, e);
    }
  }
  for (const [userId, docs] of porEquipo) {
    const total = docs.reduce((a, d) => a + d.total, 0);
    await avisarAlEquipo(userId, `${docs.length} ${docs.length === 1 ? "factura de horas lista" : "facturas de horas listas"} para revisar`, `Borradores del mes por ${dinero(total)}: ${docs.map((d) => d.numero).join(", ")}. Revísalos y envíalos.`, "/empresa/dinero");
  }
  return { corrio: true, facturas: [...porEquipo.values()].reduce((a, d) => a + d.length, 0) };
}
