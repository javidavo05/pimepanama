/**
 * Gastos de un proyecto (producto): este mes, este año y lo recurrente por mes. Función pura, sin base.
 *
 * - La fecha de un gasto es cuándo se pagó; si no se ha pagado, cuándo vence; si no tiene, cuándo se anotó.
 * - Los cancelados no cuentan.
 * - Mes y año van en hora de Panamá (UTC-5, sin horario de verano).
 * - Recurrente mensual: cada gasto recurrente es una serie (mismo título y proveedor); cuenta el monto de su
 *   registro más reciente, una vez. Así da igual si se anota una sola vez o un registro por mes.
 */
export type GastoMin = {
  title: string;
  vendor: string | null;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  isRecurring: boolean;
  paidAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
};

export type TotalesGastos = { mes: number; anio: number; recurrenteMensual: number; cantidad: number; pendiente: number };

const PANAMA_MS = 5 * 3600_000;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function fechaDeGasto(g: Pick<GastoMin, "paidAt" | "dueDate" | "createdAt">): Date {
  return g.paidAt ?? g.dueDate ?? g.createdAt;
}

export function totalesGastos(gastos: GastoMin[], ahora: Date = new Date()): TotalesGastos {
  const local = new Date(ahora.getTime() - PANAMA_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const enPanama = (d: Date) => new Date(d.getTime() - PANAMA_MS);
  const vigentes = gastos.filter((g) => g.status !== "CANCELLED");

  let mes = 0, anio = 0, pendiente = 0;
  for (const g of vigentes) {
    const f = enPanama(fechaDeGasto(g));
    if (f.getUTCFullYear() === y) {
      anio += g.amount;
      if (f.getUTCMonth() === m) mes += g.amount;
    }
    if (g.status === "PENDING") pendiente += g.amount;
  }

  const series = new Map<string, GastoMin>();
  for (const g of vigentes.filter((x) => x.isRecurring)) {
    const k = `${g.title.trim().toLowerCase()}|${(g.vendor ?? "").trim().toLowerCase()}`;
    const prev = series.get(k);
    if (!prev || fechaDeGasto(g) > fechaDeGasto(prev)) series.set(k, g);
  }
  const recurrenteMensual = [...series.values()].reduce((a, g) => a + g.amount, 0);

  return { mes: r2(mes), anio: r2(anio), recurrenteMensual: r2(recurrenteMensual), cantidad: vigentes.length, pendiente: r2(pendiente) };
}
