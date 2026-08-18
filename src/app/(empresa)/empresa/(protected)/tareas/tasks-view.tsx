"use client";

import { useMemo, useState } from "react";
import type { TaskPriority } from "@prisma/client";
import { TasksBoard } from "./tasks-board";
import { TasksCalendar } from "./tasks-calendar";

export interface SerializedTask {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  endDate: string | null;
  allDay: boolean;
  completed: boolean;
  completedAt: string | null;
  documentId: string | null;
  paymentScheduleId: string | null;
  document: { id: string; type: string; number: string | null; clientName: string | null; clientCompany: string | null } | null;
  paymentSchedule: { id: string; description: string; documentId: string } | null;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "list" | "month" | "week" | "day";

const VIEWS: { mode: ViewMode; label: string }[] = [
  { mode: "list", label: "Lista" },
  { mode: "month", label: "Mes" },
  { mode: "week", label: "Semana" },
  { mode: "day", label: "Día" },
];

interface TasksViewProps {
  initialTasks: SerializedTask[];
}

export function TasksView({ initialTasks }: TasksViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<ViewMode>("list");

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) if (t.assignee) set.add(t.assignee);
    return Array.from(set);
  }, [tasks]);

  async function patchTask(id: string, data: Record<string, unknown>) {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === id ? ({ ...t, ...data } as SerializedTask) : t)));
    try {
      const res = await fetch(`/api/empresa/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setTasks(previous);
    }
  }

  async function deleteTask(id: string) {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/empresa/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(previous);
    }
  }

  async function createTask(payload: Record<string, unknown>): Promise<SerializedTask | null> {
    try {
      const res = await fetch("/api/empresa/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const task = await res.json();
      setTasks((prev) => [task, ...prev]);
      return task;
    } catch {
      return null;
    }
  }

  return (
    <div>
      <datalist id="task-assignees">
        {assigneeOptions.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      <div className="inline-flex items-center gap-1 bg-[#0a0a10] border border-white/[0.06] rounded-lg p-1 mb-6">
        {VIEWS.map((v) => (
          <button
            key={v.mode}
            type="button"
            onClick={() => setView(v.mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              view === v.mode ? "bg-[#1AA7F0]/15 text-[#1AA7F0]" : "text-white/60 hover:text-white/70"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <TasksBoard tasks={tasks} onPatch={patchTask} onDelete={deleteTask} onCreate={createTask} />
      ) : (
        <TasksCalendar mode={view} tasks={tasks} onPatch={patchTask} onDelete={deleteTask} onCreate={createTask} />
      )}
    </div>
  );
}
