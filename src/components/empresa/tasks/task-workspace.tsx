"use client";

import { TaskDrawer } from "./task-drawer";
import { TaskToast } from "./task-parts";
import { TaskProvider } from "./task-store";
import type { ProjectOption, TaskItem } from "./types";

/** Estado compartido + panel de detalle + avisos para cualquier vista de tareas. */
export function TaskWorkspace({
  tasks,
  projects,
  children,
}: {
  tasks: TaskItem[];
  projects: ProjectOption[];
  children: React.ReactNode;
}) {
  return (
    <TaskProvider initialTasks={tasks} projects={projects}>
      {children}
      <TaskDrawer />
      <TaskToast />
    </TaskProvider>
  );
}
