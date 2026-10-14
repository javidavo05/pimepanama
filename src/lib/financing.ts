/**
 * Plan de pago: abono inicial + cuotas mensuales o quincenales, o pagos por
 * hito (50 % al firmar y 50 % a la entrega), con una parte opcional en canje.
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

/**
 * Cuándo se cobra un hito de pago. SIGNING es el abono: se cobra al emitir la
 * factura. Los demás quedan como cuotas en Cuentas por Cobrar en su fecha.
 */
export type MilestoneTrigger = "SIGNING" | "DELIVERY" | "PHASE" | "DATE";

export const MILESTONE_TRIGGER_LABEL: Record<MilestoneTrigger, string> = {
  SIGNING: "Al firmar",
  DELIVERY: "A la entrega",
  PHASE: "Al cerrar una fase",
  DATE: "En una fecha",
};

/** Un pago por hito: "50 % al firmar", "50 % a la entrega". */
export type PaymentMilestone = {
  description: string;
  /** Porcentaje del monto en efectivo. */
  percent: number;
  trigger: MilestoneTrigger;
  /** yyyy-mm-dd; vacío si aún no se sabe (p. ej. la entrega). */
  dueDate: string;
};

export type FinancingPlan = {
  /** Valor total, incluido lo que se paga en canje. */
  total: number;
  /** Abono inicial que se cobra al firmar. 0 = sin abono. */
  downPayment: number;
  /** Cantidad de cuotas del saldo. */
  installments: number;
  frequency: InstallmentFrequency;
  /** Fecha de la primera cuota (ISO yyyy-mm-dd). */
  firstDueDate: string;
  /**
   * INSTALLMENTS (por defecto): abono + cuotas iguales por frecuencia.
   * MILESTONES: pagos por hito con su porcentaje (50/50, 40/30/30...).
   */
  mode?: "INSTALLMENTS" | "MILESTONES";
  milestones?: PaymentMilestone[];
  /** Parte del valor que se paga en especie (canje), no en efectivo. */
  barter?: { amount: number; description: string } | null;
};

export type InstallmentRow = {
  index: number;
  description: string;
  amount: number;
  dueDate: string;
};

export type BuiltPlan = {
  /** Lo que se cobra en dinero: total menos el canje. */
  cash: number;
  barter: number;
  downPayment: number;
  financedAmount: number;
  rows: InstallmentRow[];
  /** Suma de abono + cuotas + canje. Debe cuadrar con el total. */
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
  const barter = Math.min(total, Math.max(0, round2(plan.barter?.amount ?? 0)));
  const cash = round2(total - barter);

  if (plan.mode === "MILESTONES") return buildMilestonePlan(plan, cash, barter);

  const downPayment = Math.min(cash, Math.max(0, round2(plan.downPayment)));
  const financedAmount = round2(cash - downPayment);
  const count = Math.max(0, Math.floor(plan.installments));

  if (count === 0 || financedAmount <= 0) {
    return { cash, barter, downPayment, financedAmount, rows: [], planned: round2(downPayment + barter) };
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
    cash,
    barter,
    downPayment,
    financedAmount,
    rows,
    planned: round2(downPayment + accumulated + barter),
  };
}

/**
 * Pagos por hito. Los hitos "al firmar" suman el abono; el resto son cuotas
 * con su propia fecha. Si los porcentajes suman 100, el último hito absorbe el
 * redondeo para que la suma cuadre exacta con el efectivo.
 */
function buildMilestonePlan(plan: FinancingPlan, cash: number, barter: number): BuiltPlan {
  const milestones = plan.milestones ?? [];
  const percentSum = milestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
  const closes = Math.abs(percentSum - 100) < 0.01;

  const amounts: number[] = [];
  let accumulated = 0;
  milestones.forEach((m, i) => {
    const isLast = i === milestones.length - 1;
    const amount = isLast && closes
      ? round2(cash - accumulated)
      : round2((cash * (Number(m.percent) || 0)) / 100);
    accumulated = round2(accumulated + amount);
    amounts.push(amount);
  });

  let downPayment = 0;
  const rows: InstallmentRow[] = [];
  milestones.forEach((m, i) => {
    if (m.trigger === "SIGNING") {
      downPayment = round2(downPayment + amounts[i]);
    } else {
      rows.push({
        index: rows.length + 1,
        description: m.description.trim() || `Pago ${i + 1}`,
        amount: amounts[i],
        dueDate: m.dueDate,
      });
    }
  });

  return {
    cash,
    barter,
    downPayment,
    financedAmount: round2(cash - downPayment),
    rows,
    planned: round2(accumulated + barter),
  };
}

/** Valida un plan y devuelve el motivo si no sirve. */
export function validatePlan(plan: FinancingPlan): string | null {
  if (plan.total <= 0) return "El monto total debe ser mayor a cero";
  const barter = plan.barter?.amount ?? 0;
  if (barter < 0) return "El canje no puede ser negativo";
  if (barter > plan.total) return "El canje no puede superar el total";

  if (plan.mode === "MILESTONES") {
    const milestones = plan.milestones ?? [];
    if (milestones.length === 0) return "Agrega al menos un hito de pago";
    const sum = milestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
    if (Math.abs(sum - 100) >= 0.01) {
      return `Los hitos suman ${Math.round(sum * 100) / 100} %; tienen que sumar 100 %`;
    }
    const undated = milestones.find((m) => m.trigger !== "SIGNING" && !m.dueDate);
    if (undated) {
      return `Pon la fecha estimada de «${undated.description || "el hito"}»: es cuando aparece en Cuentas por Cobrar`;
    }
    return null;
  }

  const cash = plan.total - barter;
  if (plan.downPayment < 0) return "El abono inicial no puede ser negativo";
  if (plan.downPayment > cash) return "El abono inicial no puede superar el monto en efectivo";
  if (plan.installments < 1 && plan.downPayment < cash) {
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
