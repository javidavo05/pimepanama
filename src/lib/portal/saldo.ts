/**
 * Saldo de un cliente con Pime: lo facturado (facturas no canceladas ni en borrador) menos lo pagado
 * (pagos confirmados). Los pagos «por confirmar» se muestran aparte y todavía no bajan la deuda.
 */
type Factura = { id: string; status: string; total: unknown };
type Pago = { documentId?: string | null; amount: unknown; status: string };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r2 = (x: number) => Math.round(x * 100) / 100;

export const FACTURA_CUENTA = (status: string) => status !== "CANCELLED" && status !== "DRAFT" && status !== "REJECTED";

export function saldoCliente(facturas: Factura[], pagos: Pago[]) {
  const facturado = r2(facturas.filter((f) => FACTURA_CUENTA(f.status)).reduce((a, f) => a + n(f.total), 0));
  const pagado = r2(pagos.filter((p) => p.status === "confirmado").reduce((a, p) => a + n(p.amount), 0));
  const porConfirmar = r2(pagos.filter((p) => p.status === "por_confirmar").reduce((a, p) => a + n(p.amount), 0));
  return { facturado, pagado, porConfirmar, pendiente: r2(Math.max(0, facturado - pagado)) };
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
