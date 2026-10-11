/**
 * Saldo de un cliente con Pime: lo facturado (facturas no canceladas ni en borrador) menos lo pagado
 * (pagos confirmados). Los pagos «por confirmar» se muestran aparte y todavía no bajan la deuda.
 */
type Factura = { id: string; status: string; total: unknown; amountPaid?: unknown };
type Pago = { documentId?: string | null; amount: unknown; status: string };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r2 = (x: number) => Math.round(x * 100) / 100;

export const FACTURA_CUENTA = (status: string) => status !== "CANCELLED" && status !== "DRAFT" && status !== "REJECTED";

/**
 * Lo pagado de cada factura es el mayor entre la suma de sus pagos confirmados y Document.amountPaid:
 * los pagos registrados antes del portal solo viven en amountPaid. Los pagos confirmados sin factura
 * (anticipos) se suman aparte.
 */
export function saldoCliente(facturas: Factura[], pagos: Pago[]) {
  const vivas = facturas.filter((f) => FACTURA_CUENTA(f.status));
  const facturado = r2(vivas.reduce((a, f) => a + n(f.total), 0));
  const ids = new Set(facturas.map((f) => f.id));
  const porFactura = vivas.reduce((a, f) => a + pagadoEfectivo(f, pagos), 0);
  const sueltos = pagos.filter((p) => p.status === "confirmado" && (!p.documentId || !ids.has(p.documentId))).reduce((a, p) => a + n(p.amount), 0);
  const pagado = r2(porFactura + sueltos);
  const porConfirmar = r2(pagos.filter((p) => p.status === "por_confirmar").reduce((a, p) => a + n(p.amount), 0));
  return { facturado, pagado, porConfirmar, pendiente: r2(Math.max(0, facturado - pagado)) };
}

/**
 * Lo pagado de verdad de una factura: si está marcada PAID es su total (las facturas viejas marcadas
 * a mano no guardaban amountPaid); si no, el mayor entre sus pagos confirmados y amountPaid.
 */
export function pagadoEfectivo(f: Factura, pagos: Pago[]): number {
  if (f.status === "PAID") return n(f.total);
  return Math.max(pagadoDeFactura(f.id, pagos), n(f.amountPaid));
}

/** Lo pagado de una factura (suma de pagos confirmados): es lo que se guarda en Document.amountPaid. */
export function pagadoDeFactura(documentId: string, pagos: Pago[]): number {
  return r2(pagos.filter((p) => p.documentId === documentId && p.status === "confirmado").reduce((a, p) => a + n(p.amount), 0));
}

/** Estado de la factura según lo pagado. */
export function estadoPorPago(total: unknown, pagado: number): "PAID" | "PARTIALLY_PAID" | null {
  const t = n(total);
  if (t <= 0) return null;
  if (pagado >= t - 0.005) return "PAID";
  if (pagado > 0) return "PARTIALLY_PAID";
  return null;
}
