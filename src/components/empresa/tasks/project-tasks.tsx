"use client";

import { useEffect, useRef, useState } from "react";
import { byOrder, useTaskStore, visibleTasks } from "./task-store";
import { AssigneeAvatar, CheckButton, dueInfo, FilterControl, Icon, ICON, PriorityPill, QuickAdd, Segmented, TaskListHeader, TaskRow } from "./task-parts";
import type { SectionOption, TaskFilter, TaskItem } from "./types";

type Layout = "list" | "board";

const LAYOUT_KEY = "pime:project-tasks-layout";

interface Group {
  section: SectionOption | null;
  items: TaskItem[];
}

/** Espacio de tareas de un proyecto: secciones, lista y tablero. */
export function ProjectTasks({ projectId }: { projectId: string }) {
  const { tasks, projects, completedThisVisit, createSection } = useTaskStore();
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [layout, setLayout] = useState<Layout>("list");
  const [addingSection, setAddingSection] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved === "list" || saved === "board") setLayout(saved);
    } catch {}
  }, []);

  function changeLayout(v: Layout) {
    setLayout(v);
    try {
      localStorage.setItem(LAYOUT_KEY, v);
    } catch {}
  }

  const project = projects.find((p) => p.id === projectId);
  const sections = [...(project?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const shown = visibleTasks(projectTasks, filter, completedThisVisit);
  const topLevel = projectTasks.filter((t) => !t.parentId);
  const openCount = topLevel.filter((t) => !t.completed).length;
  const doneCount = topLevel.length - openCount;

  const loose = shown.filter((t) => !t.sectionId || !sections.some((s) => s.id === t.sectionId)).sort(byOrder);
  const groups: Group[] = [
    // "Sin sección" solo aparece si hay tareas sueltas o si no hay ninguna sección
    ...(loose.length > 0 || sections.length === 0 ? [{ section: null, items: loose }] : []),
    ...sections.map((s) => ({ section: s, items: shown.filter((t) => t.sectionId === s.id).sort(byOrder) })),
  ];

  const progress = topLevel.length > 0 ? Math.round((doneCount / topLevel.length) * 100) : 0;

  return (
    <div>
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Segmented
          label="Vista"
          value={layout}
          onChange={changeLayout}
          options={[
            { value: "list", label: "Lista" },
            { value: "board", label: "Tablero" },
          ]}
        />
        <FilterControl value={filter} onChange={setFilter} />
        <div className="flex-1" />
        {topLevel.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-fg-dim" aria-label={`${doneCount} de ${topLevel.length} tareas completadas`}>
            <div className="w-24 h-1 rounded-full bg-fill-2 overflow-hidden">
              <div className="h-full bg-ok-solid rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="tabular-nums">
              {doneCount}/{topLevel.length} completadas
            </span>
          </div>
        )}
      </div>

      {topLevel.length === 0 && sections.length === 0 ? (
        <EmptyProject projectId={projectId} />
      ) : filter === "done" && shown.length === 0 ? (
        <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
          <p className="text-fg-mute text-sm font-medium">Todavía no hay tareas completadas</p>
          <p className="text-fg-dim text-sm mt-1">Cuando completes una, aparece aquí con la fecha en que la cerraste.</p>
        </div>
      ) : layout === "list" ? (
        <div className="space-y-4">
          {groups.map((g) => (
            <SectionBlock key={g.section?.id ?? "none"} projectId={projectId} group={g} onlyGroup={sections.length === 0} filter={filter} />
          ))}
          {filter === "open" && openCount === 0 && doneCount > 0 && (
            <p className="text-center text-sm text-fg-dim py-4">Todo al día en este proyecto. Agrega lo próximo que haya que hacer.</p>
          )}
        </div>
      ) : (
        <Board projectId={projectId} groups={groups} filter={filter} onAddSection={() => setAddingSection(true)} addingSection={addingSection} onDoneAdding={() => setAddingSection(false)} />
      )}

      {layout === "list" && (
        <div className="mt-4">
          {addingSection ? (
            <SectionNameInput
              onSubmit={async (name) => {
                await createSection(projectId, name);
                setAddingSection(false);
              }}
              onCancel={() => setAddingSection(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingSection(true)}
              className="flex items-center gap-2 px-3 min-h-11 text-sm text-fg-dim hover:text-fg-mute rounded-lg hover:bg-fill transition-colors"
            >
              <Icon d={ICON.plus} />
              Agregar sección
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyProject({ projectId }: { projectId: string }) {
  return (
    <div className="bg-panel border border-line rounded-xl overflow-hidden">
      <div className="px-6 pt-8 pb-6 text-center">
        <p className="text-fg-mute font-medium">Este proyecto todavía no tiene tareas</p>
        <p className="text-fg-dim text-sm mt-1 max-w-md mx-auto leading-relaxed">
          Anota lo que hay que hacer para entregarlo. Luego puedes agruparlo en secciones como Diseño, Desarrollo o Entrega.
        </p>
      </div>
      <div className="border-t border-line">
        <QuickAdd defaults={{ projectId }} placeholder="Agregar la primera tarea" autoFocus={false} />
      </div>
    </div>
  );
}

function SectionNameInput({
  initial = "",
  onSubmit,
  onCancel,
}: {
  initial?: string;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function commit() {
    if (done.current) return;
    done.current = true;
    const v = name.trim();
    if (v && v !== initial) void onSubmit(v);
    else onCancel();
  }

  return (
    <input
      ref={ref}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          done.current = true;
          onCancel();
        }
      }}
      placeholder="Nombre de la sección"
      aria-label="Nombre de la sección"
      className="w-full max-w-sm bg-fill border border-brand/40 rounded-lg px-3 min-h-11 text-sm font-semibold text-fg outline-none"
    />
  );
}

function SectionHeader({
  projectId,
  section,
  count,
  collapsed,
  onToggle,
}: {
  projectId: string;
  section: SectionOption;
  count: number;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const { renameSection, deleteSection } = useTaskStore();
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (renaming) {
    return (
      <div className="px-2 py-2">
        <SectionNameInput
          initial={section.name}
          onSubmit={(name) => {
            void renameSection(projectId, section.id, name);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-danger/[0.06]">
        <p className="text-sm text-fg-soft flex-1 min-w-48">
          ¿Eliminar «{section.name}»? {count > 0 ? `Sus ${count} tarea${count !== 1 ? "s" : ""} quedan en el proyecto, sin sección.` : ""}
        </p>
        <button type="button" onClick={() => setConfirming(false)} className="px-3 min-h-9 text-sm text-fg-dim hover:text-fg-mute">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void deleteSection(projectId, section.id)}
          className="px-3 min-h-9 text-sm font-semibold rounded-lg bg-danger-solid text-on-brand hover:opacity-90"
        >
          Eliminar sección
        </button>
      </div>
    );
  }

  return (
    <div className={`group/section flex items-center gap-2 min-h-12 ${onToggle ? "px-2" : "pl-4 pr-2"}`}>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Mostrar ${section.name}` : `Ocultar ${section.name}`}
          className="w-8 h-8 flex items-center justify-center rounded-md text-fg-faint hover:text-fg-mute hover:bg-fill"
        >
          <Icon d={collapsed ? ICON.chevronRight : ICON.chevronDown} className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setRenaming(true)}
        title="Renombrar sección"
        className="text-sm font-semibold text-fg truncate text-left hover:text-brand-fg min-w-0"
      >
        {section.name}
      </button>
      <span className="text-xs text-fg-faint tabular-nums">{count}</span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => setRenaming(true)}
        aria-label={`Renombrar ${section.name}`}
        className="w-8 h-8 flex items-center justify-center rounded-md text-fg-faint hover:text-fg-mute hover:bg-fill opacity-100 md:opacity-0 md:group-hover/section:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <Icon d={ICON.pencil} className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Eliminar ${section.name}`}
        className="w-8 h-8 flex items-center justify-center rounded-md text-fg-faint hover:text-danger hover:bg-fill opacity-100 md:opacity-0 md:group-hover/section:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <Icon d={ICON.trash} className="w-4 h-4" />
      </button>
    </div>
  );
}

function SectionBlock({
  projectId,
  group,
  onlyGroup,
  filter,
}: {
  projectId: string;
  group: Group;
  onlyGroup: boolean;
  filter: TaskFilter;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { section, items } = group;

  return (
    <div className="bg-panel border border-line rounded-xl overflow-hidden">
      {section ? (
        <div className="border-b border-line">
          <SectionHeader projectId={projectId} section={section} count={items.length} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        </div>
      ) : (
        !onlyGroup && (
          <div className="flex items-center gap-2 px-4 min-h-12 border-b border-line">
            <span className="text-sm font-semibold text-fg-mute">Sin sección</span>
            <span className="text-xs text-fg-faint tabular-nums">{items.length}</span>
          </div>
        )
      )}
      {!collapsed && (
        <>
          {items.length > 0 && <TaskListHeader />}
          {items.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
          {filter !== "done" && (
            <div className={items.length > 0 ? "border-t border-line" : ""}>
              <QuickAdd defaults={{ projectId, sectionId: section?.id ?? null }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tablero ─────────────────────────────────────────────────────────────────

function Board({
  projectId,
  groups,
  filter,
  addingSection,
  onAddSection,
  onDoneAdding,
}: {
  projectId: string;
  groups: Group[];
  filter: TaskFilter;
  addingSection: boolean;
  onAddSection: () => void;
  onDoneAdding: () => void;
}) {
  const { patchTask, createSection } = useTaskStore();
  const [dragOver, setDragOver] = useState<string | null>(null);

  function drop(e: React.DragEvent, sectionId: string | null) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/task-id");
    if (id) void patchTask(id, { sectionId });
  }

  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
      {groups.map((g) => {
        const key = g.section?.id ?? "none";
        return (
          <div
            key={key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(key);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === key ? null : cur))}
            onDrop={(e) => drop(e, g.section?.id ?? null)}
            className={`w-72 shrink-0 snap-start rounded-xl border flex flex-col max-h-[70vh] transition-colors ${
              dragOver === key ? "border-brand/50 bg-brand/[0.04]" : "border-line bg-fill/40"
            }`}
          >
            <div className="border-b border-line">
              {g.section ? (
                <SectionHeader projectId={projectId} section={g.section} count={g.items.length} />
              ) : (
                <div className="flex items-center gap-2 px-4 min-h-12">
                  <span className="text-sm font-semibold text-fg-mute">Sin sección</span>
                  <span className="text-xs text-fg-faint tabular-nums">{g.items.length}</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {g.items.map((t) => (
                <BoardCard key={t.id} task={t} />
              ))}
              {g.items.length === 0 && (
                <p className="text-xs text-fg-faint text-center py-6 px-3">Arrastra tareas aquí o agrega una nueva.</p>
              )}
            </div>
            {filter !== "done" && (
              <div className="border-t border-line">
                <QuickAdd defaults={{ projectId, sectionId: g.section?.id ?? null }} />
              </div>
            )}
          </div>
        );
      })}
      <div className="w-72 shrink-0">
        {addingSection ? (
          <SectionNameInput
            onSubmit={async (name) => {
              await createSection(projectId, name);
              onDoneAdding();
            }}
            onCancel={onDoneAdding}
          />
        ) : (
          <button
            type="button"
            onClick={onAddSection}
            className="w-full flex items-center gap-2 px-4 min-h-12 text-sm text-fg-dim hover:text-fg-mute rounded-xl border border-dashed border-line hover:border-line-loud transition-colors"
          >
            <Icon d={ICON.plus} />
            Agregar sección
          </button>
        )}
      </div>
    </div>
  );
}

function BoardCard({ task }: { task: TaskItem }) {
  const { tasks, openTask } = useTaskStore();
  const due = dueInfo(task);
  const subtasks = tasks.filter((t) => t.parentId === task.id);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => openTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") openTask(task.id);
      }}
      className="bg-panel border border-line hover:border-line-loud rounded-lg p-3 cursor-pointer active:cursor-grabbing transition-colors outline-none focus-visible:border-brand/50"
    >
      <div className="flex items-start gap-3">
        <div className="pt-px">
          <CheckButton task={task} size="sm" />
        </div>
        <p className={`flex-1 min-w-0 text-sm leading-snug break-words line-clamp-3 ${task.completed ? "text-fg-faint line-through" : "text-fg-soft"}`}>
          {task.title}
        </p>
      </div>
      {(due || task.assignee || subtasks.length > 0 || task.priority === "HIGH") && (
        <div className="flex items-center gap-2 mt-3 text-xs">
          {task.assignee && <AssigneeAvatar name={task.assignee} />}
          {due && <span className={due.tone}>{due.label}</span>}
          {subtasks.length > 0 && (
            <span className="flex items-center gap-1 text-fg-faint">
              <Icon d={ICON.subtasks} className="w-3 h-3" />
              {subtasks.filter((s) => s.completed).length}/{subtasks.length}
            </span>
          )}
          <div className="flex-1" />
          {task.priority === "HIGH" && !task.completed && <PriorityPill priority="HIGH" />}
        </div>
      )}
    </div>
  );
}
