"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDeliverableAction,
  updateDeliverableAction,
  deleteDeliverableAction,
} from "@/app/(empresa)/empresa/actions";
import { INPUT_CLASS, TEXTAREA_CLASS, toDateInput, type Deliverable } from "./types";

interface DeliverablesPanelProps {
  projectId: string;
  deliverables: Deliverable[];
}

export function DeliverablesPanel({ projectId, deliverables }: DeliverablesPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "", dueDate: "" });

  const done = deliverables.filter((d) => d.completed).length;

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

  function startAdd() {
    setEditingId(null);
    setDraft({ name: "", description: "", dueDate: "" });
    setAdding(true);
  }

  function startEdit(d: Deliverable) {
    setAdding(false);
    setDraft({
      name: d.name,
      description: d.description ?? "",
      dueDate: toDateInput(d.dueDate),
    });
    setEditingId(d.id);
  }

  function submitDraft() {
    if (!draft.name.trim()) {
      setError("El entregable necesita un nombre.");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      dueDate: draft.dueDate || null,
    };
    if (editingId) {
      run(() => updateDeliverableAction(editingId, payload), () => setEditingId(null));
    } else {
      run(() => createDeliverableAction(projectId, payload), () => setAdding(false));
    }
  }

  const draftForm = (
    <div className="px-5 py-4 space-y-2 bg-fill">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-2">
        <input
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Nombre del entregable"
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
        rows={2}
        value={draft.description}
        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        placeholder="Detalle (opcional)"
        className={TEXTAREA_CLASS}
      />
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => { setAdding(false); setEditingId(null); setError(null); }}
          className="text-fg-faint hover:text-fg-soft text-xs transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submitDraft}
          disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/25 text-brand-fg text-xs font-medium hover:bg-brand/15 disabled:opacity-40 transition-all"
        >
          {pending ? "Guardando..." : editingId ? "Guardar" : "Agregar"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-panel border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Entregables</h3>
        <div className="flex items-center gap-3">
          {deliverables.length > 0 && (
            <span className="text-fg-faint text-xs font-mono">{done}/{deliverables.length}</span>
          )}
          <button
            type="button"
            onClick={startAdd}
            className="text-brand-fg/60 text-[10px] hover:text-brand-fg transition-colors"
          >
            + agregar
          </button>
        </div>
      </div>

      {error && <div className="px-5 pt-3 text-danger text-xs">{error}</div>}

      {deliverables.length === 0 && !adding ? (
        <div className="px-5 py-6 text-fg-faint text-sm text-center">
          Sin entregables definidos
        </div>
      ) : (
        <div className="divide-y divide-line">
          {deliverables.map((d) =>
            editingId === d.id ? (
              <div key={d.id}>{draftForm}</div>
            ) : (
              <div key={d.id} className="flex items-start gap-3 px-5 py-3 group">
                <button
                  type="button"
                  aria-label={d.completed ? "Marcar pendiente" : "Marcar completado"}
                  onClick={() => run(() => updateDeliverableAction(d.id, { completed: !d.completed }))}
                  disabled={pending}
                  className={`mt-0.5 w-4 h-4 rounded border shrink-0 text-[10px] leading-none transition-all disabled:opacity-40 ${
                    d.completed
                      ? "bg-green-500/20 border-green-500/40 text-ok"
                      : "border-line-loud text-transparent hover:border-line-loud"
                  }`}
                >
                  ✓
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${d.completed ? "text-fg-ghost line-through" : "text-fg-soft"}`}>
                    {d.name}
                  </p>
                  {d.description && (
                    <p className="text-fg-faint text-xs mt-0.5 whitespace-pre-wrap">{d.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {d.dueDate && (
                      <span className="text-fg-faint text-[11px]">
                        {new Date(d.dueDate).toLocaleDateString("es-PA")}
                      </span>
                    )}
                    {d.source === "AI_CONTRACT" && (
                      <span className="text-[9px] uppercase tracking-widest text-iris/70">del contrato</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEdit(d)}
                    className="text-fg-faint hover:text-brand-fg text-[10px] transition-colors"
                  >
                    editar
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => deleteDeliverableAction(d.id))}
                    disabled={pending}
                    className="text-fg-faint hover:text-danger text-[10px] transition-colors disabled:opacity-40"
                  >
                    eliminar
                  </button>
                </div>
              </div>
            )
          )}
          {adding && draftForm}
        </div>
      )}
    </div>
  );
}
