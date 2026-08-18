"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TaskLite {
  id: string;
  title: string;
  dueDate: string | null;
  assignee: string | null;
}

interface ArTaskActionsProps {
  documentId: string | null;
  paymentScheduleId: string | null;
  defaultTitle: string;
  initialTasks: TaskLite[];
}

export function ArTaskActions({ documentId, paymentScheduleId, defaultTitle, initialTasks }: ArTaskActionsProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    function positionPopover() {
      const rect = buttonRef.current!.getBoundingClientRect();
      const width = 256;
      const margin = 8;
      let left = rect.right - width;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      const top = rect.bottom + margin;
      setPopoverStyle({ top, left });
    }

    positionPopover();
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function completeTask(id: string) {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/empresa/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(previous);
    }
  }

  async function createTask() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/empresa/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || null,
          assignee: assignee.trim() || null,
          documentId,
          paymentScheduleId,
        }),
      });
      if (!res.ok) throw new Error();
      const task = await res.json();
      setTasks((prev) => [...prev, { id: task.id, title: task.title, dueDate: task.dueDate, assignee: task.assignee }]);
      setOpen(false);
      setDueDate("");
      setAssignee("");
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  const popover = open ? (
    <div
      ref={popoverRef}
      className="fixed z-[100] w-64 bg-[#0d0d18] border border-white/[0.1] rounded-xl shadow-2xl p-3 space-y-2"
      style={{ top: popoverStyle.top, left: popoverStyle.left }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título de la tarea"
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white/85 placeholder:text-white/25 outline-none focus:border-[#1AA7F0]/40"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none focus:border-[#1AA7F0]/40 [color-scheme:dark]"
        />
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="Responsable"
          className="w-24 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-[#1AA7F0]/40"
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Link href="/empresa/tareas" className="text-[10px] text-white/50 hover:text-white/70">
          Ver todas →
        </Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-white/60 hover:text-white/70 px-2 py-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={createTask}
            disabled={!title.trim() || saving}
            className="px-3 py-1 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative flex items-center gap-1.5 shrink-0">
      {tasks.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => completeTask(t.id)}
          title={`Marcar "${t.title}" como completada`}
          className="text-[10px] px-1.5 py-0.5 rounded border border-[#6344E8]/30 text-[#8B6FFF] hover:bg-[#6344E8]/10 transition-colors"
        >
          ✓ {t.title.length > 18 ? `${t.title.slice(0, 18)}…` : t.title}
        </button>
      ))}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Agregar tarea de seguimiento"
        className="w-5 h-5 flex items-center justify-center rounded border border-white/[0.1] text-white/55 hover:text-[#1AA7F0] hover:border-[#1AA7F0]/40 text-xs transition-colors"
      >
        +
      </button>

      {typeof document !== "undefined" && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
