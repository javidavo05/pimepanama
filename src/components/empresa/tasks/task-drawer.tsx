"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TaskPriority } from "@prisma/client";
import { taskLocalDate } from "./date-utils";
import { useTaskStore } from "./task-store";
import { CheckButton, Icon, ICON, QuickAdd } from "./task-parts";
import { PRIORITY_LABEL, PRIORITY_PILL, type TaskItem } from "./types";

// Sin ancho: al concatenar w-auto sobre w-full, Tailwind no lo sobreescribe.
const FIELD_BASE = "min-h-11 bg-transparent border border-transparent hover:border-line focus:border-brand/40 rounded-lg px-3 text-sm text-fg-soft outline-none transition-colors";
const FIELD = `${FIELD_BASE} w-full`;

function toDateInput(task: TaskItem): string {
  const d = taskLocalDate(task);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInput(task: TaskItem): string {
  const d = taskLocalDate(task);
  if (!d || task.allDay) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function linkOf(task: TaskItem): { href: string; label: string } | null {
  if (task.document) {
    const base = task.document.type === "FACTURA" ? "facturas" : "cotizaciones";
    return { href: `/empresa/${base}/${task.document.id}`, label: task.document.number ?? task.document.type };
  }
  if (task.paymentScheduleId) return { href: "/empresa/cuentas-por-cobrar", label: task.paymentSchedule?.description ?? "Cuota" };
  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[120px_1fr] items-center gap-2">
      <span className="text-xs text-fg-dim">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Panel lateral con el detalle completo de la tarea abierta. */
export function TaskDrawer() {
  const { tasks, openTaskId, openTask } = useTaskStore();
  const task = tasks.find((t) => t.id === openTaskId) ?? null;

  useEffect(() => {
    if (!task) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) openTask(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [task, openTask]);

  if (!task) return null;

  return (
    <>
      {/* theme-ok: velo del panel — oscurece el fondo en ambos temas a propósito */}
      <div className="fixed inset-0 z-40 bg-black/40 lg:bg-black/20" onClick={() => openTask(null)} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Tarea: ${task.title}`}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[560px] bg-panel border-l border-line shadow-2xl flex flex-col"
      >
        {/* key: al cambiar de tarea (subtarea ↔ madre) el formulario arranca limpio */}
        <DrawerBody key={task.id} task={task} />
      </aside>
    </>
  );
}

function DrawerBody({ task }: { task: TaskItem }) {
  const { tasks, projects, openTask, patchTask, toggleComplete, deleteTask } = useTaskStore();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const parent = task.parentId ? tasks.find((t) => t.id === task.parentId) ?? null : null;
  const subtasks = tasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  const project = projects.find((p) => p.id === task.projectId) ?? null;
  const link = linkOf(task);
  const assignees = Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))) as string[];

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Autoajuste del título a su contenido
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  function saveTitle() {
    const v = title.trim();
    if (!v) setTitle(task.title);
    else if (v !== task.title) void patchTask(task.id, { title: v });
  }

  function saveDescription() {
    const v = description.trim() || null;
    if (v !== (task.description ?? null)) void patchTask(task.id, { description: v });
  }

  function setDate(dateStr: string, timeStr: string) {
    if (!dateStr) {
      void patchTask(task.id, { dueDate: null, endDate: null, allDay: true });
      return;
    }
    if (!timeStr) {
      void patchTask(task.id, { dueDate: dateStr, endDate: null, allDay: true });
      return;
    }
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const start = new Date(y, m - 1, d, hh, mm);
    const prevStart = taskLocalDate(task);
    const duration = !task.allDay && task.endDate && prevStart ? new Date(task.endDate).getTime() - prevStart.getTime() : null;
    void patchTask(task.id, {
      dueDate: start.toISOString(),
      endDate: duration ? new Date(start.getTime() + duration).toISOString() : null,
      allDay: false,
    });
  }

  const dateValue = toDateInput(task);
  const timeValue = toTimeInput(task);

  return (
    <>
      {/* Barra superior */}
      <div className="flex items-center gap-2 px-4 sm:px-6 h-14 border-b border-line shrink-0">
        <button
          type="button"
          onClick={() => toggleComplete(task.id)}
          className={`flex items-center gap-2 px-3 min-h-9 rounded-lg border text-sm font-medium transition-colors ${
            task.completed
              ? "bg-ok/10 border-ok/30 text-ok"
              : "border-line text-fg-mute hover:border-ok/50 hover:text-ok"
          }`}
        >
          <Icon d={ICON.check} className="w-4 h-4" />
          {task.completed ? "Completada" : "Marcar como completada"}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label="Eliminar tarea"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-fg-faint hover:text-danger hover:bg-fill transition-colors"
        >
          <Icon d={ICON.trash} />
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={() => openTask(null)}
          aria-label="Cerrar detalle"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg-mute hover:bg-fill transition-colors"
        >
          <Icon d={ICON.close} />
        </button>
      </div>

      {confirmDelete && (
        <div className="px-4 sm:px-6 py-3 bg-danger/[0.06] border-b border-danger/20 flex flex-wrap items-center gap-3 shrink-0">
          <p className="text-sm text-fg-soft flex-1 min-w-48">
            {subtasks.length > 0
              ? `¿Eliminar esta tarea y sus ${subtasks.length} subtarea${subtasks.length !== 1 ? "s" : ""}? No se puede deshacer.`
              : "¿Eliminar esta tarea? No se puede deshacer."}
          </p>
          <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 min-h-9 text-sm text-fg-dim hover:text-fg-mute">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void deleteTask(task.id)}
            className="px-3 min-h-9 text-sm font-semibold rounded-lg bg-danger-solid text-on-brand hover:opacity-90"
          >
            Eliminar tarea
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {parent && (
          <button
            type="button"
            onClick={() => openTask(parent.id)}
            className="flex items-center gap-1 text-xs text-fg-dim hover:text-brand-fg max-w-full"
          >
            <Icon d={ICON.chevronLeft} className="w-3 h-3 shrink-0" />
            <span className="truncate">{parent.title}</span>
          </button>
        )}

        <textarea
          ref={titleRef}
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          aria-label="Título de la tarea"
          className={`w-full resize-none overflow-hidden bg-transparent text-xl font-semibold leading-snug outline-none rounded-lg -mx-3 px-3 py-2 border border-transparent hover:border-line focus:border-brand/40 ${
            task.completed ? "text-fg-dim line-through" : "text-fg"
          }`}
        />

        <div className="space-y-1">
          <Field label="Proyecto">
            {task.parentId ? (
              <p className="px-3 text-sm text-fg-dim">{task.project?.name ?? "Sin proyecto"} · de la tarea madre</p>
            ) : (
              <select
                value={task.projectId ?? ""}
                onChange={(e) => void patchTask(task.id, { projectId: e.target.value || null })}
                className={`${FIELD} appearance-none cursor-pointer`}
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {!task.parentId && project && project.sections.length > 0 && (
            <Field label="Sección">
              <select
                value={task.sectionId ?? ""}
                onChange={(e) => void patchTask(task.id, { sectionId: e.target.value || null })}
                className={`${FIELD} appearance-none cursor-pointer`}
              >
                <option value="">Sin sección</option>
                {project.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Responsable">
            <input
              defaultValue={task.assignee ?? ""}
              list="task-drawer-assignees"
              placeholder="Sin asignar"
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== task.assignee) void patchTask(task.id, { assignee: v });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className={`${FIELD} placeholder:text-fg-faint`}
            />
            <datalist id="task-drawer-assignees">
              {assignees.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>

          <Field label="Entrega">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDate(e.target.value, timeValue)}
                aria-label="Fecha de entrega"
                className={`${FIELD_BASE} ${dateValue ? "" : "text-fg-faint"}`}
              />
              {dateValue && (
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => setDate(dateValue, e.target.value)}
                  aria-label="Hora (opcional)"
                  className={`${FIELD_BASE} ${timeValue ? "" : "text-fg-faint"}`}
                />
              )}
              {dateValue && (
                <button
                  type="button"
                  onClick={() => setDate("", "")}
                  className="px-2 min-h-9 text-xs text-fg-faint hover:text-fg-mute"
                >
                  Quitar fecha
                </button>
              )}
            </div>
          </Field>

          <Field label="Prioridad">
            <div role="radiogroup" aria-label="Prioridad" className="flex gap-2 px-1">
              {(["HIGH", "MEDIUM", "LOW"] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={task.priority === p}
                  onClick={() => task.priority !== p && void patchTask(task.id, { priority: p })}
                  className={`px-3 min-h-9 rounded-lg text-xs font-medium border transition-colors ${
                    task.priority === p ? `${PRIORITY_PILL[p]} border-transparent` : "border-line text-fg-dim hover:text-fg-mute"
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </Field>

          {task.meeting && (
            <Field label="Salió de">
              <Link
                href={`/empresa/reuniones/${task.meeting.id}`}
                className="flex items-center gap-2 px-3 min-h-11 text-sm text-brand-fg hover:underline min-w-0"
              >
                <Icon d={ICON.mic} className="w-4 h-4 shrink-0" />
                <span className="truncate">{task.meeting.title}</span>
                <span className="text-fg-faint shrink-0">
                  · {new Date(task.meeting.meetingDate).toLocaleDateString("es-PA", { day: "numeric", month: "short" })}
                </span>
              </Link>
            </Field>
          )}

          {link && (
            <Field label="Vinculada a">
              <Link href={link.href} className="flex items-center gap-2 px-3 min-h-11 text-sm text-brand-fg hover:underline">
                <Icon d={ICON.link} className="w-4 h-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            </Field>
          )}
        </div>

        <div>
          <label htmlFor="task-description" className="block text-xs text-fg-dim mb-2">
            Descripción
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={Math.min(Math.max(description.split("\n").length + 1, 4), 16)}
            placeholder="¿Qué hay que hacer? Agrega contexto, enlaces o qué significa terminado."
            className="w-full bg-fill border border-line focus:border-brand/40 rounded-lg px-3 py-3 text-sm leading-relaxed text-fg-soft placeholder:text-fg-faint outline-none resize-y"
          />
        </div>

        {!task.parentId && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs text-fg-dim">Subtareas</h3>
              {subtasks.length > 0 && (
                <span className="text-xs text-fg-faint tabular-nums">
                  {subtasks.filter((s) => s.completed).length} de {subtasks.length}
                </span>
              )}
            </div>
            <div className="border border-line rounded-lg overflow-hidden">
              {subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 min-h-11 border-b border-line group">
                  <CheckButton task={s} size="sm" />
                  <button
                    type="button"
                    onClick={() => openTask(s.id)}
                    className={`flex-1 min-w-0 text-left text-sm py-2 break-words ${
                      s.completed ? "text-fg-faint line-through" : "text-fg-soft hover:text-fg"
                    }`}
                  >
                    {s.title}
                  </button>
                  {s.dueDate && (
                    <span className="text-xs text-fg-faint shrink-0">
                      {taskLocalDate(s)!.toLocaleDateString("es-PA", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              ))}
              <QuickAdd defaults={{ parentId: task.id }} placeholder="Agregar subtarea" />
            </div>
          </div>
        )}

        <p className="text-xs text-fg-faint pt-2 border-t border-line">
          Creada el {new Date(task.createdAt).toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric" })}
          {task.completedAt &&
            ` · Completada el ${new Date(task.completedAt).toLocaleDateString("es-PA", { day: "numeric", month: "long" })}`}
        </p>
      </div>
    </>
  );
}
