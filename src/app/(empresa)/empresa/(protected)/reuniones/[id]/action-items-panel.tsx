"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedMeetingActionItem } from "@/lib/meetings/types";
import { KIND_COLOR, KIND_LABEL, PRIORITY_LABEL } from "../status";

const KINDS = ["TECNICO", "COMERCIAL", "ADMINISTRATIVO", "DECISION", "RIESGO"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

interface Draft {
  title: string;
  detail: string;
  kind: (typeof KINDS)[number];
  priority: (typeof PRIORITIES)[number];
  owner: string;
  dueDate: string;
  acceptance: string;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  detail: "",
  kind: "TECNICO",
  priority: "MEDIUM",
  owner: "",
  dueDate: "",
  acceptance: "",
};

function draftFrom(item: SerializedMeetingActionItem): Draft {
  return {
    title: item.title,
    detail: item.detail ?? "",
    kind: item.kind as Draft["kind"],
    priority: item.priority as Draft["priority"],
    owner: item.owner ?? "",
    dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
    acceptance: item.acceptance.join("\n"),
  };
}

function payloadFrom(draft: Draft) {
  return {
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    kind: draft.kind,
    priority: draft.priority,
    owner: draft.owner.trim(),
    dueDate: draft.dueDate || null,
    acceptance: draft.acceptance
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean),
  };
}

/**
 * Formulario de un pendiente. Vive fuera del panel a propósito: definido dentro,
 * React lo trataría como un componente nuevo en cada render y el campo perdería
 * el foco a cada tecla.
 */
function DraftForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
      <div className="space-y-2.5">
        <input
          autoFocus
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Qué hay que hacer, en imperativo"
          className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
        />
        <textarea
          value={draft.detail}
          onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
          rows={3}
          placeholder="Detalle y contexto de la reunión que lo justifica"
          className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none leading-relaxed"
        />
        <textarea
          value={draft.acceptance}
          onChange={(e) => setDraft((d) => ({ ...d, acceptance: e.target.value }))}
          rows={2}
          placeholder="Criterios de aceptación, uno por línea"
          className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none leading-relaxed"
        />
        <div className="grid sm:grid-cols-4 gap-2">
          <select
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as Draft["kind"] }))}
            className="bg-[#050508] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-xs focus:border-[#1AA7F0]/50 focus:outline-none"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <select
            value={draft.priority}
            onChange={(e) =>
              setDraft((d) => ({ ...d, priority: e.target.value as Draft["priority"] }))
            }
            className="bg-[#050508] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-xs focus:border-[#1AA7F0]/50 focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                Prioridad {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <input
            value={draft.owner}
            onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
            placeholder="Responsable"
            className="bg-[#050508] border border-white/[0.08] rounded-lg px-2.5 py-2 text-white text-xs placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
          />
          <input
            type="date"
            value={draft.dueDate}
            onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
            className="bg-[#050508] border border-white/[0.08] rounded-lg px-2.5 py-2 text-white text-xs focus:border-[#1AA7F0]/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-1.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
}

interface ActionItemsPanelProps {
  meetingId: string;
  items: SerializedMeetingActionItem[];
  onItemsChange: (items: SerializedMeetingActionItem[]) => void;
  hasProject: boolean;
}

/**
 * Los pendientes de la reunión: los que sacó la IA y los que se agregan a mano.
 *
 * Poder corregirlos es la diferencia entre una lista que se usa y una que se
 * ignora: la IA se equivoca de responsable, parte un encargo en dos o se salta
 * algo que se dijo al final. Un pendiente que ya se pasó a Tareas queda
 * bloqueado — editarlo aquí no cambiaría la tarea y las dos versiones se irían
 * separando.
 */
export function ActionItemsPanel({
  meetingId,
  items,
  onItemsChange,
  hasProject,
}: ActionItemsPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(() =>
    items.filter((i) => !i.taskId).map((i) => i.id)
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unsynced = items.filter((i) => !i.taskId);

  function reset() {
    setEditing(null);
    setCreating(false);
    setDraft(EMPTY_DRAFT);
  }

  async function create() {
    if (!draft.title.trim()) {
      setError("El pendiente necesita un título.");
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFrom(draft)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el pendiente");
      onItemsChange([...items, data]);
      setSelected((prev) => [...prev, data.id]);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pendiente");
    } finally {
      setBusy(null);
    }
  }

  async function save(itemId: string) {
    if (!draft.title.trim()) {
      setError("El pendiente necesita un título.");
      return;
    }
    setBusy(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/action-items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, ...payloadFrom(draft) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      onItemsChange(items.map((i) => (i.id === itemId ? data : i)));
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  }

  async function remove(itemId: string) {
    setBusy(itemId);
    setError(null);
    try {
      const res = await fetch(
        `/api/empresa/meetings/${meetingId}/action-items?itemId=${itemId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo borrar");
      }
      onItemsChange(items.filter((i) => i.id !== itemId));
      setSelected((prev) => prev.filter((id) => id !== itemId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar");
    } finally {
      setBusy(null);
    }
  }

  async function syncTasks(asDeliverables: boolean) {
    if (selected.length === 0) {
      setError("Selecciona al menos un pendiente.");
      return;
    }
    setBusy("sync");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/sync-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selected, asDeliverables }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error creando tareas");
      onItemsChange(data.actionItems);
      setSelected([]);
      setMessage(
        `${data.created} tarea${data.created !== 1 ? "s" : ""} creada${data.created !== 1 ? "s" : ""}${
          asDeliverables ? " y agregadas como entregables del proyecto" : ""
        }.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando tareas");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && !creating && (
        <p className="text-white/40 text-sm">
          No hay pendientes. Corre la etapa «Pendientes» para extraerlos de la reunión, o agrega uno
          a mano.
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const isSelected = selected.includes(item.id);
          if (editing === item.id) {
            return (
              <div key={item.id} className="border border-[#1AA7F0]/30 rounded-xl p-4">
                <DraftForm
                  draft={draft}
                  setDraft={setDraft}
                  onSave={() => void save(item.id)}
                  onCancel={reset}
                  saving={busy === item.id}
                />
              </div>
            );
          }
          return (
            <div
              key={item.id}
              className={`border rounded-xl p-4 transition-all ${
                item.taskId
                  ? "border-green-500/20 bg-green-500/[0.03]"
                  : isSelected
                    ? "border-[#1AA7F0]/30 bg-[#1AA7F0]/[0.04]"
                    : "border-white/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                {!item.taskId && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                      )
                    }
                    className="mt-1 accent-[#1AA7F0]"
                    aria-label={`Seleccionar ${item.title}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 text-[10px] rounded border ${KIND_COLOR[item.kind]}`}>
                      {KIND_LABEL[item.kind]}
                    </span>
                    <span className="text-white/40 text-[10px]">
                      Prioridad {PRIORITY_LABEL[item.priority]}
                    </span>
                    {item.taskId && <span className="text-green-400 text-[10px]">✓ En tareas</span>}
                  </div>
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  {item.detail && (
                    <p className="text-white/60 text-xs mt-1 leading-relaxed">{item.detail}</p>
                  )}
                  {item.acceptance.length > 0 && (
                    <div className="mt-2">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
                        Criterios de aceptación
                      </p>
                      <ul className="space-y-0.5">
                        {item.acceptance.map((a, i) => (
                          <li key={i} className="text-white/60 text-xs flex gap-1.5">
                            <span className="text-[#1AA7F0]/50">✓</span>
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-3 flex-wrap mt-2 text-[11px] text-white/40">
                    {item.owner && <span>👤 {item.owner}</span>}
                    {item.dueDate && (
                      <span>📅 {new Date(item.dueDate).toLocaleDateString("es-PA")}</span>
                    )}
                    {item.estimateHours && <span>⏱ {item.estimateHours} h</span>}
                    {item.touchpoints.length > 0 && <span>🧩 {item.touchpoints.join(", ")}</span>}
                  </div>
                </div>

                {!item.taskId && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setCreating(false);
                        setEditing(item.id);
                        setDraft(draftFrom(item));
                      }}
                      className="text-white/30 hover:text-[#1AA7F0] text-xs transition-colors px-1"
                      aria-label={`Editar ${item.title}`}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => void remove(item.id)}
                      disabled={busy === item.id}
                      className="text-white/30 hover:text-red-400 text-xs transition-colors px-1"
                      aria-label={`Borrar ${item.title}`}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {creating ? (
        <div className="border border-[#1AA7F0]/30 rounded-xl p-4">
          <DraftForm
            draft={draft}
            setDraft={setDraft}
            onSave={() => void create()}
            onCancel={reset}
            saving={busy === "create"}
          />
        </div>
      ) : (
        <button
          onClick={() => {
            setEditing(null);
            setDraft(EMPTY_DRAFT);
            setCreating(true);
          }}
          className="text-[#1AA7F0] hover:text-[#0E87C8] text-sm transition-colors"
        >
          + Agregar pendiente a mano
        </button>
      )}

      {unsynced.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
          <button
            onClick={() => void syncTasks(false)}
            disabled={busy !== null || selected.length === 0}
            className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {busy === "sync" ? "Creando…" : `✅ Pasar ${selected.length} a Tareas`}
          </button>
          {hasProject && (
            <button
              onClick={() => void syncTasks(true)}
              disabled={busy !== null || selected.length === 0}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all"
            >
              + también como entregables del proyecto
            </button>
          )}
        </div>
      )}

      {message && <p className="text-green-400 text-xs">{message}</p>}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
