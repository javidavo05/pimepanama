"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedMeetingActionItem } from "@/lib/meetings/types";
import { useTaskStore } from "@/components/empresa/tasks/task-store";
import { Icon, ICON, QuickAdd, TaskListHeader, TaskRow } from "@/components/empresa/tasks/task-parts";
import { KIND_COLOR, KIND_LABEL, PRIORITY_LABEL } from "../status";

const KINDS = ["TECNICO", "COMERCIAL", "ADMINISTRATIVO", "DECISION", "RIESGO"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
/** Una decisión o un riesgo se registran, no se "hacen": no se preseleccionan como tarea. */
const NOT_A_TODO = new Set(["DECISION", "RIESGO"]);
/** Valor centinela del select de proyecto: abre el campo para crear uno ahí mismo. */
const NEW_PROJECT = "__new__";

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

const INPUT =
  "w-full bg-canvas border border-line rounded-lg px-3 min-h-11 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none";

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
  saveLabel,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
}) {
  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        placeholder="Qué hay que hacer, en imperativo"
        aria-label="Título del pendiente"
        className={INPUT}
      />
      <textarea
        value={draft.detail}
        onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
        rows={3}
        placeholder="Detalle y contexto de la reunión que lo justifica"
        aria-label="Detalle"
        className={`${INPUT} py-3 leading-relaxed`}
      />
      <textarea
        value={draft.acceptance}
        onChange={(e) => setDraft((d) => ({ ...d, acceptance: e.target.value }))}
        rows={2}
        placeholder="Criterios de aceptación, uno por línea"
        aria-label="Criterios de aceptación"
        className={`${INPUT} py-3 leading-relaxed`}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select
          value={draft.kind}
          onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as Draft["kind"] }))}
          aria-label="Tipo"
          className={INPUT}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={draft.priority}
          onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as Draft["priority"] }))}
          aria-label="Prioridad"
          className={INPUT}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              Prioridad {PRIORITY_LABEL[p].toLowerCase()}
            </option>
          ))}
        </select>
        <input
          value={draft.owner}
          onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
          placeholder="Responsable"
          aria-label="Responsable"
          className={INPUT}
        />
        <input
          type="date"
          value={draft.dueDate}
          onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
          aria-label="Fecha de entrega"
          className={INPUT}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 min-h-11 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-sm font-semibold rounded-lg transition-colors"
        >
          {saving ? "Guardando…" : saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-4 min-h-11 bg-fill hover:bg-fill-2 border border-line text-fg-mute text-sm rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ title, count, aside }: { title: string; count?: number; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-fg text-sm font-semibold">{title}</h3>
      {count !== undefined && <span className="text-fg-faint text-xs tabular-nums">{count}</span>}
      <div className="flex-1" />
      {aside}
    </div>
  );
}

interface ActionItemsPanelProps {
  meetingId: string;
  meetingTitle: string;
  clientId: string | null;
  items: SerializedMeetingActionItem[];
  onItemsChange: (items: SerializedMeetingActionItem[]) => void;
  project: { id: string; name: string } | null;
  /** Todos los proyectos, para sugerir uno cuando la reunión no tiene */
  projectOptions: { id: string; name: string; clientId: string | null }[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Adivina el proyecto de una reunión sin proyecto: el único proyecto de su
 * cliente, o el proyecto cuyo nombre aparece en el título ("meet holo" →
 * HOLO REALTY). Si no hay una sola coincidencia clara, no sugiere nada.
 */
function guessProject(
  title: string,
  clientId: string | null,
  options: { id: string; name: string; clientId: string | null }[],
): string {
  if (clientId) {
    const byClient = options.filter((p) => p.clientId === clientId);
    if (byClient.length === 1) return byClient[0].id;
  }
  const words = new Set(normalize(title).split(/[^a-z0-9]+/).filter((w) => w.length >= 3));
  const byName = options.filter((p) =>
    normalize(p.name)
      .split(/[^a-z0-9]+/)
      .some((w) => w.length >= 3 && words.has(w)),
  );
  return byName.length === 1 ? byName[0].id : "";
}

/**
 * Los pendientes de la reunión y lo que pasó con ellos.
 *
 * Arriba lo que falta revisar (lo que sacó la IA y lo agregado a mano), con la
 * acción de convertirlo en tareas del proyecto. Debajo, las tareas que ya
 * salieron de esta reunión con su estado real — se completan desde aquí — y lo
 * que sigue abierto en el proyecto, para repasarlo en la próxima llamada.
 *
 * Un pendiente que ya es tarea no se edita aquí: se edita la tarea. Tener dos
 * versiones que se van separando es peor que no poder corregir.
 */
export function ActionItemsPanel({
  meetingId,
  meetingTitle,
  clientId,
  items,
  onItemsChange,
  project,
  projectOptions,
}: ActionItemsPanelProps) {
  const router = useRouter();
  const { tasks, projects, mergeTasks } = useTaskStore();
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // Un pendiente cuya tarea se borró vuelve a quedar por revisar.
  const isLinked = (i: SerializedMeetingActionItem) => Boolean(i.taskId && taskById.has(i.taskId));
  const pending = items.filter((i) => !isLinked(i));
  const linkedTasks = items.filter(isLinked).map((i) => taskById.get(i.taskId!)!);
  const linkedDone = linkedTasks.filter((t) => t.completed).length;
  const linkedIds = new Set(linkedTasks.map((t) => t.id));
  const otherOpen = project
    ? tasks
        .filter((t) => t.projectId === project.id && !t.parentId && !t.completed && !linkedIds.has(t.id))
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    : [];

  // Sin proyecto, la barra propone uno; al crear las tareas la reunión queda asignada.
  const [targetProjectId, setTargetProjectId] = useState(() =>
    project ? project.id : guessProject(meetingTitle, clientId, projectOptions),
  );
  // Proyectos creados desde aquí, hasta que el refresh los traiga en projectOptions.
  const [createdProjects, setCreatedProjects] = useState<ActionItemsPanelProps["projectOptions"]>([]);
  const allProjectOptions = [
    ...createdProjects.filter((c) => !projectOptions.some((p) => p.id === c.id)),
    ...projectOptions,
  ];
  const target = project ?? allProjectOptions.find((p) => p.id === targetProjectId) ?? null;
  const [newProjectName, setNewProjectName] = useState<string | null>(null);
  const sections = projects.find((p) => p.id === target?.id)?.sections ?? [];

  const [selected, setSelected] = useState<string[]>(() =>
    items.filter((i) => !i.taskId && !NOT_A_TODO.has(i.kind)).map((i) => i.id)
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [criteriaAsSubtasks, setCriteriaAsSubtasks] = useState(true);
  const [asDeliverables, setAsDeliverables] = useState(false);
  const [showOtherOpen, setShowOtherOpen] = useState(false);

  const selectedPending = pending.filter((i) => selected.includes(i.id));
  const selectedWithCriteria = selectedPending.filter((i) => i.acceptance.length > 0).length;
  const allSelected = pending.length > 0 && selectedPending.length === pending.length;

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
      const res = await fetch(`/api/empresa/meetings/${meetingId}/action-items?itemId=${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo borrar");
      }
      onItemsChange(items.filter((i) => i.id !== itemId));
      setSelected((prev) => prev.filter((id) => id !== itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar");
    } finally {
      setBusy(null);
    }
  }

  async function createProject() {
    const name = newProjectName?.trim();
    if (!name) {
      setError("El proyecto necesita un nombre.");
      return;
    }
    setBusy("project");
    setError(null);
    try {
      const res = await fetch("/api/empresa/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error ?? "No se pudo crear el proyecto");
      setCreatedProjects((prev) => [{ id: data.id, name: data.name, clientId }, ...prev]);
      setTargetProjectId(data.id);
      setSectionId("");
      setNewProjectName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el proyecto");
    } finally {
      setBusy(null);
    }
  }

  async function syncTasks() {
    if (selectedPending.length === 0) return;
    setBusy("sync");
    setError(null);
    setMessage(null);
    try {
      if (!project && target) {
        const assign = await fetch(`/api/empresa/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: target.id }),
        });
        if (!assign.ok) throw new Error(`No se pudo asignar la reunión a ${target.name}`);
      }
      const res = await fetch(`/api/empresa/meetings/${meetingId}/sync-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: selectedPending.map((i) => i.id),
          asDeliverables: asDeliverables && target !== null,
          sectionId: sectionId || null,
          criteriaAsSubtasks,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudieron crear las tareas");
      mergeTasks(data.tasks ?? []);
      onItemsChange(data.actionItems);
      setSelected([]);
      setMessage(
        `${data.created} tarea${data.created !== 1 ? "s" : ""} creada${data.created !== 1 ? "s" : ""}${
          target ? ` en ${target.name}` : ""
        }${asDeliverables && target ? ", también como entregables" : ""}.`
      );
      // La cuenta de la lista de reuniones y del proyecto cambió
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron crear las tareas");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {items.length > 0 && (
        <p className="text-fg-dim text-sm">
          {items.length} pendiente{items.length !== 1 ? "s" : ""}
          {pending.length > 0 && ` · ${pending.length} por revisar`}
          {linkedTasks.length > 0 && ` · ${linkedDone} de ${linkedTasks.length} tareas hechas`}
        </p>
      )}

      {/* ── Por revisar ─────────────────────────────────────────────── */}
      <section>
        {(pending.length > 0 || items.length === 0) && (
          <SectionTitle
            title="Por revisar"
            count={pending.length}
            aside={
              pending.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelected(allSelected ? [] : pending.map((i) => i.id))}
                  className="px-3 min-h-9 text-xs text-fg-dim hover:text-fg-mute rounded-lg hover:bg-fill"
                >
                  {allSelected ? "Quitar selección" : "Seleccionar todos"}
                </button>
              )
            }
          />
        )}

        {items.length === 0 && !creating && (
          <p className="text-fg-dim text-sm mb-4 leading-relaxed">
            Todavía no hay pendientes. Corre la etapa «Pendientes» para que la IA los saque de la conversación, o agrega uno a mano.
          </p>
        )}

        <div className="space-y-3">
          {pending.map((item) => {
            const isSelected = selected.includes(item.id);
            if (editing === item.id) {
              return (
                <div key={item.id} className="border border-brand/30 rounded-xl p-4">
                  <DraftForm
                    draft={draft}
                    setDraft={setDraft}
                    onSave={() => void save(item.id)}
                    onCancel={reset}
                    saving={busy === item.id}
                    saveLabel="Guardar cambios"
                  />
                </div>
              );
            }
            return (
              <div
                key={item.id}
                className={`border rounded-xl p-4 transition-colors ${
                  isSelected ? "border-brand/30 bg-brand/[0.04]" : "border-line"
                }`}
              >
                <div className="flex items-start gap-3">
                  <label className="-m-3 p-3 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        setSelected((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                      }
                      className="w-4 h-4 accent-brand"
                      aria-label={`Convertir en tarea: ${item.title}`}
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-1 text-[11px] leading-none rounded border ${KIND_COLOR[item.kind]}`}>
                        {KIND_LABEL[item.kind]}
                      </span>
                      {item.priority === "HIGH" && (
                        <span className="px-2 py-1 text-[11px] leading-none rounded bg-danger/10 text-danger">Alta</span>
                      )}
                    </div>
                    <p className="text-fg text-sm font-medium break-words">{item.title}</p>
                    {item.detail && <p className="text-fg-dim text-sm mt-1 leading-relaxed break-words">{item.detail}</p>}
                    {item.acceptance.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {item.acceptance.map((a, i) => (
                          <li key={i} className="text-fg-dim text-xs flex gap-2">
                            <Icon d={ICON.check} className="w-3 h-3 text-brand-fg shrink-0 mt-px" />
                            <span className="break-words">{a}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(item.owner || item.dueDate || item.estimateHours || item.touchpoints.length > 0) && (
                      <p className="mt-2 text-xs text-fg-faint break-words">
                        {[
                          item.owner,
                          item.dueDate &&
                            new Date(item.dueDate).toLocaleDateString("es-PA", { day: "numeric", month: "short" }),
                          item.estimateHours && `${item.estimateHours} h estimadas`,
                          item.touchpoints.length > 0 && `Toca ${item.touchpoints.join(", ")}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 -my-2 -mr-2">
                    <button
                      onClick={() => {
                        setCreating(false);
                        setEditing(item.id);
                        setDraft(draftFrom(item));
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-fg-faint hover:text-brand-fg hover:bg-fill transition-colors"
                      aria-label={`Editar ${item.title}`}
                    >
                      <Icon d={ICON.pencil} />
                    </button>
                    <button
                      onClick={() => void remove(item.id)}
                      disabled={busy === item.id}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-fg-faint hover:text-danger hover:bg-fill transition-colors disabled:opacity-40"
                      aria-label={`Borrar ${item.title}`}
                    >
                      <Icon d={ICON.trash} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          {creating ? (
            <div className="border border-brand/30 rounded-xl p-4">
              <DraftForm
                draft={draft}
                setDraft={setDraft}
                onSave={() => void create()}
                onCancel={reset}
                saving={busy === "create"}
                saveLabel="Agregar pendiente"
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY_DRAFT);
                setCreating(true);
              }}
              className="flex items-center gap-2 px-3 min-h-11 text-sm text-fg-dim hover:text-fg-mute rounded-lg hover:bg-fill transition-colors"
            >
              <Icon d={ICON.plus} />
              Agregar pendiente a mano
            </button>
          )}
        </div>

        {/* Barra de conversión: queda a la vista mientras se recorre la lista */}
        {pending.length > 0 && (
          <div className="sticky bottom-4 mt-4 z-10 bg-pop border border-line-mid rounded-xl p-4 shadow-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void syncTasks()}
                disabled={busy !== null || selectedPending.length === 0}
                className="px-4 min-h-11 bg-brand hover:bg-brand-hi disabled:opacity-40 disabled:hover:bg-brand text-on-brand text-sm font-semibold rounded-lg transition-colors"
              >
                {busy === "sync"
                  ? "Creando tareas…"
                  : selectedPending.length === 0
                    ? "Selecciona pendientes"
                    : `Crear ${selectedPending.length} tarea${selectedPending.length !== 1 ? "s" : ""}${target ? ` en ${target.name}` : ""}`}
              </button>
              {!project && newProjectName === null && (
                <select
                  value={targetProjectId}
                  onChange={(e) => {
                    if (e.target.value === NEW_PROJECT) {
                      setNewProjectName(meetingTitle);
                      return;
                    }
                    setTargetProjectId(e.target.value);
                    setSectionId("");
                  }}
                  aria-label="Proyecto de las tareas"
                  className="min-h-11 bg-fill border border-line rounded-lg px-3 text-sm text-fg-mute outline-none focus:border-brand/40 max-w-full"
                >
                  <option value="">Sin proyecto (tareas sueltas)</option>
                  {allProjectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value={NEW_PROJECT}>+ Nuevo proyecto…</option>
                </select>
              )}
              {!project && newProjectName !== null && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void createProject();
                  }}
                  className="flex flex-wrap items-center gap-2 max-w-full"
                >
                  <input
                    autoFocus
                    onFocus={(e) => e.currentTarget.select()}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setNewProjectName(null);
                    }}
                    placeholder="Nombre del proyecto"
                    aria-label="Nombre del proyecto nuevo"
                    className="min-h-11 w-64 max-w-full bg-fill border border-line rounded-lg px-3 text-sm text-fg placeholder:text-fg-trace outline-none focus:border-brand/40"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null || !newProjectName.trim()}
                    className="px-4 min-h-11 border border-line-mid hover:bg-fill disabled:opacity-40 text-fg text-sm font-semibold rounded-lg transition-colors"
                  >
                    {busy === "project" ? "Creando proyecto…" : "Crear proyecto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProjectName(null)}
                    disabled={busy === "project"}
                    className="px-3 min-h-11 text-sm text-fg-dim hover:text-fg-mute rounded-lg hover:bg-fill"
                  >
                    Cancelar
                  </button>
                </form>
              )}
              {target && sections.length > 0 && (
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  aria-label="Sección del proyecto"
                  className="min-h-11 bg-fill border border-line rounded-lg px-3 text-sm text-fg-mute outline-none focus:border-brand/40 max-w-full"
                >
                  <option value="">Sin sección</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {selectedWithCriteria > 0 && (
                <label className="flex items-center gap-2 min-h-9 text-sm text-fg-mute cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criteriaAsSubtasks}
                    onChange={(e) => setCriteriaAsSubtasks(e.target.checked)}
                    className="w-4 h-4 accent-brand"
                  />
                  Criterios de aceptación como subtareas
                </label>
              )}
              {target && (
                <label className="flex items-center gap-2 min-h-9 text-sm text-fg-mute cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asDeliverables}
                    onChange={(e) => setAsDeliverables(e.target.checked)}
                    className="w-4 h-4 accent-brand"
                  />
                  También como entregables del proyecto
                </label>
              )}
            </div>
            {!project && (
              <p className={`text-xs leading-relaxed ${target ? "text-fg-dim" : "text-warn"}`}>
                {target
                  ? `La reunión también quedará asignada a ${target.name}: sus próximas reuniones recordarán esta.`
                  : "Sin proyecto, las tareas quedan sueltas y la reunión no suma contexto a ningún proyecto."}
              </p>
            )}
          </div>
        )}

        {message && <p className="text-ok text-sm mt-3" role="status">{message}</p>}
        {error && <p className="text-danger text-sm mt-3" role="alert">{error}</p>}
      </section>

      {/* ── Tareas que salieron de esta reunión ─────────────────────── */}
      {linkedTasks.length > 0 && (
        <section>
          <SectionTitle
            title="Tareas de esta reunión"
            count={linkedTasks.length}
            aside={
              project && (
                <Link
                  href={`/empresa/proyectos/${project.id}`}
                  className="flex items-center gap-1 px-3 min-h-9 text-xs text-fg-dim hover:text-fg-mute rounded-lg hover:bg-fill"
                >
                  Ver en el proyecto
                  <Icon d={ICON.chevronRight} className="w-3 h-3" />
                </Link>
              )
            }
          />
          <div className="border border-line rounded-xl overflow-hidden">
            <TaskListHeader />
            {linkedTasks.map((t) => (
              <TaskRow key={t.id} task={t} showMeeting={false} showProject={!project} />
            ))}
          </div>
        </section>
      )}

      {/* ── Lo que sigue abierto en el proyecto ─────────────────────── */}
      {project && (
        <section>
          <button
            type="button"
            onClick={() => setShowOtherOpen((v) => !v)}
            aria-expanded={showOtherOpen}
            className="w-full flex items-center gap-2 min-h-11 text-left"
          >
            <Icon d={showOtherOpen ? ICON.chevronDown : ICON.chevronRight} className="w-4 h-4 text-fg-faint" />
            <span className="text-fg text-sm font-semibold">Abierto en {project.name}</span>
            <span className="text-fg-faint text-xs tabular-nums">{otherOpen.length}</span>
          </button>
          {showOtherOpen && (
            <>
              <p className="text-fg-dim text-sm mb-3 leading-relaxed">
                Lo que sigue pendiente del proyecto y no salió de esta reunión. Sirve para repasarlo en la llamada y cerrar lo que ya está.
              </p>
              <div className="border border-line rounded-xl overflow-hidden">
                {otherOpen.length > 0 ? (
                  <>
                    <TaskListHeader />
                    {otherOpen.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </>
                ) : (
                  <p className="px-4 py-6 text-sm text-fg-dim text-center">No hay nada más abierto en el proyecto.</p>
                )}
                <div className="border-t border-line">
                  <QuickAdd defaults={{ projectId: project.id }} placeholder={`Agregar tarea a ${project.name}`} />
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
