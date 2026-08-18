"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TaskPriority } from "@prisma/client";
import type { SerializedTask } from "./tasks-view";
import { addDays, allDayISO, mondayOf, sameDay, startOfDay, taskLocalDate, taskLocalEndDate, timedISO } from "./date-utils";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  HIGH: "bg-red-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-white/20",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = 48;
const DEFAULT_DURATION_MIN = 60;
const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type PopoverState =
  | { kind: "create"; date: Date; hour: number | null }
  | { kind: "edit"; task: SerializedTask };

interface TasksCalendarProps {
  mode: "month" | "week" | "day";
  tasks: SerializedTask[];
  onPatch: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCreate: (payload: Record<string, unknown>) => Promise<SerializedTask | null>;
}

export function TasksCalendar({ mode, tasks, onPatch, onDelete, onCreate }: TasksCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "month" && scrollRef.current) {
      scrollRef.current.scrollTop = 7 * ROW_HEIGHT;
    }
  }, [mode]);

  function goPrev() {
    if (mode === "month") setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    else if (mode === "week") setCursor((c) => addDays(c, -7));
    else setCursor((c) => addDays(c, -1));
  }
  function goNext() {
    if (mode === "month") setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    else if (mode === "week") setCursor((c) => addDays(c, 7));
    else setCursor((c) => addDays(c, 1));
  }
  function goToday() {
    setCursor(startOfDay(new Date()));
  }

  const monthDays = useMemo(() => {
    if (mode !== "month") return [];
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = mondayOf(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [mode, cursor]);

  const weekDays = useMemo(() => {
    if (mode === "day") return [startOfDay(cursor)];
    if (mode === "week") return Array.from({ length: 7 }, (_, i) => addDays(mondayOf(cursor), i));
    return [];
  }, [mode, cursor]);

  const headerLabel =
    mode === "month"
      ? capitalize(cursor.toLocaleDateString("es-PA", { month: "long", year: "numeric" }))
      : mode === "week"
        ? `${weekDays[0].toLocaleDateString("es-PA", { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" })}`
        : capitalize(cursor.toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));

  function tasksOnDay(day: Date): SerializedTask[] {
    return tasks
      .filter((t) => {
        const local = taskLocalDate(t);
        return local && sameDay(local, day);
      })
      .sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        const da = taskLocalDate(a)!;
        const db = taskLocalDate(b)!;
        return da.getTime() - db.getTime();
      });
  }

  function handleDropOnDay(e: React.DragEvent, day: Date) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.allDay) {
      onPatch(id, { dueDate: allDayISO(day) });
      return;
    }
    const local = taskLocalDate(task)!;
    const end = taskLocalEndDate(task);
    const durationMs = end ? end.getTime() - local.getTime() : null;
    const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), local.getHours(), local.getMinutes());
    const patch: Record<string, unknown> = { dueDate: timedISO(newStart) };
    if (durationMs !== null) patch.endDate = timedISO(new Date(newStart.getTime() + durationMs));
    onPatch(id, patch);
  }

  function handleDropOnHour(e: React.DragEvent, day: Date, hour: number) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const local = taskLocalDate(task);
    const end = taskLocalEndDate(task);
    const durationMs = local && end ? end.getTime() - local.getTime() : DEFAULT_DURATION_MIN * 60000;
    const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0);
    onPatch(id, {
      dueDate: timedISO(newStart),
      endDate: timedISO(new Date(newStart.getTime() + durationMs)),
      allDay: false,
    });
  }

  function handleDropOnAllDayRow(e: React.DragEvent, day: Date) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    onPatch(id, { dueDate: allDayISO(day), allDay: true, endDate: null });
  }

  function TaskChip({ task, compact, block }: { task: SerializedTask; compact?: boolean; block?: boolean }) {
    const local = taskLocalDate(task);
    const end = taskLocalEndDate(task);
    const timeLabel =
      !task.allDay && local
        ? `${fmtTime(local)}${end ? `–${fmtTime(end)}` : ""}`
        : null;

    if (block) {
      return (
        <button
          type="button"
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
          onClick={(e) => {
            e.stopPropagation();
            setPopover({ kind: "edit", task });
          }}
          className={`w-full h-full text-left flex flex-col gap-0.5 px-1.5 py-1 rounded border overflow-hidden transition-colors ${
            task.completed
              ? "border-white/[0.06] text-white/50 line-through"
              : "border-[#1AA7F0]/20 bg-[#1AA7F0]/[0.08] text-white/70 hover:border-[#1AA7F0]/40"
          } text-[10px]`}
        >
          <span className="flex items-center gap-1 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
            {timeLabel && <span className="font-mono text-white/55 shrink-0">{timeLabel}</span>}
          </span>
          <span className="truncate leading-tight">{task.title}</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
        onClick={(e) => {
          e.stopPropagation();
          setPopover({ kind: "edit", task });
        }}
        className={`w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
          task.completed
            ? "border-white/[0.06] text-white/50 line-through"
            : "border-[#1AA7F0]/20 bg-[#1AA7F0]/[0.06] text-white/70 hover:border-[#1AA7F0]/40"
        } ${compact ? "text-[10px]" : "text-xs"}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
        {timeLabel && <span className="font-mono text-white/55 shrink-0">{timeLabel}</span>}
        <span className="truncate">{task.title}</span>
      </button>
    );
  }

  function PopoverForm({ popover }: { popover: PopoverState }) {
    const isEdit = popover.kind === "edit";
    const task = isEdit ? popover.task : null;
    const initialLocal = task ? taskLocalDate(task) : null;
    const initialLocalEnd = task ? taskLocalEndDate(task) : null;
    const initialDate = isEdit ? (initialLocal ?? startOfDay(new Date())) : popover.date;
    const initialAllDay = isEdit ? task!.allDay : popover.hour === null;
    const initialStartTime = isEdit
      ? initialLocal && !task!.allDay
        ? fmtTime(initialLocal)
        : "09:00"
      : popover.hour !== null
        ? `${String(popover.hour).padStart(2, "0")}:00`
        : "09:00";
    const initialEndTime = isEdit && initialLocalEnd && !task!.allDay ? fmtTime(initialLocalEnd) : addMinutesToTime(initialStartTime, DEFAULT_DURATION_MIN);

    const [title, setTitle] = useState(task?.title ?? "");
    const [assignee, setAssignee] = useState(task?.assignee ?? "");
    const [allDay, setAllDay] = useState(initialAllDay);
    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState(initialEndTime);
    const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "MEDIUM");
    const [saving, setSaving] = useState(false);

    function buildDueDate(): string {
      if (allDay) return allDayISO(initialDate);
      const [hh, mm] = startTime.split(":").map(Number);
      return timedISO(new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), hh, mm));
    }

    function buildEndDate(): string | null {
      if (allDay) return null;
      const [shh, smm] = startTime.split(":").map(Number);
      let [ehh, emm] = endTime.split(":").map(Number);
      if (ehh * 60 + emm <= shh * 60 + smm) {
        const bumped = shh * 60 + smm + 30;
        ehh = Math.floor(bumped / 60);
        emm = bumped % 60;
      }
      return timedISO(new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), ehh, emm));
    }

    async function handleSave() {
      if (!title.trim() || saving) return;
      setSaving(true);
      const payload = {
        title: title.trim(),
        assignee: assignee.trim() || null,
        priority,
        allDay,
        dueDate: buildDueDate(),
        endDate: buildEndDate(),
      };
      if (isEdit) {
        onPatch(task!.id, payload);
      } else {
        await onCreate(payload);
      }
      setSaving(false);
      setPopover(null);
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPopover(null)}>
        <div
          className="w-full max-w-sm bg-[#0d0d18] border border-white/[0.1] rounded-xl shadow-2xl p-4 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <p className="text-white/70 text-sm font-medium">{isEdit ? "Editar tarea" : "Nueva tarea"}</p>
            <span className="text-white/50 text-xs">
              {initialDate.toLocaleDateString("es-PA", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>

          {isEdit && (
            <button
              type="button"
              onClick={() => {
                onPatch(task!.id, { completed: !task!.completed });
                setPopover(null);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                task!.completed ? "border-[#1AA7F0]/30 text-[#1AA7F0] bg-[#1AA7F0]/10" : "border-white/[0.08] text-white/50 hover:border-white/20"
              }`}
            >
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${task!.completed ? "bg-[#1AA7F0] border-[#1AA7F0]" : "border-white/20"}`}>
                {task!.completed && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {task!.completed ? "Completada" : "Marcar como completada"}
            </button>
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la tarea"
            autoFocus
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/85 placeholder:text-white/25 outline-none focus:border-[#1AA7F0]/40"
          />

          <div className="flex items-center gap-2">
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              list="task-assignees"
              placeholder="Responsable"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/25 outline-none focus:border-[#1AA7F0]/40"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Prioridad"
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white/70 outline-none focus:border-[#1AA7F0]/40"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-white/50">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-[#1AA7F0]" />
            Todo el día
          </label>
          {!allDay && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-white/60">
                Desde
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none focus:border-[#1AA7F0]/40 [color-scheme:dark]"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-white/60">
                Hasta
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none focus:border-[#1AA7F0]/40 [color-scheme:dark]"
                />
              </label>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {isEdit ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(task!.id);
                  setPopover(null);
                }}
                className="text-red-400/70 hover:text-red-400 text-xs px-2 py-1"
              >
                Eliminar
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setPopover(null)} className="text-xs text-white/60 hover:text-white/70 px-2 py-1">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="px-3 py-1.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
              >
                {isEdit ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20">
            ‹
          </button>
          <button type="button" onClick={goToday} className="px-3 py-1 rounded-lg border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 text-xs">
            Hoy
          </button>
          <button type="button" onClick={goNext} className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20">
            ›
          </button>
        </div>
        <p className="text-white/70 text-sm font-medium capitalize">{headerLabel}</p>
      </div>

      {mode === "month" && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/[0.05]">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[10px] uppercase tracking-widest text-white/50 font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const dayTasks = tasksOnDay(day);
              const isCurrentMonth = day.getMonth() === cursor.getMonth();
              const isToday = sameDay(day, new Date());
              const visible = dayTasks.slice(0, 3);
              const overflow = dayTasks.length - visible.length;
              return (
                <div
                  key={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnDay(e, day)}
                  onClick={() => setPopover({ kind: "create", date: day, hour: null })}
                  className={`min-h-[104px] border-b border-r border-white/[0.04] p-1.5 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                    isCurrentMonth ? "" : "opacity-30"
                  }`}
                >
                  <p className={`text-xs mb-1 ${isToday ? "w-5 h-5 flex items-center justify-center rounded-full bg-[#1AA7F0] text-white font-semibold" : "text-white/60"}`}>
                    {day.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {visible.map((t) => (
                      <TaskChip key={t.id} task={t} compact />
                    ))}
                    {overflow > 0 && <p className="text-[10px] text-white/50 px-1.5">+{overflow} más</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(mode === "week" || mode === "day") && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className={`grid border-b border-white/[0.05]`} style={{ gridTemplateColumns: `56px repeat(${weekDays.length}, 1fr)` }}>
            <div />
            {weekDays.map((day) => (
              <div key={day.toISOString()} className={`px-2 py-2 text-center border-l border-white/[0.04] ${sameDay(day, new Date()) ? "bg-[#1AA7F0]/[0.06]" : ""}`}>
                <p className="text-[10px] uppercase tracking-widest text-white/50">{day.toLocaleDateString("es-PA", { weekday: "short" })}</p>
                <p className={`text-sm mt-0.5 ${sameDay(day, new Date()) ? "text-[#1AA7F0] font-semibold" : "text-white/60"}`}>{day.getDate()}</p>
              </div>
            ))}
          </div>

          <div className={`grid border-b border-white/[0.05]`} style={{ gridTemplateColumns: `56px repeat(${weekDays.length}, 1fr)` }}>
            <div className="px-2 py-1.5 text-[9px] text-white/50 text-right">todo el día</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnAllDayRow(e, day)}
                onClick={() => setPopover({ kind: "create", date: day, hour: null })}
                className="min-h-[32px] border-l border-white/[0.04] p-1 space-y-0.5 cursor-pointer hover:bg-white/[0.02]"
              >
                {tasksOnDay(day)
                  .filter((t) => t.allDay)
                  .map((t) => (
                    <TaskChip key={t.id} task={t} compact />
                  ))}
              </div>
            ))}
          </div>

          <div ref={scrollRef} className="overflow-y-auto max-h-[70vh]">
            <div className="grid" style={{ gridTemplateColumns: `56px repeat(${weekDays.length}, 1fr)` }}>
              <div>
                {HOURS.map((h) => (
                  <div key={h} style={{ height: ROW_HEIGHT }} className="text-[10px] text-white/50 text-right pr-2 -translate-y-2">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="relative border-l border-white/[0.04]">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnHour(e, day, h)}
                      onClick={() => setPopover({ kind: "create", date: day, hour: h })}
                      style={{ height: ROW_HEIGHT }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                    />
                  ))}
                  {tasksOnDay(day)
                    .filter((t) => !t.allDay)
                    .map((t) => {
                      const local = taskLocalDate(t)!;
                      const end = taskLocalEndDate(t);
                      const top = local.getHours() * ROW_HEIGHT + (local.getMinutes() / 60) * ROW_HEIGHT;
                      const durationMin = end ? Math.max((end.getTime() - local.getTime()) / 60000, 15) : 30;
                      const height = (durationMin / 60) * ROW_HEIGHT;
                      return (
                        <div key={t.id} className="absolute left-0.5 right-0.5 z-10" style={{ top, height }}>
                          <TaskChip task={t} compact block />
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {popover && <PopoverForm popover={popover} />}
    </div>
  );
}
