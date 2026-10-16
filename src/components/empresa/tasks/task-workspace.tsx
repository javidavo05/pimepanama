"use client";

import { TaskDrawer } from "./task-drawer";
import { TaskToast } from "./task-parts";
import { TaskProvider } from "./task-store";
import type { EquipoInfo, ProjectOption, TaskItem } from "./types";

/** Estado compartido + panel de detalle + avisos para cualquier vista de tareas. */
export function TaskWorkspace({
  tasks,
  projects,
  equipoInfo,
  children,
}: {
  tasks: TaskItem[];
  projects: ProjectOption[];
  /** Opcional: si no se pasa, el panel lo pide a /api/empresa/tasks/equipo. */
  equipoInfo?: EquipoInfo | null;
  children: React.ReactNode;
}) {
  return (
    <TaskProvider initialTasks={tasks} projects={projects} equipoInfo={equipoInfo}>
      {children}
      <TaskDrawer />
      <TaskToast />
    </TaskProvider>
  );
}
