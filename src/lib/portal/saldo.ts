/**
 * Saldo de un cliente con Pime: lo facturado (facturas no canceladas ni en borrador) más lo que se debe de
 * fases ya iniciadas que todavía no tienen factura, menos lo pagado (pagos confirmados). La factura es
 * opcional: una fase en curso se debe desde que inicia. Una fase con factura viva cuenta por su factura,
 * nunca dos veces. Los pagos «por confirmar» se muestran aparte y todavía no bajan la deuda.
 * Lo que falta emitir de una factura (cuotas futuras o el resto contra entrega) también se debe aunque no tenga
 * fecha de pago: va en `porEmitir` y suma a `pendiente` (pedido de Javier, 2026-10-19: «ellos deben la mitad»).
 * Un proyecto que se cobra por su plan de pagos (50 % al firmar y 50 % a la entrega, cuotas…) y no por fases también
 * se debe antes de facturarlo: lo que el plan cobra en dinero y todavía no tiene factura va en `porPlan` (pedido de
 * Javier, 2026-10-19: «si le envío el acceso al cliente aparece todo en 0 y no es así»).
 */
import { buildInstallmentPlan, isFinancingPlan } from "@/lib/financing";

type Factura = { id: string; status: string; total: unknown; amountPaid?: unknown; porEmitir?: number };
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
export function saldoCliente(facturas: Factura[], pagos: Pago[], fases: FaseCobrable[] = [], planes: PlanCobrable[] = []) {
  const vivas = facturas.filter((f) => FACTURA_CUENTA(f.status));
  const facturado = r2(vivas.reduce((a, f) => a + n(f.total), 0));
  const ids = new Set(facturas.map((f) => f.id));
  const porFactura = vivas.reduce((a, f) => a + pagadoEfectivo(f, pagos), 0);
  const sueltos = pagos.filter((p) => p.status === "confirmado" && (!p.documentId || !ids.has(p.documentId))).reduce((a, p) => a + n(p.amount), 0);
  const pagado = r2(porFactura + sueltos);
  const porConfirmar = r2(pagos.filter((p) => p.status === "por_confirmar").reduce((a, p) => a + n(p.amount), 0));
  // Los pagos sin factura de una fase ya están en «sueltos»: aquí va el precio bruto para no restarlos dos veces.
  const sinFacturar = r2(fasesCobrables(fases).reduce((a, f) => a + n(f.price), 0));
  const porEmitir = r2(vivas.reduce((a, f) => a + n(f.porEmitir), 0));
  // Igual que las fases: los pagos sin factura del proyecto ya están en «sueltos», aquí va el bruto del plan.
  const porPlan = r2(planes.reduce((a, p) => a + planSinFacturar(p), 0));
  return { facturado, porEmitir, sinFacturar, porPlan, pagado, porConfirmar, pendiente: r2(Math.max(0, facturado + porEmitir + sinFacturar + porPlan - pagado)) };
}

/**
 * Proyecto con su plan de pagos, sus facturas y cuántas fases con precio se cobran (consulta con PLAN_COBRABLE de
 * datos.ts).
 */
export type PlanCobrable = { financingPlan: unknown; documents: { status: string; total: unknown }[]; _count: { phases: number } };

/**
 * Lo que el plan de pagos cobra en dinero (total menos canje) y todavía no tiene factura. Solo cuenta si el proyecto
 * no se cobra por fases: con una fase con precio, la deuda sale de las fases y el plan no se suma encima. Las
 * facturas vivas del proyecto (por su total de contrato) ya cubren esa parte del plan.
 */
export function planSinFacturar(p: PlanCobrable): number {
  if (!isFinancingPlan(p.financingPlan) || p._count.phases > 0) return 0;
  const efectivo = buildInstallmentPlan(p.financingPlan).cash;
  const facturado = p.documents.filter((d) => FACTURA_CUENTA(d.status)).reduce((a, d) => a + n(d.total), 0);
  return r2(Math.max(0, efectivo - facturado));
}

/** Lo que falta del plan de un proyecto: lo que todavía no tiene factura menos los pagos confirmados sin factura del proyecto. */
export function faltaDePlan(p: PlanCobrable, pagosSinFactura: Pago[]): number {
  const bruto = planSinFacturar(p);
  if (bruto <= 0.005) return 0;
  const pagado = pagosSinFactura.filter((x) => !x.documentId && x.status === "confirmado").reduce((a, x) => a + n(x.amount), 0);
  return r2(Math.max(0, bruto - pagado));
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

/** Cuota de un plan de pagos (PaymentSchedule) de una factura. */
export type Cuota = { documentId: string; amount: unknown; dueDate: Date; status: string };

/**
 * Lo emitido de una factura (pedido de Javier, 2026-10-16: «las facturas deben ser solo las que fueron emitidas,
 * no el total»). Una factura por el total de un contrato no se le cobra entera al cliente:
 * - con plan de cuotas: lo emitido es lo pagado más las cuotas ya vencidas; la siguiente se anuncia aparte;
 * - sin plan y con un pago parcial: lo emitido es lo pagado (el anticipo); el resto se factura después;
 * - sin pagos y sin plan, o pagada completa: la factura entera.
 */
export function emitidoDe(total: unknown, pagado: number, cuotas: Cuota[], ahora = new Date()) {
  const t = n(total);
  if (pagado >= t - 0.005) return { emitido: r2(t), porEmitir: 0, proxima: null as { monto: number; fecha: Date } | null };
  const vivas = cuotas.filter((c) => c.status !== "PAID" && c.status !== "CANCELLED").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  if (vivas.length) {
    const vencidas = vivas.filter((c) => c.dueDate.getTime() <= ahora.getTime()).reduce((a, c) => a + n(c.amount), 0);
    const emitido = r2(Math.min(t, pagado + vencidas));
    const sig = vivas.find((c) => c.dueDate.getTime() > ahora.getTime());
    return { emitido, porEmitir: r2(t - emitido), proxima: sig ? { monto: r2(n(sig.amount)), fecha: sig.dueDate } : null };
  }
  if (pagado > 0.005) return { emitido: r2(pagado), porEmitir: r2(t - pagado), proxima: null };
  return { emitido: r2(t), porEmitir: 0, proxima: null };
}

/** Las facturas como las ve el cliente: `total` pasa a ser lo emitido y se guardan el total del contrato y lo que falta emitir. */
export function facturasEmitidas<F extends Factura>(facturas: F[], pagos: Pago[], cuotas: Cuota[], ahora = new Date()) {
  return facturas.map((f) => {
    const pagado = pagadoEfectivo(f, pagos);
    const e = emitidoDe(f.total, pagado, cuotas.filter((c) => c.documentId === f.id), ahora);
    return { ...f, totalContrato: n(f.total), total: e.emitido, porEmitir: e.porEmitir, proxima: e.proxima };
  });
}

/** Un pago del plan como lo ve el cliente: «50 % al firmar», cuánto, cuánto ya pagó y si ya le toca. */
export type PagoDelPlan = { etiqueta: string; cuando: string; monto: number; pagado: number; falta: number; estado: "pagado" | "toca" | "despues" };
export type PlanDelCliente = { proyecto: string; resumen: string; filas: PagoDelPlan[]; canje: { monto: number; descripcion: string } | null; efectivo: number; total: number };

const fechaPlan = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * El plan de pagos acordado de un proyecto, pago por pago (pedido de Javier, 2026-10-19: «si el cliente tiene un plan
 * de pago de 50/50 debe salir así»). Lo pagado al proyecto se reparte en orden: primero el pago al firmar, luego el
 * siguiente. Un pago «toca» cuando llegó su momento: al firmar (el proyecto ya arrancó), en su fecha, o a la entrega
 * cuando el proyecto se entregó; si no, va «después». El canje se muestra aparte: no se paga en dinero.
 */
export function pagosDelPlan(plan: unknown, pagadoProyecto: number, opts: { proyecto: string; entregado: boolean; ahora?: Date }): PlanDelCliente | null {
  if (!isFinancingPlan(plan)) return null;
  const built = buildInstallmentPlan(plan);
  const ahora = opts.ahora ?? new Date();
  const base: Omit<PagoDelPlan, "pagado" | "falta" | "estado">[] = [];
  const llego: boolean[] = [];

  if (plan.mode === "MILESTONES") {
    const hitos = plan.milestones ?? [];
    const cierra = Math.abs(hitos.reduce((a, m) => a + (Number(m.percent) || 0), 0) - 100) < 0.01;
    let acumulado = 0;
    hitos.forEach((m, i) => {
      const monto = i === hitos.length - 1 && cierra ? r2(built.cash - acumulado) : r2((built.cash * (Number(m.percent) || 0)) / 100);
      acumulado = r2(acumulado + monto);
      const f = m.dueDate ? fechaPlan(m.dueDate) : null;
      const cuando = m.trigger === "SIGNING" ? "Al firmar" : m.trigger === "DELIVERY" ? "A la entrega" : f ? f.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Al cerrar una fase";
      base.push({ etiqueta: m.description?.trim() || `${n(m.percent)} % ${cuando.toLowerCase()}`, cuando, monto });
      llego.push(m.trigger === "SIGNING" || (m.trigger === "DELIVERY" && opts.entregado) || (!!f && f.getTime() <= ahora.getTime()));
    });
  } else {
    if (built.downPayment > 0.005) { base.push({ etiqueta: "Abono inicial", cuando: "Al firmar", monto: built.downPayment }); llego.push(true); }
    for (const c of built.rows) {
      const f = fechaPlan(c.dueDate);
      base.push({ etiqueta: c.description, cuando: f ? f.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Por definir", monto: c.amount });
      llego.push(!!f && f.getTime() <= ahora.getTime());
    }
  }
  if (!base.length) return null;

  let resto = Math.max(0, pagadoProyecto);
  const filas: PagoDelPlan[] = base.map((x, i) => {
    const pagado = r2(Math.min(x.monto, resto));
    resto = r2(resto - pagado);
    const falta = r2(x.monto - pagado);
    return { ...x, pagado, falta, estado: falta <= 0.005 ? "pagado" : llego[i] ? "toca" : "despues" };
  });
  const resumen = plan.mode === "MILESTONES"
    ? (plan.milestones ?? []).map((m) => `${n(m.percent)}`).join(" / ")
    : `${built.downPayment > 0.005 ? "Abono + " : ""}${built.rows.length} ${built.rows.length === 1 ? "cuota" : "cuotas"}`;
  return {
    proyecto: opts.proyecto,
    resumen,
    filas,
    canje: built.barter > 0.005 ? { monto: built.barter, descripcion: plan.barter?.description ?? "" } : null,
    efectivo: built.cash,
    total: r2(built.cash + built.barter),
  };
}
