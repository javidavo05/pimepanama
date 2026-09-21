"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { daysDiff, taskLocalDate } from "./date-utils";
import { byOrder, useTaskStore, visibleTasks } from "./task-store";
import { FilterControl, Icon, ICON, QuickAdd, Segmented, TaskListHeader, TaskRow } from "./task-parts";
import type { TaskFilter, TaskItem } from "./types";

type GroupBy = "project" | "date";

// Una preferencia por pantalla: /tareas arranca por fecha, Proyectos por proyecto
const groupKey = (fallback: GroupBy) => `pime:tasks-group-by:${fallback}`;

interface Group {
  key: string;
  title: string;
  tone?: string;
  href?: string;
  defaults?: Record<string, unknown>;
  items: TaskItem[];
}

function byDue(a: TaskItem, b: TaskItem) {
  const da = taskLocalDate(a)?.getTime() ?? Infinity;
  const db = taskLocalDate(b)?.getTime() ?? Infinity;
  return da - db || byOrder(a, b);
}

/** Todas las tareas, agrupadas por proyecto o por fecha de entrega. */
export function TaskOverview({ defaultGroupBy = "project" }: { defaultGroupBy?: GroupBy }) {
  const { tasks, projects, completedThisVisit, createTask } = useTaskStore();
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [groupBy, setGroupBy] = useState<GroupBy>(defaultGroupBy);
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(groupKey(defaultGroupBy));
      if (saved === "project" || saved === "date") setGroupBy(saved);
    } catch {}
  }, []);

  function changeGroup(v: GroupBy) {
    setGroupBy(v);
    try {
      localStorage.setItem(groupKey(defaultGroupBy), v);
    } catch {}
  }

  function add() {
    const title = newTitle.trim();
    if (!title) return;
    // El proyecto elegido se queda: lo normal es cargar varias del mismo.
    setNewTitle("");
    void createTask({ title, projectId: newProject || null });
  }

  const shown = visibleTasks(tasks, filter, completedThisVisit);
  const openTotal = tasks.filter((t) => !t.parentId && !t.completed).length;

  let groups: Group[];
  if (groupBy === "project") {
    const projectGroups: Group[] = projects
      .map((p) => ({
        key: p.id,
        title: p.name,
        href: `/empresa/proyectos/${p.id}`,
        defaults: { projectId: p.id },
        items: shown.filter((t) => t.projectId === p.id).sort(byDue),
      }))
      .filter((g) => g.items.length > 0);
    const loose = shown.filter((t) => !t.projectId || !projects.some((p) => p.id === t.projectId)).sort(byDue);
    groups = [...projectGroups, ...(loose.length > 0 ? [{ key: "none", title: "Sin proyecto", defaults: { projectId: null }, items: loose }] : [])];
  } else {
    const now = new Date();
    const days = (t: TaskItem) => {
      const d = taskLocalDate(t);
      return d ? daysDiff(d, now) : null;
    };
    const sorted = [...shown].sort(byDue);
    groups = [
      { key: "overdue", title: "Vencidas", tone: "text-danger", items: sorted.filter((t) => (days(t) ?? 1) < 0) },
      { key: "today", title: "Hoy", tone: "text-ok", items: sorted.filter((t) => days(t) === 0) },
      { key: "week", title: "Próximos 7 días", items: sorted.filter((t) => { const d = days(t); return d !== null && d > 0 && d <= 7; }) },
      { key: "later", title: "Más adelante", items: sorted.filter((t) => (days(t) ?? 0) > 7) },
      { key: "nodate", title: "Sin fecha", items: sorted.filter((t) => days(t) === null) },
    ].filter((g) => g.items.length > 0);
  }

  return (
    <div>
      {/* Agregar tarea: una sola entrada, con el proyecto a la vista */}
      <div className="bg-panel border border-line rounded-xl p-2 mb-6 flex flex-col sm:flex-row gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="¿Qué hay que hacer?"
          aria-label="Nueva tarea"
          className="flex-1 min-w-0 bg-transparent px-3 min-h-11 text-sm text-fg placeholder:text-fg-faint outline-none rounded-lg focus:bg-fill"
        />
        <div className="flex gap-2">
          <select
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            aria-label="Proyecto de la tarea"
            className="flex-1 sm:flex-none sm:w-48 min-w-0 bg-fill border border-line rounded-lg px-3 min-h-11 text-sm text-fg-mute outline-none focus:border-brand/40 truncate"
          >
            <option value="">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!newTitle.trim()}
            className="px-4 min-h-11 bg-brand hover:bg-brand-hi disabled:opacity-40 disabled:hover:bg-brand text-on-brand text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Agregar tarea
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented
          label="Agrupar por"
          value={groupBy}
          onChange={changeGroup}
          options={[
            { value: "project", label: "Por proyecto" },
            { value: "date", label: "Por fecha" },
          ]}
        />
        <FilterControl value={filter} onChange={setFilter} />
      </div>

      {tasks.filter((t) => !t.parentId).length === 0 ? (
        <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
          <p className="text-fg-mute font-medium">Aún no tienes tareas</p>
          <p className="text-fg-dim text-sm mt-1 max-w-md mx-auto leading-relaxed">
            Escribe arriba lo primero que tengas que hacer y elige a qué proyecto pertenece. Las tareas que salgan de reuniones y cobros también llegan aquí.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
          <p className="text-fg-mute font-medium">
            {filter === "done" ? "Todavía no hay tareas completadas" : "No tienes tareas pendientes"}
          </p>
          <p className="text-fg-dim text-sm mt-1">
            {filter === "done" ? "Las que completes aparecen aquí." : openTotal === 0 ? "Todo al día. Agrega arriba lo próximo que venga." : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <GroupBlock key={g.key} group={g} showProject={groupBy === "date"} allowAdd={filter !== "done" && groupBy === "project"} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupBlock({ group, showProject, allowAdd }: { group: Group; showProject: boolean; allowAdd: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="bg-panel border border-line rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-2 min-h-12 border-b border-line">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Mostrar ${group.title}` : `Ocultar ${group.title}`}
          className="w-8 h-8 flex items-center justify-center rounded-md text-fg-faint hover:text-fg-mute hover:bg-fill shrink-0"
        >
          <Icon d={collapsed ? ICON.chevronRight : ICON.chevronDown} />
        </button>
        {group.href ? (
          <Link href={group.href} className={`text-sm font-semibold truncate hover:text-brand-fg ${group.tone ?? "text-fg"}`}>
            {group.title}
          </Link>
        ) : (
          <span className={`text-sm font-semibold truncate ${group.tone ?? "text-fg"}`}>{group.title}</span>
        )}
        <span className="text-xs text-fg-faint tabular-nums shrink-0">{group.items.length}</span>
        <div className="flex-1" />
        {group.href && (
          <Link
            href={group.href}
            className="hidden sm:flex items-center gap-1 px-3 min-h-8 text-xs text-fg-dim hover:text-fg-mute rounded-md hover:bg-fill shrink-0"
          >
            Abrir proyecto
            <Icon d={ICON.chevronRight} className="w-3 h-3" />
          </Link>
        )}
      </div>
      {!collapsed && (
        <>
          <TaskListHeader />
          {group.items.map((t) => (
            <TaskRow key={t.id} task={t} showProject={showProject} />
          ))}
          {allowAdd && group.defaults && (
            <div className="border-t border-line">
              <QuickAdd defaults={group.defaults} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
