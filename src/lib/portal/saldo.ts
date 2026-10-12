/**
 * Saldo de un cliente con Pime: lo facturado (facturas no canceladas ni en borrador) más lo que se debe de
 * fases ya iniciadas que todavía no tienen factura, menos lo pagado (pagos confirmados). La factura es
 * opcional: una fase en curso se debe desde que inicia. Una fase con factura viva cuenta por su factura,
 * nunca dos veces. Los pagos «por confirmar» se muestran aparte y todavía no bajan la deuda.
 */
type Factura = { id: string; status: string; total: unknown; amountPaid?: unknown };
type Pago = { documentId?: string | null; phaseId?: string | null; amount: unknown; status: string };
/** Fase con su factura (si tiene). billingPoint «sin_cobro» no se cobra. */
export type FaseCobrable = { id: string; status: string; price: unknown; billingPoint?: string | null; invoiceId?: string | null; invoice?: { status: string } | null };

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
export function saldoCliente(facturas: Factura[], pagos: Pago[], fases: FaseCobrable[] = []) {
  const vivas = facturas.filter((f) => FACTURA_CUENTA(f.status));
  const facturado = r2(vivas.reduce((a, f) => a + n(f.total), 0));
  const ids = new Set(facturas.map((f) => f.id));
  const porFactura = vivas.reduce((a, f) => a + pagadoEfectivo(f, pagos), 0);
  const sueltos = pagos.filter((p) => p.status === "confirmado" && (!p.documentId || !ids.has(p.documentId))).reduce((a, p) => a + n(p.amount), 0);
  const pagado = r2(porFactura + sueltos);
  const porConfirmar = r2(pagos.filter((p) => p.status === "por_confirmar").reduce((a, p) => a + n(p.amount), 0));
  // Los pagos sin factura de una fase ya están en «sueltos»: aquí va el precio bruto para no restarlos dos veces.
  const sinFacturar = r2(fasesCobrables(fases).reduce((a, f) => a + n(f.price), 0));
  return { facturado, sinFacturar, pagado, porConfirmar, pendiente: r2(Math.max(0, facturado + sinFacturar - pagado)) };
}

/** Estados en los que una fase ya se debe: desde que inicia. */
export const FASE_INICIADA = ["en_curso", "en_revision", "hecha"] as const;

/** Fases que se deben sin factura: iniciadas, con precio, que se cobran y sin factura viva (no hay, o es borrador o anulada). */
export function fasesCobrables<F extends FaseCobrable>(fases: F[]): F[] {
  return fases.filter((f) => (FASE_INICIADA as readonly string[]).includes(f.status) && n(f.price) > 0.005 && f.billingPoint !== "sin_cobro" && !(f.invoice ? FACTURA_CUENTA(f.invoice.status) : false));
}

/** Lo que falta de cada fase iniciada sin factura: su precio menos los pagos confirmados ligados a la fase sin factura. */
export function faltaDeFases<F extends FaseCobrable>(fases: F[], pagos: Pago[]): { fase: F; pagado: number; falta: number }[] {
  return fasesCobrables(fases).map((fase) => {
    const pagado = r2(pagos.filter((p) => p.phaseId === fase.id && !p.documentId && p.status === "confirmado").reduce((a, p) => a + n(p.amount), 0));
    return { fase, pagado, falta: r2(Math.max(0, n(fase.price) - pagado)) };
  }).filter((x) => x.falta > 0.005);
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
