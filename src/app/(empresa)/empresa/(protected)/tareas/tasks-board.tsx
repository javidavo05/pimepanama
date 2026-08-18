"use client";

import Link from "next/link";
import { useState } from "react";
import type { TaskPriority } from "@prisma/client";
import type { SerializedTask } from "./tasks-view";
import { daysDiff, taskLocalDate, taskLocalEndDate } from "./date-utils";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  HIGH: "bg-red-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-white/20",
};

function dueBadge(task: SerializedTask): { label: string; color: string } | null {
  const local = taskLocalDate(task);
  if (!local) return null;
  const days = daysDiff(local, new Date());
  if (days < 0) return { label: `vencido hace ${Math.abs(days)}d`, color: "text-red-400" };
  if (days === 0) return { label: "vence hoy", color: "text-amber-400" };
  if (days <= 7) return { label: `en ${days}d`, color: "text-amber-400/80" };
  return { label: `en ${days}d`, color: "text-white/50" };
}

function taskLink(task: SerializedTask): { href: string; label: string } | null {
  if (task.document) {
    const base = task.document.type === "FACTURA" ? "facturas" : "cotizaciones";
    return { href: `/empresa/${base}/${task.document.id}`, label: task.document.number ?? task.document.type };
  }
  if (task.paymentScheduleId) {
    return { href: "/empresa/cuentas-por-cobrar", label: "cuota" };
  }
  return null;
}

interface TasksBoardProps {
  tasks: SerializedTask[];
  onPatch: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCreate: (payload: Record<string, unknown>) => Promise<SerializedTask | null>;
}

export function TasksBoard({ tasks, onPatch, onDelete, onCreate }: TasksBoardProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("MEDIUM");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    const allDay = !newTime;
    let dueDate: string | null = null;
    if (newTime) {
      const base = newDueDate ? new Date(`${newDueDate}T00:00:00`) : new Date();
      const [hh, mm] = newTime.split(":").map(Number);
      dueDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm).toISOString();
    } else if (newDueDate) {
      dueDate = newDueDate;
    }
    const task = await onCreate({
      title: newTitle.trim(),
      dueDate,
      allDay,
      assignee: newAssignee.trim() || null,
      priority: newPriority,
    });
    setCreating(false);
    if (task) {
      setNewTitle("");
      setNewDueDate("");
      setNewTime("");
      setNewAssignee("");
      setNewPriority("MEDIUM");
    }
  }

  const open = tasks.filter((t) => !t.completed);
  const completed = tasks
    .filter((t) => t.completed)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  function dueDays(t: SerializedTask): number | null {
    const local = taskLocalDate(t);
    return local ? daysDiff(local, new Date()) : null;
  }

  const groups: { label: string; color: string; items: SerializedTask[] }[] = [
    { label: "Vencidas", color: "text-red-400", items: open.filter((t) => (dueDays(t) ?? 1) < 0) },
    { label: "Hoy", color: "text-amber-400", items: open.filter((t) => dueDays(t) === 0) },
    {
      label: "Próximos 7 días",
      color: "text-[#1AA7F0]",
      items: open.filter((t) => { const d = dueDays(t); return d !== null && d > 0 && d <= 7; }),
    },
    { label: "Más adelante", color: "text-white/60", items: open.filter((t) => (dueDays(t) ?? 0) > 7) },
    { label: "Sin fecha", color: "text-white/50", items: open.filter((t) => !t.dueDate) },
  ].filter((g) => g.items.length > 0);

  function Row({ task }: { task: SerializedTask }) {
    const badge = dueBadge(task);
    const link = taskLink(task);
    return (
      <div className="flex items-center gap-3 px-5 py-3 group">
        <button
          type="button"
          onClick={() => onPatch(task.id, { completed: !task.completed })}
          className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-all ${
            task.completed ? "bg-[#1AA7F0] border-[#1AA7F0]" : "border-white/20 hover:border-[#1AA7F0]"
          }`}
          aria-label={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
        >
          {task.completed && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} title={task.priority} />

        <input
          defaultValue={task.title}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== task.title) onPatch(task.id, { title: v });
            else e.target.value = task.title;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className={`flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-transparent focus:border-white/20 transition-colors truncate ${
            task.completed ? "text-white/55 line-through" : "text-white/80"
          }`}
        />

        {link && (
          <Link href={link.href} className="text-[10px] px-1.5 py-0.5 rounded border border-[#1AA7F0]/25 text-[#1AA7F0]/60 hover:text-[#1AA7F0] shrink-0">
            🧾 {link.label}
          </Link>
        )}

        <input
          list="task-assignees"
          defaultValue={task.assignee ?? ""}
          placeholder="responsable"
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== task.assignee) onPatch(task.id, { assignee: v });
          }}
          className="w-28 shrink-0 bg-transparent text-xs text-white/50 placeholder:text-white/15 outline-none border-b border-transparent focus:border-white/20 transition-colors"
        />

        <input
          type="date"
          defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
          onChange={(e) => {
            if (!e.target.value) {
              onPatch(task.id, { dueDate: null });
              return;
            }
            const [y, m, d] = e.target.value.split("-").map(Number);
            if (task.allDay) {
              onPatch(task.id, { dueDate: e.target.value });
            } else {
              const prev = taskLocalDate(task) ?? new Date();
              const prevEnd = taskLocalEndDate(task);
              const durationMs = prevEnd ? prevEnd.getTime() - prev.getTime() : null;
              const local = new Date(y, m - 1, d, prev.getHours(), prev.getMinutes());
              const patch: Record<string, unknown> = { dueDate: local.toISOString() };
              if (durationMs !== null) patch.endDate = new Date(local.getTime() + durationMs).toISOString();
              onPatch(task.id, patch);
            }
          }}
          className="w-[124px] shrink-0 bg-transparent text-xs text-white/60 outline-none border-b border-transparent focus:border-white/20 transition-colors [color-scheme:dark]"
        />

        {task.dueDate && (
          <input
            type="time"
            defaultValue={!task.allDay ? `${String(taskLocalDate(task)!.getHours()).padStart(2, "0")}:${String(taskLocalDate(task)!.getMinutes()).padStart(2, "0")}` : ""}
            title="Hora de entrega"
            onChange={(e) => {
              const timeVal = e.target.value;
              const base = taskLocalDate(task) ?? new Date();
              if (!timeVal) {
                const dateStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
                onPatch(task.id, { dueDate: dateStr, allDay: true, endDate: null });
                return;
              }
              const [hh, mm] = timeVal.split(":").map(Number);
              const prevEnd = taskLocalEndDate(task);
              const durationMs = !task.allDay && prevEnd ? prevEnd.getTime() - base.getTime() : null;
              const local = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm);
              const patch: Record<string, unknown> = { dueDate: local.toISOString(), allDay: false };
              if (durationMs !== null) patch.endDate = new Date(local.getTime() + durationMs).toISOString();
              onPatch(task.id, patch);
            }}
            className="w-[74px] shrink-0 bg-transparent text-xs text-white/60 outline-none border-b border-transparent focus:border-white/20 transition-colors [color-scheme:dark]"
          />
        )}

        {!task.allDay && task.endDate && (
          <span className="text-[10px] text-white/50 shrink-0 font-mono">
            –{taskLocalEndDate(task)!.toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        {badge && !task.completed && <span className={`text-xs shrink-0 w-24 text-right ${badge.color}`}>{badge.label}</span>}
        {!badge && !task.completed && <span className="w-24 shrink-0" />}

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="text-white/50 hover:text-red-400 text-sm shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          aria-label="Eliminar tarea"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Quick add */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="+ Agregar tarea…"
          className="flex-1 min-w-[180px] bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/25 outline-none focus:border-[#1AA7F0]/40"
        />
        <input
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          list="task-assignees"
          placeholder="Responsable"
          className="w-32 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-[#1AA7F0]/40"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 outline-none focus:border-[#1AA7F0]/40 [color-scheme:dark]"
        />
        <input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          title="Hora de entrega"
          className="w-[90px] bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white/70 outline-none focus:border-[#1AA7F0]/40 [color-scheme:dark]"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
          aria-label="Prioridad"
          className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white/70 outline-none focus:border-[#1AA7F0]/40"
        >
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </select>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newTitle.trim() || creating}
          className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 disabled:hover:bg-[#1AA7F0] text-white text-sm font-semibold rounded-lg transition-all"
        >
          Agregar
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-12 text-center">
          <p className="text-white/60 font-medium">Sin tareas</p>
          <p className="text-white/55 text-sm mt-2">Agrega tu primera tarea arriba.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {open.length === 0 && (
            <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-8 text-center">
              <p className="text-white/60 text-sm">🎉 No hay tareas pendientes</p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label} className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <h2 className={`text-xs uppercase tracking-widest font-medium ${group.color}`}>{group.label}</h2>
                <span className="text-white/55 text-xs font-mono">{group.items.length}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {group.items.map((task) => (
                  <Row key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}

          {completed.length > 0 && (
            <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="w-full px-5 py-3 border-b border-white/[0.05] flex items-center justify-between text-left"
              >
                <h2 className="text-xs uppercase tracking-widest font-medium text-white/50">
                  Completadas {showCompleted ? "▾" : "▸"}
                </h2>
                <span className="text-white/50 text-xs font-mono">{completed.length}</span>
              </button>
              {showCompleted && (
                <div className="divide-y divide-white/[0.04]">
                  {completed.map((task) => (
                    <Row key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
