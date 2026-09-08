"use client";

import { useMemo } from "react";
import {
  buildInstallmentPlan,
  validatePlan,
  FREQUENCY_LABEL,
  FREQUENCY_ADJECTIVE,
  type FinancingPlan,
  type InstallmentFrequency,
} from "@/lib/financing";

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

  return (
    <div className="bg-panel border border-line rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">
            Financiación
          </h3>
          <p className="text-fg-faint text-xs mt-1">
            {hint ?? "Divide el pago en un abono inicial más cuotas. Cada cuota aparece en Cuentas por Cobrar en su fecha."}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 rounded border border-line-loud bg-fill accent-brand"
          />
          <span className="text-fg-dim text-xs">Financiar</span>
        </label>
      </div>

      {enabled && (
        <div className="space-y-4 border-t border-line pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-fg-faint text-[10px] uppercase tracking-widest font-medium mb-1.5">
                Monto total
              </label>
              <input
                type="number" min="0" step="0.01"
                value={plan.total || ""}
                onChange={(e) => set("total", Number(e.target.value) || 0)}
                className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm font-mono focus:outline-none focus:border-brand/40"
              />
            </div>
            <div>
              <label className="block text-fg-faint text-[10px] uppercase tracking-widest font-medium mb-1.5">
                Abono inicial
              </label>
              <input
                type="number" min="0" step="0.01"
                value={plan.downPayment || ""}
                onChange={(e) => set("downPayment", Number(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm font-mono placeholder-fg-trace focus:outline-none focus:border-brand/40"
              />
            </div>
            <div>
              <label className="block text-fg-faint text-[10px] uppercase tracking-widest font-medium mb-1.5">
                Frecuencia
              </label>
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
              <label className="block text-fg-faint text-[10px] uppercase tracking-widest font-medium mb-1.5">
                N.º de cuotas
              </label>
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
              <label className="block text-fg-faint text-[10px] uppercase tracking-widest font-medium mb-1.5">
                Primera cuota
              </label>
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

          {error ? (
            <p className="text-danger text-xs">{error}</p>
          ) : built.rows.length > 0 ? (
            <div className="border border-line rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-fill border-b border-line flex items-center justify-between">
                <span className="text-fg-faint text-[10px] uppercase tracking-widest">
                  {built.rows.length} cuota{built.rows.length !== 1 ? "s" : ""}{" "}
                  {built.rows.length === 1
                    ? FREQUENCY_ADJECTIVE[plan.frequency].replace(/es$/, "").replace(/s$/, "")
                    : FREQUENCY_ADJECTIVE[plan.frequency]}
                </span>
                <span className="text-fg-dim text-xs font-mono">
                  Total plan: {currency} {fmt(built.planned)}
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-line">
                {built.downPayment > 0 && (
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-ok/[0.04]">
                    <span className="text-ok">Abono inicial · a la firma</span>
                    <span className="text-ok font-mono">{fmt(built.downPayment)}</span>
                  </div>
                )}
                {built.rows.map((r) => (
                  <div key={r.index} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="text-fg-dim">
                      {r.description}
                      <span className="text-fg-ghost ml-2">
                        {new Date(`${r.dueDate}T00:00:00`).toLocaleDateString("es-PA", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </span>
                    </span>
                    <span className="text-fg-mute font-mono">{fmt(r.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-fg-ghost text-xs">
              El abono cubre el total: no se generan cuotas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
