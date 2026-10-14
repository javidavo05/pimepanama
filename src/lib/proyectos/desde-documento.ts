/**
 * Cómo se traduce lo que la IA leyó de una propuesta, cotización o contrato
 * (ContractAnalysis) a lo que guarda un proyecto: alcance, fases con sus
 * entregables y plan de pago.
 *
 * Lo usan el alta del proyecto y «Completar con un documento» en un proyecto
 * que ya existe: los dos tienen que leer el documento igual.
 */
import type { ContractAnalysis } from "@/components/empresa/contract-analyzer";
import type { FinancingPlan } from "@/lib/financing";
import type { FaseCobro } from "@/lib/portal/estados";

export type FaseDesdeDocumento = {
  name: string;
  description: string;
  /** null = sin precio propio (precio cerrado del proyecto). */
  price: number | null;
  billingPoint: FaseCobro;
  estimatedDays: number | null;
  deliverables: { name: string; description: string; dueDate: string }[];
};

/** Alcance con las listas de incluye / no incluye y el plazo: lo que se consulta cuando piden algo que no estaba. */
export function alcanceDesdeDocumento(a: ContractAnalysis): string {
  return [
    a.scope?.trim(),
    a.scopeIncludes?.length ? `Incluye:\n${a.scopeIncludes.map((x) => `• ${x}`).join("\n")}` : "",
    a.scopeExcludes?.length ? `No incluye:\n${a.scopeExcludes.map((x) => `• ${x}`).join("\n")}` : "",
    a.durationText ? `Plazo: ${a.durationText}` : "",
  ].filter(Boolean).join("\n\n");
}

export function fasesDesdeDocumento(a: ContractAnalysis): FaseDesdeDocumento[] {
  const toItem = (d: { name: string; description?: string | null; dueDate?: string | null }) => ({
    name: d.name ?? "",
    description: d.description ?? "",
    dueDate: d.dueDate ?? "",
  });
  if (a.phases?.length) {
    return a.phases.map((p) => ({
      name: p.name,
      description: [
        p.optional ? "Fase opcional: se aprueba por separado." : "",
        p.summary ?? "",
        p.timeframe ? `Plazo: ${p.timeframe}.` : "",
      ].filter(Boolean).join(" "),
      price: p.amount ?? null,
      // Con precio propio se cobra al entregarla (las opcionales, al aprobarlas);
      // sin precio propio el cobro va por el plan de pago del proyecto.
      billingPoint: p.amount == null ? "sin_cobro" : p.optional ? "al_aprobar" : "al_entregar",
      estimatedDays: p.estimatedDays ? Math.round(p.estimatedDays) : null,
      deliverables: p.deliverables.map(toItem),
    }));
  }
  if (a.deliverables?.length) {
    return [{ name: "Fase 1", description: "", price: null, billingPoint: "sin_cobro", estimatedDays: null, deliverables: a.deliverables.map(toItem) }];
  }
  return [];
}

/** Plan de pago (hitos 50/50, abono y cuotas, canje) o null si el documento no dice cómo se paga. */
export function planDesdeDocumento(a: ContractAnalysis, fechaEntrega?: string | null): FinancingPlan | null {
  const pay = a.payment;
  if (!pay || !(pay.schedule === "MILESTONES" || pay.schedule === "INSTALLMENTS" || pay.barter)) return null;
  const total = a.value ?? (pay.cashAmount ?? 0) + (pay.barter?.amount ?? 0);
  const entrega = a.endsAt ?? fechaEntrega ?? "";
  return {
    total,
    barter: pay.barter?.amount ? { amount: pay.barter.amount, description: pay.barter.description } : null,
    mode: pay.schedule === "INSTALLMENTS" ? "INSTALLMENTS" : "MILESTONES",
    milestones:
      pay.schedule === "INSTALLMENTS"
        ? undefined
        : (pay.milestones.length > 0
            ? pay.milestones
            : [{ description: "Pago único", percent: 100, trigger: "SIGNING" as const, dueDate: null }]
          ).map((m) => ({
            description: m.description,
            percent: m.percent,
            trigger: m.trigger,
            // "A la entrega" sin fecha: la fecha estimada de fin del proyecto.
            dueDate: m.dueDate ?? (m.trigger === "DELIVERY" ? entrega : ""),
          })),
    downPayment: pay.installments?.downPayment ?? 0,
    installments: pay.installments?.count ?? 1,
    frequency: pay.installments?.frequency ?? "MONTHLY",
    firstDueDate: pay.installments?.firstDueDate ?? a.startsAt ?? "",
  };
}

/** "50/50 · $1,000 en canje": una línea para decir qué plan de pago se va a guardar. */
export function describirPlan(plan: FinancingPlan): string {
  const partes: string[] = [];
  if (plan.mode === "MILESTONES" && plan.milestones?.length) {
    partes.push(`por hitos ${plan.milestones.map((m) => Math.round(m.percent)).join("/")}`);
  } else {
    partes.push(`abono y ${plan.installments} cuota${plan.installments !== 1 ? "s" : ""}`);
  }
  if (plan.barter?.amount) partes.push(`$${plan.barter.amount.toLocaleString("en-US")} en canje`);
  return partes.join(" · ");
}
