"use client";

import { useMemo } from "react";
import {
  buildInstallmentPlan,
  validatePlan,
  FREQUENCY_LABEL,
  FREQUENCY_ADJECTIVE,
  MILESTONE_TRIGGER_LABEL,
  type FinancingPlan,
  type InstallmentFrequency,
  type MilestoneTrigger,
  type PaymentMilestone,
} from "@/lib/financing";

/** El 50/50 de las propuestas de Pime: la mitad al firmar y la mitad a la entrega. */
const HALF_AND_HALF: PaymentMilestone[] = [
  { description: "50 % al firmar", percent: 50, trigger: "SIGNING", dueDate: "" },
  { description: "50 % a la entrega", percent: 50, trigger: "DELIVERY", dueDate: "" },
];

const fieldLabel = "block text-fg-faint text-[10px] uppercase tracking-widest font-medium mb-1.5";

interface FinancingPlannerProps {
  plan: FinancingPlan;
  onChange: (plan: FinancingPlan) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  currency?: string;
  /** Texto de ayuda propio de dónde se usa. */
  hint?: string;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FinancingPlanner({
  plan,
  onChange,
  enabled,
  onToggle,
  currency = "USD",
  hint,
}: FinancingPlannerProps) {
  const built = useMemo(() => buildInstallmentPlan(plan), [plan]);
  const error = useMemo(() => (enabled ? validatePlan(plan) : null), [enabled, plan]);

  function set<K extends keyof FinancingPlan>(key: K, value: FinancingPlan[K]) {
    onChange({ ...plan, [key]: value });
  }

  const byMilestones = plan.mode === "MILESTONES";
  const milestones = plan.milestones ?? [];
  const percentSum = milestones.reduce((n, m) => n + (Number(m.percent) || 0), 0);

  function setMilestone(i: number, patch: Partial<PaymentMilestone>) {
    set("milestones", milestones.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function setMode(mode: "INSTALLMENTS" | "MILESTONES") {
    onChange({
      ...plan,
      mode,
      milestones: mode === "MILESTONES" && milestones.length === 0 ? HALF_AND_HALF : plan.milestones,
    });
  }

  return (
    <div className="bg-panel border border-line rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">
            Forma de pago
          </h3>
          <p className="text-fg-faint text-xs mt-1">
            {hint ?? "Por hitos (50 % al firmar y 50 % a la entrega) o abono más cuotas, con una parte en canje si aplica. Cada pago aparece en Cuentas por Cobrar en su fecha."}
          </p>
        </div>
        <label className="flex items-center gap-2 min-h-11 sm:min-h-8 -my-3 sm:my-0 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 rounded border border-line-loud bg-fill accent-brand"
          />
          <span className="text-fg-dim text-xs">Plan de pago</span>
        </label>
      </div>

      {enabled && (
        <div className="space-y-4 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Cómo se paga">
            {([
              ["MILESTONES", "Por hitos (50/50…)"],
              ["INSTALLMENTS", "Abono y cuotas"],
            ] as const).map(([mode, text]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={(plan.mode ?? "INSTALLMENTS") === mode}
                onClick={() => setMode(mode)}
                className={`min-h-11 sm:min-h-8 px-3 rounded-lg border text-xs font-medium transition-all ${
                  (plan.mode ?? "INSTALLMENTS") === mode
                    ? "border-brand/40 bg-brand/10 text-brand-fg"
                    : "border-line text-fg-dim hover:text-fg"
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Valor total</label>
              <input
                type="number" min="0" step="0.01"
                value={plan.total || ""}
                onChange={(e) => set("total", Number(e.target.value) || 0)}
                className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm font-mono focus:outline-none focus:border-brand/40"
              />
            </div>
            <div>
              <label className={fieldLabel}>En efectivo</label>
              <p className="min-h-9 flex items-center px-3 text-fg text-sm font-mono">{currency} {fmt(built.cash)}</p>
            </div>
          </div>

          {/* Canje: parte del valor se paga en especie y no genera cobros. */}
          <div className="rounded-lg border border-line p-3 space-y-2">
            <label className="flex items-center gap-2 min-h-11 sm:min-h-8 cursor-pointer">
              <input
                type="checkbox"
                checked={plan.barter != null}
                onChange={(e) => set("barter", e.target.checked ? { amount: 0, description: "" } : null)}
                className="w-4 h-4 rounded border border-line-loud bg-fill accent-brand"
              />
              <span className="text-fg-dim text-xs">Parte se paga en canje (en especie)</span>
            </label>
            {plan.barter != null && (
              <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-2">
                <input
                  type="number" min="0" step="0.01"
                  aria-label="Monto del canje"
                  value={plan.barter.amount || ""}
                  onChange={(e) => set("barter", { ...plan.barter!, amount: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm font-mono placeholder-fg-trace focus:outline-none focus:border-brand/40"
                />
                <textarea
                  rows={2}
                  aria-label="Qué se recibe en canje"
                  value={plan.barter.description}
                  onChange={(e) => set("barter", { ...plan.barter!, description: e.target.value })}
                  placeholder="Ej. 8 noches en Arauz Estate a $125 la noche"
                  className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-fg-trace resize-y focus:outline-none focus:border-brand/40"
                />
              </div>
            )}
          </div>

          {byMilestones ? (
            <div className="space-y-2">
              {milestones.map((m, i) => (
                // Celular: porcentaje y descripción arriba; cuándo, fecha y quitar abajo.
                // Desde tablet, todo en una fila.
                <div key={i} className="border border-line rounded-lg p-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                  <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                    <div className="relative">
                      <input
                        type="number" min="0" max="100" step="0.01"
                        aria-label="Porcentaje"
                        value={m.percent || ""}
                        onChange={(e) => setMilestone(i, { percent: Number(e.target.value) || 0 })}
                        className="w-full bg-fill border border-line rounded-lg pl-2 pr-6 py-2 text-fg text-sm font-mono focus:outline-none focus:border-brand/40"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-faint text-xs">%</span>
                    </div>
                    <input
                      aria-label="Descripción del pago"
                      value={m.description}
                      onChange={(e) => setMilestone(i, { description: e.target.value })}
                      className="w-full min-w-0 bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40"
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
                    <select
                      aria-label="Cuándo se cobra"
                      value={m.trigger}
                      onChange={(e) => setMilestone(i, { trigger: e.target.value as MilestoneTrigger })}
                      className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40"
                    >
                      {(Object.keys(MILESTONE_TRIGGER_LABEL) as MilestoneTrigger[]).map((t) => (
                        <option key={t} value={t}>{MILESTONE_TRIGGER_LABEL[t]}</option>
                      ))}
                    </select>
                    {m.trigger === "SIGNING" ? (
                      <p className="text-fg-faint text-xs">Se cobra al facturar</p>
                    ) : (
                      <input
                        type="date"
                        aria-label="Fecha estimada"
                        value={m.dueDate}
                        onChange={(e) => setMilestone(i, { dueDate: e.target.value })}
                        className="w-full min-w-0 bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40 [color-scheme:dark]"
                      />
                    )}
                    <button
                      type="button"
                      aria-label="Quitar hito"
                      onClick={() => set("milestones", milestones.filter((_, idx) => idx !== i))}
                      className="inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 text-fg-ghost hover:text-danger"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    set("milestones", [
                      ...milestones,
                      { description: "", percent: Math.max(0, 100 - percentSum), trigger: "DATE", dueDate: "" },
                    ])
                  }
                  className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg text-xs hover:text-sky"
                >
                  + Hito
                </button>
                <span className={`text-xs font-mono ${Math.abs(percentSum - 100) < 0.01 ? "text-fg-faint" : "text-warn"}`}>
                  Suma {Math.round(percentSum * 100) / 100} %
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={fieldLabel}>Abono inicial</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={plan.downPayment || ""}
                    onChange={(e) => set("downPayment", Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm font-mono placeholder-fg-trace focus:outline-none focus:border-brand/40"
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Frecuencia</label>
                  <select
                    value={plan.frequency}
                    aria-label="Frecuencia"
                    onChange={(e) => set("frequency", e.target.value as InstallmentFrequency)}
                    className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40"
                  >
                    {(Object.keys(FREQUENCY_LABEL) as InstallmentFrequency[]).map((f) => (
                      <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={fieldLabel}>N.º de cuotas</label>
                  <input
                    type="number" min="1" max="120" step="1"
                    value={plan.installments || ""}
                    onChange={(e) => set("installments", Number(e.target.value) || 0)}
                    className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm font-mono focus:outline-none focus:border-brand/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel}>Primera cuota</label>
                  <input
                    type="date"
                    value={plan.firstDueDate}
                    onChange={(e) => set("firstDueDate", e.target.value)}
                    className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brand/40 [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full grid grid-cols-2 gap-2 text-right">
                    <div>
                      <p className="text-fg-faint text-[10px] uppercase tracking-widest">Abono</p>
                      <p className="text-ok font-mono text-sm">{fmt(built.downPayment)}</p>
                    </div>
                    <div>
                      <p className="text-fg-faint text-[10px] uppercase tracking-widest">Financiado</p>
                      <p className="text-warn font-mono text-sm">{fmt(built.financedAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {error ? (
            <p className="text-danger text-xs">{error}</p>
          ) : built.rows.length > 0 ? (
            <div className="border border-line rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-fill border-b border-line flex items-center justify-between">
                <span className="text-fg-faint text-[10px] uppercase tracking-widest">
                  {byMilestones
                    ? `${built.rows.length} pago${built.rows.length !== 1 ? "s" : ""} después de firmar`
                    : `${built.rows.length} cuota${built.rows.length !== 1 ? "s" : ""} ${
                        built.rows.length === 1
                          ? FREQUENCY_ADJECTIVE[plan.frequency].replace(/es$/, "").replace(/s$/, "")
                          : FREQUENCY_ADJECTIVE[plan.frequency]
                      }`}
                </span>
                <span className="text-fg-dim text-xs font-mono">
                  Total plan: {currency} {fmt(built.planned)}
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-line">
                {built.downPayment > 0 && (
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-ok/[0.04]">
                    <span className="text-ok">{byMilestones ? "Al firmar" : "Abono inicial · a la firma"}</span>
                    <span className="text-ok font-mono">{fmt(built.downPayment)}</span>
                  </div>
                )}
                {built.rows.map((r) => (
                  <div key={r.index} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="text-fg-dim">
                      {r.description}
                      <span className="text-fg-ghost ml-2">
                        {r.dueDate
                        ? new Date(`${r.dueDate}T00:00:00`).toLocaleDateString("es-PA", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "sin fecha"}
                      </span>
                    </span>
                    <span className="text-fg-mute font-mono">{fmt(r.amount)}</span>
                  </div>
                ))}
                {built.barter > 0 && (
                  <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                    <span className="text-fg-dim min-w-0">
                      Canje{plan.barter?.description ? ` · ${plan.barter.description}` : ""}
                      <span className="text-fg-ghost ml-2">no genera cobro</span>
                    </span>
                    <span className="text-fg-mute font-mono shrink-0">{fmt(built.barter)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-fg-ghost text-xs">
              {byMilestones ? "Todo se cobra al firmar: no quedan pagos pendientes." : "El abono cubre el total: no se generan cuotas."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
