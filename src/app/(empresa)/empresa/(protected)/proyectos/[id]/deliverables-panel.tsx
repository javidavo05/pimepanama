"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDeliverableAction,
  updateDeliverableAction,
  deleteDeliverableAction,
} from "@/app/(empresa)/empresa/actions";
import { INPUT_CLASS, TEXTAREA_CLASS, toDateInput, type Deliverable, type ProjectPhaseRef } from "./types";
import { fechaCorta } from "@/lib/format-datetime";

interface DeliverablesPanelProps {
  projectId: string;
  deliverables: Deliverable[];
  /** Las fases del proyecto; se crean y editan en «Fases, avance y cobro». */
  phases: ProjectPhaseRef[];
}

type Draft = { name: string; description: string; dueDate: string; phaseId: string };

const NO_PHASE = "";
const smallBtn =
  "inline-flex items-center min-h-11 sm:min-h-8 px-2 sm:px-0 text-fg-faint text-xs sm:text-[10px] transition-colors disabled:opacity-40";

/**
 * Entregables agrupados por fase. Las fases y sus entregables nacen de la
 * propuesta adjunta al crear el proyecto; aquí se corrigen, se agregan y se
 * mueven de fase. Borrar una fase deja sus entregables «sin fase».
 */
export function DeliverablesPanel({ projectId, deliverables, phases }: DeliverablesPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Formulario abierto: nuevo en una fase (addingTo) o edición de uno (editingId).
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", description: "", dueDate: "", phaseId: NO_PHASE });

  const done = deliverables.filter((d) => d.completed).length;
  const phaseIds = new Set(phases.map((p) => p.id));
  const unphased = deliverables.filter((d) => !d.phaseId || !phaseIds.has(d.phaseId));
  const groups: { phase: ProjectPhaseRef | null; items: Deliverable[] }[] = [
    ...phases.map((p) => ({ phase: p, items: deliverables.filter((d) => d.phaseId === p.id) })),
    ...(unphased.length > 0 || phases.length === 0 ? [{ phase: null, items: unphased }] : []),
  ];
  // Abierta de entrada: la primera fase con algo pendiente.
  const firstOpen = groups.find((g) => g.items.some((d) => !d.completed))?.phase?.id ?? NO_PHASE;

  function run(fn: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        after?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el entregable");
      }
    });
  }

  function close() {
    setAddingTo(null);
    setEditingId(null);
    setError(null);
  }

  function startAdd(phaseId: string) {
    close();
    setDraft({ name: "", description: "", dueDate: "", phaseId });
    setAddingTo(phaseId);
  }

  function startEdit(d: Deliverable) {
    close();
    setDraft({
      name: d.name,
      description: d.description ?? "",
      dueDate: toDateInput(d.dueDate),
      phaseId: d.phaseId && phaseIds.has(d.phaseId) ? d.phaseId : NO_PHASE,
    });
    setEditingId(d.id);
  }

  function submit() {
    if (!draft.name.trim()) {
      setError("El entregable necesita un nombre.");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      dueDate: draft.dueDate || null,
      phaseId: draft.phaseId || null,
    };
    if (editingId) {
      run(() => updateDeliverableAction(editingId, payload), () => setEditingId(null));
    } else {
      run(() => createDeliverableAction(projectId, payload), () => setAddingTo(null));
    }
  }

  const draftForm = (
    <div className="px-4 sm:px-6 py-4 space-y-2 bg-fill">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-2">
        <input
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Nombre del entregable"
          aria-label="Nombre del entregable"
          className={INPUT_CLASS}
        />
        <input
          type="date"
          aria-label="Fecha de entrega"
          value={draft.dueDate}
          onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
          className={INPUT_CLASS}
        />
      </div>
      <textarea
        rows={3}
        value={draft.description}
        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        placeholder="Detalle (opcional)"
        aria-label="Detalle del entregable"
        className={TEXTAREA_CLASS}
      />
      {phases.length > 0 && (
        <select
          aria-label="Fase"
          value={draft.phaseId}
          onChange={(e) => setDraft((d) => ({ ...d, phaseId: e.target.value }))}
          className={INPUT_CLASS}
        >
          {phases.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value={NO_PHASE}>Sin fase</option>
        </select>
      )}
      {/* En el celular, Cancelar y Guardar en columnas iguales a lo ancho. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={close}
          className="min-h-11 sm:min-h-8 rounded-lg border border-line sm:border-0 text-fg-faint hover:text-fg-soft text-sm sm:text-xs transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="min-h-11 sm:min-h-8 px-3 py-2 rounded-lg bg-brand/10 border border-brand/25 text-brand-fg text-sm sm:text-xs font-medium hover:bg-brand/15 disabled:opacity-40 transition-all"
        >
          {pending ? "Guardando..." : editingId ? "Guardar entregable" : "Agregar entregable"}
        </button>
      </div>
    </div>
  );

  function row(d: Deliverable) {
    if (editingId === d.id) return <div key={d.id}>{draftForm}</div>;
    return (
      <div key={d.id} className="flex flex-wrap sm:flex-nowrap items-start gap-x-3 px-4 sm:px-6 py-3 group">
        <button
          type="button"
          aria-label={d.completed ? "Marcar pendiente" : "Marcar completado"}
          onClick={() => run(() => updateDeliverableAction(d.id, { completed: !d.completed }))}
          disabled={pending}
          // El pseudo-elemento agranda el área de toque a 48 px en el celular sin mover la casilla.
          className={`relative before:absolute before:-inset-4 before:content-[''] sm:before:hidden mt-0.5 w-4 h-4 rounded border shrink-0 text-[10px] leading-none transition-all disabled:opacity-40 ${
            d.completed
              ? "bg-ok/20 border-ok/40 text-ok"
              : "border-line-loud text-transparent hover:border-line-loud"
          }`}
        >
          ✓
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm break-words ${d.completed ? "text-fg-ghost line-through" : "text-fg-soft"}`}>
            {d.name}
          </p>
          {d.description && (
            <p className="text-fg-faint text-xs mt-1 whitespace-pre-wrap break-words">{d.description}</p>
          )}
          {(d.dueDate || d.source === "AI_CONTRACT") && (
            <div className="flex items-center gap-2 mt-1">
              {d.dueDate && <span className="text-fg-faint text-[11px]">{fechaCorta(d.dueDate)}</span>}
              {d.source === "AI_CONTRACT" && (
                <span className="text-[9px] uppercase tracking-widest text-iris-fg">del documento</span>
              )}
            </div>
          )}
        </div>
        {/* Sin hover en el celular: las acciones quedan visibles ahí, en su propia
            línea debajo del texto para no angostar la descripción. */}
        <div className="flex w-full sm:w-auto pl-5 sm:pl-0 items-center gap-1 sm:gap-2 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
          <button type="button" onClick={() => startEdit(d)} className={`${smallBtn} hover:text-brand-fg`}>
            editar
          </button>
          <button
            type="button"
            onClick={() => run(() => deleteDeliverableAction(d.id))}
            disabled={pending}
            className={`${smallBtn} hover:text-danger`}
          >
            eliminar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-line rounded-xl overflow-hidden">
      <div className="px-4 sm:px-6 py-2 sm:py-4 border-b border-line flex items-center justify-between gap-3">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">
          {phases.length > 0 ? "Entregables por fase" : "Entregables"}
        </h3>
        {deliverables.length > 0 && (
          <span className="text-fg-faint text-xs font-mono">{done}/{deliverables.length}</span>
        )}
      </div>

      {error && <div className="px-4 sm:px-6 pt-3 text-danger text-xs" role="alert">{error}</div>}

      {deliverables.length === 0 && phases.length === 0 && addingTo === null ? (
        <div className="px-4 sm:px-6 py-6 text-center">
          <p className="text-fg-dim text-sm">Sin entregables definidos</p>
          <p className="text-fg-faint text-xs mt-1">
            Anota lo concreto que se compromete a entregar. Si divides el proyecto en fases, aquí se agrupan.
          </p>
          <button
            type="button"
            onClick={() => startAdd(NO_PHASE)}
            className="mt-3 inline-flex items-center justify-center min-h-11 sm:min-h-8 px-3 rounded-lg bg-brand/10 border border-brand/25 text-brand-fg text-xs font-medium hover:bg-brand/15"
          >
            Agregar el primer entregable
          </button>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {groups.map(({ phase, items }) => {
            const key = phase?.id ?? NO_PHASE;
            const doneHere = items.filter((d) => d.completed).length;
            return (
              <details key={key} open={key === firstOpen || groups.length === 1} className="group/phase">
                <summary className="flex items-center gap-3 min-h-11 px-4 sm:px-6 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-fill">
                  <span className="text-fg-ghost text-xs transition-transform group-open/phase:rotate-90" aria-hidden>▸</span>
                  <span className="flex-1 min-w-0 text-fg-soft text-sm font-medium break-words">
                    {phase?.name ?? "Sin fase"}
                  </span>
                  <span className="shrink-0 text-fg-faint text-xs font-mono">{doneHere}/{items.length}</span>
                </summary>
                <div className="divide-y divide-line border-t border-line">
                  {items.length === 0 && addingTo !== key && (
                    <p className="px-4 sm:px-6 py-3 text-fg-ghost text-xs">Esta fase todavía no tiene entregables.</p>
                  )}
                  {items.map(row)}
                  {addingTo === key && draftForm}
                  {addingTo !== key && (
                    <div className="px-4 sm:px-6 py-1">
                      <button type="button" onClick={() => startAdd(key)} className={`${smallBtn} text-brand-fg`}>
                        + entregable
                      </button>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
