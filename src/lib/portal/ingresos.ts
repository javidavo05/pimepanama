/**
 * Cuánto dinero nos ha traído un cliente en el tiempo. Cuenta lo que entró de verdad:
 *   - cada pago confirmado, en su fecha;
 *   - lo pagado de facturas viejas que no tienen filas de pago (se marcaron pagadas antes del registro de
 *     pagos): ese monto va en la fecha de la factura, que es la mejor fecha que hay.
 * Puro: recibe facturas y pagos ya leídos.
 */
import { pagadoEfectivo } from "./saldo";

type Factura = { id: string; status: string; total: unknown; amountPaid?: unknown; issueDate: Date; projectId?: string | null };
type Pago = { documentId?: string | null; projectId?: string | null; amount: unknown; status: string; paidAt: Date };

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (x: number) => Math.round(x * 100) / 100;

export type Entrada = { fecha: Date; monto: number; projectId: string | null };

export function entradasDelCliente(facturas: Factura[], pagos: Pago[]): Entrada[] {
  const proyectoDe = new Map(facturas.map((f) => [f.id, f.projectId ?? null]));
  const confirmados = pagos.filter((p) => p.status === "confirmado");
  // paidAt es una fecha sin hora (medianoche UTC): al mediodía no cambia de día en la hora de Panamá.
  const out: Entrada[] = confirmados.map((p) => ({ fecha: new Date(`${p.paidAt.toISOString().slice(0, 10)}T12:00:00Z`), monto: n(p.amount), projectId: p.projectId ?? (p.documentId ? proyectoDe.get(p.documentId) ?? null : null) }));
  for (const f of facturas) {
    if (f.status === "DRAFT" || f.status === "CANCELLED") continue;
    const enFilas = confirmados.filter((p) => p.documentId === f.id).reduce((a, p) => a + n(p.amount), 0);
    const viejo = r2(pagadoEfectivo(f, confirmados) - enFilas);
    if (viejo > 0.005) out.push({ fecha: f.issueDate, monto: viejo, projectId: f.projectId ?? null });
  }
  return out.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/** Año de una fecha en Panamá (UTC−5). */
const anio = (d: Date) => new Date(d.getTime() - 5 * 3600_000).getUTCFullYear();

export function ingresosDelCliente(facturas: Factura[], pagos: Pago[]) {
  const entradas = entradasDelCliente(facturas, pagos);
  const total = r2(entradas.reduce((a, e) => a + e.monto, 0));
  const porAnio = new Map<number, number>();
  const porProyecto = new Map<string, number>();
  for (const e of entradas) {
    porAnio.set(anio(e.fecha), r2((porAnio.get(anio(e.fecha)) ?? 0) + e.monto));
    if (e.projectId) porProyecto.set(e.projectId, r2((porProyecto.get(e.projectId) ?? 0) + e.monto));
  }
  return {
    total,
    entradas: entradas.length,
    desde: entradas[0]?.fecha ?? null,
    ultima: entradas[entradas.length - 1]?.fecha ?? null,
    porAnio: [...porAnio.entries()].sort((a, b) => a[0] - b[0]).map(([a, monto]) => ({ anio: a, monto })),
    porProyecto,
  };
}
