/**
 * Reglas puras del mantenimiento mensual (fase 4). Sin base de datos, con prueba en mantenimiento.test.ts.
 * La factura se arma en BORRADOR el día elegido del mes (o el primer día que corra el cron después, si ese
 * día se pasó) y una sola vez por mes de Panamá.
 */
import { diaPanama } from "./seguimientos-reglas";

export const DIA_MIN = 1;
/** Hasta el 28 para que exista en todos los meses. */
export const DIA_MAX = 28;

export type ProyectoMantenimiento = {
  status: string;
  mantenimientoActivo: boolean;
  mantenimientoMonto: number | null;
  mantenimientoDia: number;
  mantenimientoUltimoAt: Date | null;
};

/** «2026-10» del día de Panamá de un instante. */
export const mesPanama = (d: Date) => diaPanama(d).slice(0, 7);

export function diaValido(n: unknown): number | null {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) && v >= DIA_MIN && v <= DIA_MAX ? v : null;
}

/** Si hoy toca armar la factura de mantenimiento de este proyecto. */
export function tocaFacturar(p: ProyectoMantenimiento, ahora: Date): boolean {
  if (!p.mantenimientoActivo || p.status !== "ACTIVE") return false;
  if (!(Number(p.mantenimientoMonto) > 0)) return false;
  const hoy = diaPanama(ahora);
  const diaDelMes = Number(hoy.slice(8, 10));
  const dia = diaValido(p.mantenimientoDia) ?? DIA_MIN;
  if (diaDelMes < dia) return false;
  return !p.mantenimientoUltimoAt || mesPanama(p.mantenimientoUltimoAt) !== hoy.slice(0, 7);
}

/** «Mantenimiento mensual · octubre 2026» */
export function lineaMantenimiento(ahora: Date): string {
  const [y, m] = diaPanama(ahora).split("-").map(Number);
  const mes = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-PA", { month: "long", year: "numeric", timeZone: "UTC" });
  return `Mantenimiento mensual · ${mes.replace(/ de /, " ")}`;
}

/** Primer instante del mes de Panamá de `ahora` (para el candado de una sola factura por mes). */
export function inicioDeMesPanama(ahora: Date): Date {
  const [y, m] = diaPanama(ahora).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 5));
}
