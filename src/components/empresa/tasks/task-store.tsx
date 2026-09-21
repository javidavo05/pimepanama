"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectOption, SectionOption, TaskItem } from "./types";

interface Notice {
  id: number;
  message: string;
  tone: "info" | "error";
  action?: { label: string; run: () => void };
}

interface TaskStore {
  tasks: TaskItem[];
  projects: ProjectOption[];
  /** Tareas completadas en esta visita: siguen visibles en "Pendientes" hasta recargar. */
  completedThisVisit: Set<string>;
  openTaskId: string | null;
  notice: Notice | null;
  openTask: (id: string | null) => void;
  createTask: (payload: Record<string, unknown>) => Promise<TaskItem | null>;
  patchTask: (id: string, data: Record<string, unknown>) => Promise<void>;
  toggleComplete: (id: string) => void;
  deleteTask: (id: string) => Promise<void>;
  createSection: (projectId: string, name: string) => Promise<SectionOption | null>;
  renameSection: (projectId: string, sectionId: string, name: string) => Promise<void>;
  deleteSection: (projectId: string, sectionId: string) => Promise<void>;
  dismissNotice: () => void;
  /** Suma o reemplaza tareas creadas por otra vía (p. ej. al pasar pendientes de una reunión). */
  mergeTasks: (incoming: TaskItem[]) => void;
}

const Ctx = createContext<TaskStore | null>(null);

export function useTaskStore(): TaskStore {
  const store = useContext(Ctx);
  if (!store) throw new Error("useTaskStore fuera de <TaskProvider>");
  return store;
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export function TaskProvider({
  initialTasks,
  projects: initialProjects,
  children,
}: {
  initialTasks: TaskItem[];
  projects: ProjectOption[];
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [projects, setProjects] = useState(initialProjects);
  const [completedThisVisit, setCompletedThisVisit] = useState<Set<string>>(new Set());
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeSeq = useRef(0);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Un router.refresh() trae datos nuevos del servidor (p. ej. la reunión
  // quedó asignada a un proyecto): se suman sin perder lo hecho en la visita.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setTasks((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const t of initialTasks) byId.set(t.id, t);
      return [...byId.values()];
    });
    setProjects(initialProjects);
  }, [initialTasks, initialProjects]);

  const notify = useCallback((message: string, tone: Notice["tone"], action?: Notice["action"]) => {
    noticeSeq.current += 1;
    setNotice({ id: noticeSeq.current, message, tone, action });
  }, []);

  const replace = useCallback((task: TaskItem) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }, []);

  const createTask = useCallback(
    async (payload: Record<string, unknown>) => {
      // Optimista: la fila aparece al pulsar Enter y se reemplaza con la real.
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const parent = payload.parentId ? tasksRef.current.find((t) => t.id === payload.parentId) : null;
      const projectId = (parent ? parent.projectId : (payload.projectId as string | null | undefined)) ?? null;
      const project = projects.find((p) => p.id === projectId) ?? null;
      const section = parent ? null : project?.sections.find((s) => s.id === payload.sectionId) ?? null;
      const now = new Date().toISOString();
      const temp = {
        id: tempId,
        userId: "",
        title: String(payload.title),
        description: (payload.description as string) ?? null,
        assignee: (payload.assignee as string) ?? null,
        priority: (payload.priority as TaskItem["priority"]) ?? "MEDIUM",
        dueDate: (payload.dueDate as string) ?? null,
        endDate: (payload.endDate as string) ?? null,
        allDay: (payload.allDay as boolean) ?? true,
        completed: false,
        completedAt: null,
        reminderSent: false,
        documentId: null,
        paymentScheduleId: null,
        projectId,
        sectionId: section?.id ?? null,
        parentId: (payload.parentId as string) ?? null,
        sortOrder: Number.MAX_SAFE_INTEGER,
        createdAt: now,
        updatedAt: now,
        document: null,
        paymentSchedule: null,
        project: project ? { id: project.id, name: project.name } : null,
        section: section ? { id: section.id, name: section.name } : null,
        meeting: null,
      } as TaskItem;
      setTasks((prev) => [...prev, temp]);
      try {
        const task: TaskItem = await send("/api/empresa/tasks", "POST", payload);
        setTasks((prev) => prev.map((t) => (t.id === tempId ? task : t)));
        return task;
      } catch {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        notify(`No se pudo crear "${String(payload.title)}". Revisa tu conexión e inténtalo de nuevo.`, "error");
        return null;
      }
    },
    [notify, projects],
  );

  const patchTask = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const before = tasksRef.current.find((t) => t.id === id);
      if (!before) return;
      // Optimista: el proyecto y la sección se resuelven localmente para que
      // la tarea cambie de grupo al instante.
      const optimistic = { ...before, ...data } as TaskItem;
      if ("projectId" in data) {
        const p = projects.find((x) => x.id === data.projectId);
        optimistic.project = p ? { id: p.id, name: p.name } : null;
        if (!("sectionId" in data)) {
          optimistic.sectionId = null;
          optimistic.section = null;
        }
      }
      if ("sectionId" in data) {
        const s = projects.flatMap((p) => p.sections).find((x) => x.id === data.sectionId);
        optimistic.section = s ? { id: s.id, name: s.name } : null;
      }
      replace(optimistic);
      try {
        const updated: TaskItem = await send(`/api/empresa/tasks/${id}`, "PATCH", data);
        replace(updated);
        if ("projectId" in data) {
          setTasks((prev) => prev.map((t) => (t.parentId === id ? { ...t, projectId: updated.projectId, project: updated.project } : t)));
        }
      } catch {
        replace(before);
        notify("No se pudo guardar el cambio. Inténtalo de nuevo.", "error");
      }
    },
    [notify, projects, replace],
  );

  const toggleComplete = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task || id.startsWith("tmp-")) return;
      const completed = !task.completed;
      if (completed) {
        setCompletedThisVisit((prev) => new Set(prev).add(id));
        notify("Tarea completada", "info", {
          label: "Deshacer",
          run: () => void patchTask(id, { completed: false }),
        });
      }
      void patchTask(id, { completed });
    },
    [notify, patchTask],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const previous = tasksRef.current;
      setTasks((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
      setOpenTaskId((cur) => (cur === id ? null : cur));
      try {
        await send(`/api/empresa/tasks/${id}`, "DELETE");
      } catch {
        setTasks(previous);
        notify("No se pudo eliminar la tarea.", "error");
      }
    },
    [notify],
  );

  const updateSections = useCallback((projectId: string, fn: (s: SectionOption[]) => SectionOption[]) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, sections: fn(p.sections) } : p)));
  }, []);

  const createSection = useCallback(
    async (projectId: string, name: string) => {
      try {
        const section: SectionOption = await send(`/api/empresa/projects/${projectId}/sections`, "POST", { name });
        updateSections(projectId, (s) => [...s, section]);
        return section;
      } catch {
        notify("No se pudo crear la sección.", "error");
        return null;
      }
    },
    [notify, updateSections],
  );

  const renameSection = useCallback(
    async (projectId: string, sectionId: string, name: string) => {
      updateSections(projectId, (s) => s.map((x) => (x.id === sectionId ? { ...x, name } : x)));
      setTasks((prev) => prev.map((t) => (t.sectionId === sectionId ? { ...t, section: { id: sectionId, name } } : t)));
      try {
        await send(`/api/empresa/project-sections/${sectionId}`, "PATCH", { name });
      } catch {
        notify("No se pudo renombrar la sección.", "error");
      }
    },
    [notify, updateSections],
  );

  const deleteSection = useCallback(
    async (projectId: string, sectionId: string) => {
      const prevProjects = projects;
      const prevTasks = tasksRef.current;
      updateSections(projectId, (s) => s.filter((x) => x.id !== sectionId));
      setTasks((prev) => prev.map((t) => (t.sectionId === sectionId ? { ...t, sectionId: null, section: null } : t)));
      try {
        await send(`/api/empresa/project-sections/${sectionId}`, "DELETE");
      } catch {
        setProjects(prevProjects);
        setTasks(prevTasks);
        notify("No se pudo eliminar la sección.", "error");
      }
    },
    [notify, projects, updateSections],
  );

  const value = useMemo<TaskStore>(
    () => ({
      tasks,
      projects,
      completedThisVisit,
      openTaskId,
      notice,
      openTask: (id: string | null) => {
        if (!id?.startsWith("tmp-")) setOpenTaskId(id);
      },
      createTask,
      patchTask,
      toggleComplete,
      deleteTask,
      createSection,
      renameSection,
      deleteSection,
      dismissNotice: () => setNotice(null),
      mergeTasks: (incoming: TaskItem[]) =>
        setTasks((prev) => {
          const ids = new Set(incoming.map((t) => t.id));
          return [...prev.filter((t) => !ids.has(t.id)), ...incoming];
        }),
    }),
    [tasks, projects, completedThisVisit, openTaskId, notice, createTask, patchTask, toggleComplete, deleteTask, createSection, renameSection, deleteSection],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Tareas de primer nivel visibles según el filtro. */
export function visibleTasks(tasks: TaskItem[], filter: "open" | "done" | "all", completedThisVisit: Set<string>) {
  return tasks.filter((t) => {
    if (t.parentId) return false;
    if (filter === "all") return true;
    if (filter === "done") return t.completed;
    return !t.completed || completedThisVisit.has(t.id);
  });
}

export function byOrder(a: TaskItem, b: TaskItem) {
  return a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
}
