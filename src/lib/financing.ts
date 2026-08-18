/**
 * Plan de financiación: abono inicial + cuotas mensuales o quincenales.
 *
 * Lógica pura, sin base de datos: la usan el formulario de proyecto (para
 * guardar el plan) y el constructor de facturas (para materializar las cuotas
 * como PaymentSchedule reales, que es lo que aparece en Cuentas por Cobrar).
 */

export type InstallmentFrequency = "MONTHLY" | "BIWEEKLY" | "WEEKLY";

export const FREQUENCY_LABEL: Record<InstallmentFrequency, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
  WEEKLY: "Semanal",
};

/** Forma adjetiva plural: "6 cuotas mensuales", no "6 cuotas de mensual". */
export const FREQUENCY_ADJECTIVE: Record<InstallmentFrequency, string> = {
  MONTHLY: "mensuales",
  BIWEEKLY: "quincenales",
  WEEKLY: "semanales",
};

export type FinancingPlan = {
  total: number;
  /** Abono inicial que se cobra al firmar. 0 = sin abono. */
  downPayment: number;
  /** Cantidad de cuotas del saldo. */
  installments: number;
  frequency: InstallmentFrequency;
  /** Fecha de la primera cuota (ISO yyyy-mm-dd). */
  firstDueDate: string;
};

export type InstallmentRow = {
  index: number;
  description: string;
  amount: number;
  dueDate: string;
};

export type BuiltPlan = {
  downPayment: number;
  financedAmount: number;
  rows: InstallmentRow[];
  /** Suma de abono + cuotas. Debe cuadrar con el total. */
  planned: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Avanza una fecha según la frecuencia, sin desbordar fin de mes. */
export function advanceDate(from: Date, frequency: InstallmentFrequency, steps: number): Date {
  const d = new Date(from.getTime());
  if (frequency === "MONTHLY") {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + steps);
    // 31 de enero + 1 mes → 28/29 de febrero, no el 3 de marzo.
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d;
  }
  const days = frequency === "BIWEEKLY" ? 15 : 7;
  d.setDate(d.getDate() + days * steps);
  return d;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Construye las cuotas. El redondeo sobrante se acumula en la última cuota
 * para que la suma cuadre exactamente con el total financiado.
 */
export function buildInstallmentPlan(plan: FinancingPlan): BuiltPlan {
  const total = Math.max(0, round2(plan.total));
  const downPayment = Math.min(total, Math.max(0, round2(plan.downPayment)));
  const financedAmount = round2(total - downPayment);
  const count = Math.max(0, Math.floor(plan.installments));

  if (count === 0 || financedAmount <= 0) {
    return { downPayment, financedAmount, rows: [], planned: downPayment };
  }

  const base = Math.floor((financedAmount / count) * 100) / 100;
  const start = plan.firstDueDate ? parseISO(plan.firstDueDate) : new Date();

  const rows: InstallmentRow[] = [];
  let accumulated = 0;
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast ? round2(financedAmount - accumulated) : base;
    accumulated = round2(accumulated + amount);
    rows.push({
      index: i + 1,
      description: `Cuota ${i + 1} de ${count}`,
      amount,
      dueDate: toISO(advanceDate(start, plan.frequency, i)),
    });
  }

  return {
    downPayment,
    financedAmount,
    rows,
    planned: round2(downPayment + accumulated),
  };
}

/** Valida un plan y devuelve el motivo si no sirve. */
export function validatePlan(plan: FinancingPlan): string | null {
  if (plan.total <= 0) return "El monto total debe ser mayor a cero";
  if (plan.downPayment < 0) return "El abono inicial no puede ser negativo";
  if (plan.downPayment > plan.total) return "El abono inicial no puede superar el total";
  if (plan.installments < 1 && plan.downPayment < plan.total) {
    return "Indica al menos una cuota para el saldo";
  }
  if (!plan.firstDueDate) return "Falta la fecha de la primera cuota";
  return null;
}

export function isFinancingPlan(value: unknown): value is FinancingPlan {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return typeof p.total === "number" && typeof p.installments === "number";
}
