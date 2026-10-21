/**
 * Qué hace el asistente solo y qué deja para que la persona confirme (pedido del 2026-10-12). Una sola regla
 * para todas las herramientas de escritura; es pura para poder probarla.
 *
 * Pide confirmar cuando:
 *   - borra o anula cualquier cosa;
 *   - toca una factura ya emitida (no borrador) o un plan de pagos que ya tiene pagos;
 *   - el cambio afecta más de 10 registros de una vez;
 *   - mueve USD 1,000 o más en una sola acción (pago, precio de fase, factura, gasto, cambio de plan);
 *   - envía algo hacia afuera (un correo): siempre, con el borrador a la vista.
 * Todo lo demás lo hace al instante y deja «Deshacer».
 */
export const UMBRAL_USD = 1000;
export const MAX_REGISTROS = 10;

export type Evaluable = {
  /** borrar, anular o cancelar algo */
  destruye?: boolean;
  /** dinero que mueve esta acción (en un cambio, la diferencia), en USD */
  monto?: number | null;
  /** cuántos registros cambia de una vez */
  registros?: number;
  /** toca una factura ya emitida (no borrador) */
  facturaEmitida?: boolean;
  /** toca un plan de pagos que ya tiene pagos */
  planConPagos?: boolean;
  /** sale hacia afuera (un correo a alguien): no se puede deshacer */
  sale?: boolean;
};

export type Decision = { confirmar: boolean; motivo: string | null };

export function requiereConfirmacion(a: Evaluable): Decision {
  if (a.sale) return { confirmar: true, motivo: "Envía un correo: revisa el borrador." };
  if (a.destruye) return { confirmar: true, motivo: "Borra o anula algo." };
  if (a.facturaEmitida) return { confirmar: true, motivo: "Toca una factura ya emitida." };
  if (a.planConPagos) return { confirmar: true, motivo: "El plan de pagos ya tiene pagos." };
  if ((a.registros ?? 1) > MAX_REGISTROS) return { confirmar: true, motivo: `Cambia ${a.registros} registros de una vez.` };
  const m = Math.abs(Number(a.monto ?? 0));
  if (Number.isFinite(m) && m >= UMBRAL_USD - 0.005) return { confirmar: true, motivo: `Mueve USD ${m.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` };
  return { confirmar: false, motivo: null };
}
