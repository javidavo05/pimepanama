"use client";

import type { DeliverableDraft } from "@/components/empresa/deliverables-editor";
import { FASE_COBRO, FASE_COBRO_LABEL, type FaseCobro } from "@/lib/portal/estados";

/** Lo mismo que guarda ProjectPhase: precio, cuándo se cobra y plazo en días. */
export type PhaseDraft = {
  name: string;
  description: string;
  /** Texto del input; vacío = sin precio propio (precio cerrado del proyecto). */
  price: string;
  billingPoint: FaseCobro;
  /** Texto del input, en días. */
  estimatedDays: string;
  deliverables: DeliverableDraft[];
};

export const emptyPhase = (n: number): PhaseDraft => ({
  name: `Fase ${n}`,
  description: "",
  price: "",
  billingPoint: "al_entregar",
  estimatedDays: "",
  deliverables: [],
});

interface PhasesEditorProps {
  phases: PhaseDraft[];
  onChange: (phases: PhaseDraft[]) => void;
  /** true si las fases vinieron del documento adjunto, para decirlo. */
  fromDocument?: boolean;
}

const input =
  "w-full bg-fill border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-brand/40";
const label = "block text-fg-faint text-[10px] uppercase tracking-widest font-medium mb-1";

const money = (v: string) => {
  const n = Number(v);
  return v && Number.isFinite(n)
    ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : null;
};

/**
 * Fases del proyecto con sus entregables adentro. Una propuesta completa trae
 * decenas de entregables: cada fase se pliega para que la pantalla no sea un
 * muro de campos.
 */
export function PhasesEditor({ phases, onChange, fromDocument = false }: PhasesEditorProps) {
  const total = phases.reduce((n, p) => n + p.deliverables.length, 0);

  function updatePhase(i: number, patch: Partial<PhaseDraft>) {
    onChange(phases.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function updateItem(pi: number, di: number, patch: Partial<DeliverableDraft>) {
    updatePhase(pi, {
      deliverables: phases[pi].deliverables.map((d, idx) => (idx === di ? { ...d, ...patch } : d)),
    });
  }

  return (
    <div className="bg-panel border border-line rounded-xl p-4 sm:p-6 space-y-4">
      {/* Las fases son las mismas que ve el cliente en su cuenta y las que se facturan. */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">
            Fases y entregables
          </h3>
          <p className="text-fg-faint text-xs mt-1">
            {phases.length === 0
              ? "Las etapas del proyecto y lo que se entrega en cada una."
              : `${phases.length} fase${phases.length !== 1 ? "s" : ""} · ${total} entregable${total !== 1 ? "s" : ""}${
                  fromDocument ? " sacados del documento" : ""
                }. Revísalos aquí; después también se cambian desde el proyecto.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...phases, emptyPhase(phases.length + 1)])}
          className="inline-flex items-center min-h-11 sm:min-h-8 px-2 -mx-2 text-brand-fg text-sm sm:text-xs hover:text-sky transition-colors shrink-0"
        >
          + Fase
        </button>
      </div>

      {phases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
          <p className="text-fg-dim text-sm">Sin fases todavía</p>
          <p className="text-fg-faint text-xs mt-1">
            Adjunta la propuesta arriba para sacarlas solas, o arma la primera a mano.
          </p>
          <button
            type="button"
            onClick={() => onChange([emptyPhase(1)])}
            className="mt-3 inline-flex items-center justify-center min-h-11 sm:min-h-8 px-3 rounded-lg bg-brand/10 border border-brand/25 text-brand-fg text-xs font-medium hover:bg-brand/15"
          >
            Agregar la primera fase
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {phases.map((p, pi) => (
            <details
              key={pi}
              open={phases.length === 1}
              className="group border border-line rounded-lg overflow-hidden"
            >
              <summary className="flex items-center gap-3 min-h-11 px-3 py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-fill">
                <span className="text-fg-ghost text-xs transition-transform group-open:rotate-90" aria-hidden>
                  ▸
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-fg-soft text-sm truncate">
                    {p.name.trim() || `Fase ${pi + 1}`}
                  </span>
                  <span className="block text-fg-faint text-[11px]">
                    {p.deliverables.length} entregable{p.deliverables.length !== 1 ? "s" : ""}
                    {p.estimatedDays ? ` · ${p.estimatedDays} días` : ""}
                    {` · ${FASE_COBRO_LABEL[p.billingPoint]}`}
                  </span>
                </span>
                {money(p.price) && (
                  <span className="shrink-0 text-fg-dim text-xs font-mono">{money(p.price)}</span>
                )}
              </summary>

              <div className="border-t border-line p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2">
                  <div>
                    <label className={label}>Nombre de la fase</label>
                    <input
                      value={p.name}
                      onChange={(e) => updatePhase(pi, { name: e.target.value })}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={label}>Precio</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={p.price}
                      onChange={(e) => updatePhase(pi, { price: e.target.value })}
                      placeholder="Precio cerrado"
                      className={`${input} font-mono`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2">
                  <div>
                    <label className={label}>Cuándo se cobra</label>
                    <select
                      value={p.billingPoint}
                      onChange={(e) => updatePhase(pi, { billingPoint: e.target.value as FaseCobro })}
                      className={input}
                    >
                      {FASE_COBRO.map((b) => (
                        <option key={b} value={b}>{FASE_COBRO_LABEL[b]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Días</label>
                    <input
                      type="number" min="0" step="1"
                      value={p.estimatedDays}
                      onChange={(e) => updatePhase(pi, { estimatedDays: e.target.value })}
                      placeholder="—"
                      className={`${input} font-mono`}
                    />
                  </div>
                </div>
                <div>
                  <label className={label}>Qué cubre</label>
                  <textarea
                    rows={3}
                    value={p.description}
                    onChange={(e) => updatePhase(pi, { description: e.target.value })}
                    className={`${input} resize-none`}
                  />
                </div>

                <div className="space-y-2">
                  <p className={label}>Entregables</p>
                  {p.deliverables.length === 0 && (
                    <p className="text-fg-ghost text-xs">Esta fase todavía no tiene entregables.</p>
                  )}
                  {p.deliverables.map((d, di) => (
                    <div key={di} className="border border-line rounded-lg p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-fg-ghost text-[10px] font-mono w-6 shrink-0">
                          {pi + 1}.{di + 1}
                        </span>
                        <input
                          value={d.name}
                          onChange={(e) => updateItem(pi, di, { name: e.target.value })}
                          placeholder="Nombre del entregable"
                          aria-label="Nombre del entregable"
                          className={`${input} flex-1 min-w-0`}
                        />
                        <button
                          type="button"
                          aria-label={`Quitar ${d.name || "entregable"}`}
                          onClick={() =>
                            updatePhase(pi, { deliverables: p.deliverables.filter((_, idx) => idx !== di) })
                          }
                          className="inline-flex items-center justify-center min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 text-fg-ghost hover:text-danger shrink-0"
                        >
                          ×
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-2">
                        <textarea
                          rows={2}
                          value={d.description}
                          onChange={(e) => updateItem(pi, di, { description: e.target.value })}
                          placeholder="Detalle (opcional)"
                          aria-label="Detalle del entregable"
                          className={`${input} text-xs text-fg-mute resize-y`}
                        />
                        <input
                          type="date"
                          value={d.dueDate}
                          onChange={(e) => updateItem(pi, di, { dueDate: e.target.value })}
                          aria-label="Fecha de entrega"
                          className={`${input} text-xs self-start [color-scheme:dark]`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updatePhase(pi, {
                        deliverables: [...p.deliverables, { name: "", description: "", dueDate: "" }],
                      })
                    }
                    className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg text-xs hover:text-sky"
                  >
                    + Entregable
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(phases.filter((_, idx) => idx !== pi))}
                    className="inline-flex items-center min-h-11 sm:min-h-8 text-fg-faint hover:text-danger text-xs"
                  >
                    Quitar fase y sus entregables
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
