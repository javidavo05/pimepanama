"use client";

import { useEffect, useRef, useState } from "react";
import { daysDiff, taskLocalDate } from "./date-utils";
import { useTaskStore } from "./task-store";
import { PRIORITY_LABEL, PRIORITY_PILL, type TaskFilter, type TaskItem } from "./types";

// ─── Iconos (outline, trazo 2, 16 px) ────────────────────────────────────────

export function Icon({ d, className = "w-4 h-4" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export const ICON = {
  check: "M5 13l4 4L19 7",
  plus: "M12 5v14M5 12h14",
  close: "M6 18L18 6M6 6l12 12",
  chevronDown: "M19 9l-7 7-7-7",
  chevronRight: "M9 5l7 7-7 7",
  chevronLeft: "M15 19l-7-7 7-7",
  subtasks: "M4 6h16M4 12h10M4 18h6",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16",
  calendar: "M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  pencil: "M15.232 5.232l3.536 3.536M4 20h4L18.5 9.5a2.5 2.5 0 00-3.536-3.536L4 16.5V20z",
  link: "M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m6.656-3.328a4 4 0 015.656 0 4 4 0 010 5.656l-1.5 1.5",
  list: "M4 6h16M4 12h16M4 18h16",
  board: "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v11h-4z",
  mic: "M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm7-3a7 7 0 01-14 0m7 7v3",
};

// ─── Check de completar ──────────────────────────────────────────────────────

export function CheckButton({ task, size = "md" }: { task: TaskItem; size?: "sm" | "md" }) {
  const { toggleComplete } = useTaskStore();
  const dim = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    // El botón mide 44 px para el dedo; el círculo visible es de 20 px.
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleComplete(task.id);
      }}
      className="-m-3 p-3 shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand group/check"
      aria-label={task.completed ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`}
      aria-pressed={task.completed}
    >
      <span
        className={`${dim} rounded-full border flex items-center justify-center transition-all duration-200 motion-safe:active:scale-90 ${
          task.completed
            ? "bg-ok-solid border-ok-solid text-on-brand"
            : "border-line-loud text-transparent group-hover/check:border-ok group-hover/check:text-ok"
        }`}
      >
        <Icon d={ICON.check} className={size === "sm" ? "w-2 h-2" : "w-3 h-3"} />
      </span>
    </button>
  );
}

// ─── Fecha de entrega ────────────────────────────────────────────────────────

export function dueInfo(task: Pick<TaskItem, "dueDate" | "allDay" | "completed">): { label: string; tone: string } | null {
  const local = taskLocalDate(task);
  if (!local) return null;
  const days = daysDiff(local, new Date());
  const time = task.allDay ? "" : ` ${local.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit" })}`;
  let label: string;
  if (days === 0) label = `Hoy${time}`;
  else if (days === 1) label = `Mañana${time}`;
  else if (days === -1) label = `Ayer${time}`;
  else if (days > 1 && days < 7) label = local.toLocaleDateString("es-PA", { weekday: "long" }) + time;
  else
    label = local.toLocaleDateString("es-PA", {
      day: "numeric",
      month: "short",
      ...(local.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
    });
  label = label.charAt(0).toUpperCase() + label.slice(1);
  if (task.completed) return { label, tone: "text-fg-faint" };
  if (days < 0) return { label, tone: "text-danger" };
  if (days <= 1) return { label, tone: "text-ok" };
  return { label, tone: "text-fg-dim" };
}

export function AssigneeAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      className="w-6 h-6 rounded-full bg-fill-2 border border-line text-fg-mute text-[10px] font-semibold flex items-center justify-center shrink-0"
      title={name}
    >
      {initials || "?"}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: TaskItem["priority"] }) {
  return (
    <span className={`px-2 py-1 rounded text-[11px] font-medium leading-none ${PRIORITY_PILL[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

// ─── Fila de tarea ───────────────────────────────────────────────────────────

export function TaskRow({
  task,
  showProject = false,
  showMeeting = true,
}: {
  task: TaskItem;
  showProject?: boolean;
  /** Dentro de la propia reunión el origen sobra */
  showMeeting?: boolean;
}) {
  const { tasks, openTask, openTaskId } = useTaskStore();
  const subtasks = tasks.filter((t) => t.parentId === task.id);
  const doneSubtasks = subtasks.filter((t) => t.completed).length;
  const due = dueInfo(task);
  const selected = openTaskId === task.id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTask(task.id);
        }
      }}
      className={`group flex items-center gap-3 px-4 min-h-12 py-2 border-b border-line last:border-b-0 cursor-pointer transition-colors outline-none focus-visible:bg-fill ${
        selected ? "bg-brand/[0.06]" : "hover:bg-fill"
      }`}
    >
      <CheckButton task={task} />

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug break-words line-clamp-2 transition-colors ${
            task.completed ? "text-fg-faint line-through" : "text-fg-soft"
          }`}
        >
          {task.title}
        </p>
        {/* Meta en móvil y datos secundarios */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 empty:hidden text-xs">
          {showProject && task.project && (
            <span className="text-fg-dim truncate max-w-48">{task.project.name}</span>
          )}
          {showMeeting && task.meeting && (
            <span className="flex items-center gap-1 text-fg-faint min-w-0" title={`Salió de la reunión «${task.meeting.title}»`}>
              <Icon d={ICON.mic} className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-40">{task.meeting.title}</span>
            </span>
          )}
          {subtasks.length > 0 && (
            <span className="flex items-center gap-1 text-fg-faint" title="Subtareas completadas">
              <Icon d={ICON.subtasks} className="w-3 h-3" />
              {doneSubtasks}/{subtasks.length}
            </span>
          )}
          {task.description && (
            <span className="text-fg-faint md:hidden truncate max-w-48">{task.description.split("\n")[0]}</span>
          )}
          {due && <span className={`md:hidden ${due.tone}`}>{due.label}</span>}
          {task.priority === "HIGH" && !task.completed && (
            <span className="md:hidden">
              <PriorityPill priority="HIGH" />
            </span>
          )}
        </div>
      </div>

      {/* Columnas en escritorio */}
      <div className="hidden md:flex items-center gap-3 w-32 shrink-0 min-w-0">
        {task.assignee ? (
          <>
            <AssigneeAvatar name={task.assignee} />
            <span className="text-xs text-fg-dim truncate">{task.assignee}</span>
          </>
        ) : (
          <span className="text-xs text-fg-ghost">—</span>
        )}
      </div>
      <div className={`hidden md:block w-28 shrink-0 text-xs truncate ${due?.tone ?? "text-fg-ghost"}`}>
        {due?.label ?? "—"}
      </div>
      <div className="hidden md:block w-16 shrink-0">
        {!task.completed && <PriorityPill priority={task.priority} />}
      </div>
      <Icon d={ICON.chevronRight} className="w-4 h-4 text-fg-ghost group-hover:text-fg-faint shrink-0 transition-colors" />
    </div>
  );
}

export function TaskListHeader() {
  return (
    <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-line text-[11px] uppercase tracking-wider text-fg-faint">
      <span className="w-5 shrink-0" />
      <span className="flex-1">Tarea</span>
      <span className="w-32 shrink-0">Responsable</span>
      <span className="w-28 shrink-0">Entrega</span>
      <span className="w-16 shrink-0">Prioridad</span>
      <span className="w-4 shrink-0" />
    </div>
  );
}

// ─── Agregar tarea en línea ──────────────────────────────────────────────────

export function QuickAdd({
  defaults,
  placeholder = "Agregar tarea",
  autoFocus = false,
  className = "",
}: {
  defaults: Record<string, unknown>;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const { createTask } = useTaskStore();
  const [active, setActive] = useState(autoFocus);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  function submit() {
    const value = title.trim();
    if (!value) return;
    // La fila aparece al instante (optimista); el campo queda libre y con el
    // foco para escribir la siguiente, como en una lista.
    setTitle("");
    void createTask({ title: value, ...defaults });
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className={`w-full flex items-center gap-3 px-4 min-h-12 text-sm text-fg-faint hover:text-fg-mute hover:bg-fill transition-colors text-left ${className}`}
      >
        <Icon d={ICON.plus} className="w-4 h-4 shrink-0" />
        {placeholder}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 min-h-12 ${className}`}>
      <span className="w-5 h-5 rounded-full border border-dashed border-line-loud shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setTitle("");
            setActive(false);
          }
        }}
        onBlur={() => {
          if (title.trim()) submit();
          setActive(false);
        }}
        placeholder="Escribe la tarea y pulsa Enter"
        aria-label={placeholder}
        className="flex-1 min-w-0 bg-transparent text-sm text-fg placeholder:text-fg-trace outline-none py-3"
      />
      {title.trim() && (
        <span className="text-[11px] text-fg-faint shrink-0 hidden sm:inline">Enter para guardar</span>
      )}
    </div>
  );
}

// ─── Controles de la barra ───────────────────────────────────────────────────

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1 bg-panel border border-line rounded-lg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 min-h-8 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            value === o.value ? "bg-fill-2 text-fg" : "text-fg-dim hover:text-fg-mute"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 text-fg-faint tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function FilterControl({ value, onChange }: { value: TaskFilter; onChange: (v: TaskFilter) => void }) {
  return (
    <Segmented
      label="Mostrar tareas"
      value={value}
      onChange={onChange}
      options={[
        { value: "open", label: "Pendientes" },
        { value: "done", label: "Completadas" },
        { value: "all", label: "Todas" },
      ]}
    />
  );
}

// ─── Aviso inferior (completada / error) ─────────────────────────────────────

export function TaskToast() {
  const { notice, dismissNotice } = useTaskStore();

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismissNotice, notice.tone === "error" ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [notice, dismissNotice]);

  if (!notice) return null;
  return (
    <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[60] flex justify-center pointer-events-none">
      <div
        key={notice.id}
        role={notice.tone === "error" ? "alert" : "status"}
        className={`pointer-events-auto flex items-center gap-4 pl-4 pr-2 py-2 rounded-xl border shadow-2xl bg-pop max-w-md ${
          notice.tone === "error" ? "border-danger/40" : "border-line-mid"
        }`}
      >
        <p className={`text-sm min-w-0 truncate ${notice.tone === "error" ? "text-danger" : "text-fg-soft"}`}>{notice.message}</p>
        {notice.action && (
          <button
            type="button"
            onClick={() => {
              notice.action!.run();
              dismissNotice();
            }}
            className="px-3 min-h-8 text-sm font-semibold text-brand-fg hover:bg-fill rounded-lg shrink-0"
          >
            {notice.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={dismissNotice}
          aria-label="Cerrar aviso"
          className="w-8 h-8 flex items-center justify-center text-fg-faint hover:text-fg-mute rounded-lg shrink-0"
        >
          <Icon d={ICON.close} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
