/**
 * Horas de soporte (decisiones del 2026-10-11): $30 la hora línea Normal y $20 Premium, bloques de
 * 15 minutos con mínimo de 30 por registro, el cliente aprueba si el estimado pasa de 2 horas, y las
 * fallas nuestras dentro de la garantía (90 días) no se cobran. Todos los valores salen de
 * CompanyConfig; aquí solo están los cálculos, sin base de datos, para poder probarlos.
 */
import type { Linea } from "./estados";

export type ReglasHoras = {
  tarifaNormal: number;
  tarifaPremium: number;
  redondeoMinutos: number;
  minimoMinutos: number;
  aprobacionHoras: number;
  garantiaDias: number;
};

export const REGLAS_POR_DEFECTO: ReglasHoras = {
  tarifaNormal: 30,
  tarifaPremium: 20,
  redondeoMinutos: 15,
  minimoMinutos: 30,
  aprobacionHoras: 2,
  garantiaDias: 90,
};

const num = (v: unknown, def: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : def;
};

/** Lee las reglas de una fila de CompanyConfig (Decimal de Prisma o número), con los valores por defecto. */
export function reglasDe(config: Partial<Record<
  "hourlyRateNormal" | "hourlyRatePremium" | "timeRoundingMinutes" | "timeMinimumMinutes" | "estimateApprovalHours" | "warrantyDays",
  unknown
>> | null | undefined): ReglasHoras {
  const d = REGLAS_POR_DEFECTO;
  return {
    tarifaNormal: num(config?.hourlyRateNormal, d.tarifaNormal),
    tarifaPremium: num(config?.hourlyRatePremium, d.tarifaPremium),
    redondeoMinutos: Math.max(1, Math.round(num(config?.timeRoundingMinutes, d.redondeoMinutos))),
    minimoMinutos: Math.max(0, Math.round(num(config?.timeMinimumMinutes, d.minimoMinutos))),
    aprobacionHoras: num(config?.estimateApprovalHours, d.aprobacionHoras),
    garantiaDias: Math.max(0, Math.round(num(config?.warrantyDays, d.garantiaDias))),
  };
}

/** Tarifa por hora de un cliente: la suya si la tiene, si no la de su línea. */
export function tarifaDe(cliente: { brandLine?: string | null; hourlyRate?: unknown }, reglas: ReglasHoras): number {
  const propia = cliente.hourlyRate == null ? NaN : Number(cliente.hourlyRate);
  if (Number.isFinite(propia) && propia >= 0) return propia;
  return (cliente.brandLine as Linea) === "premium" ? reglas.tarifaPremium : reglas.tarifaNormal;
}

/** Minutos que se cobran: hacia arriba al bloque, nunca menos que el mínimo. 0 si no se trabajó. */
export function minutosCobrados(minutos: number, reglas: Pick<ReglasHoras, "redondeoMinutos" | "minimoMinutos">): number {
  if (!Number.isFinite(minutos) || minutos <= 0) return 0;
  const bloque = Math.max(1, reglas.redondeoMinutos);
  const redondeado = Math.ceil(minutos / bloque) * bloque;
  return Math.max(redondeado, reglas.minimoMinutos);
}

/** Monto en dólares con dos decimales. */
export function montoDe(minutosCobradosValor: number, tarifa: number): number {
  return Math.round((minutosCobradosValor / 60) * tarifa * 100) / 100;
}

/** ¿Hace falta que el cliente apruebe el estimado antes de trabajar? */
export function requiereAprobacion(minutosEstimados: number | null | undefined, reglas: Pick<ReglasHoras, "aprobacionHoras">): boolean {
  return !!minutosEstimados && minutosEstimados > reglas.aprobacionHoras * 60;
}

/** ¿La entrega sigue en garantía en esta fecha? (fallas nuestras dentro de ese plazo no se cobran) */
export function enGarantia(entregadoEl: Date | string | null | undefined, hoy: Date, reglas: Pick<ReglasHoras, "garantiaDias">): boolean {
  if (!entregadoEl) return false;
  const t = new Date(entregadoEl).getTime();
  if (!Number.isFinite(t)) return false;
  return hoy.getTime() - t <= reglas.garantiaDias * 86_400_000 && hoy.getTime() >= t;
}

/** Calcula una entrada de horas completa. Garantía o no facturable = monto 0, pero se registra el tiempo. */
export function calcularEntrada(
  minutos: number,
  tarifa: number,
  reglas: ReglasHoras,
  opciones: { facturable?: boolean; garantia?: boolean } = {},
): { billedMinutes: number; amount: number; billable: boolean } {
  const billable = opciones.facturable !== false && !opciones.garantia;
  const billedMinutes = billable ? minutosCobrados(minutos, reglas) : 0;
  return { billedMinutes, amount: billable ? montoDe(billedMinutes, tarifa) : 0, billable };
}

/** «1 h 45 min», «30 min», «2 h». */
export function formatoHoras(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}
