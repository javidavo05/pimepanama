"use client";

import { useState } from "react";
import { useTaskStore } from "@/components/empresa/tasks/task-store";
import { Segmented } from "@/components/empresa/tasks/task-parts";
import { TaskOverview } from "@/components/empresa/tasks/task-overview";
import type { TaskItem } from "@/components/empresa/tasks/types";
import { TasksCalendar } from "./tasks-calendar";

export type SerializedTask = TaskItem;

type ViewMode = "list" | "month" | "week" | "day";

/** Debe vivir dentro de un <TaskWorkspace>. */
export function TasksView() {
  const { tasks, projects, patchTask, deleteTask, createTask } = useTaskStore();
  const [view, setView] = useState<ViewMode>("list");

  return (
    <div>
      <div className="mb-6">
        <Segmented
          label="Vista"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: "Lista" },
            { value: "month", label: "Mes" },
            { value: "week", label: "Semana" },
            { value: "day", label: "Día" },
          ]}
        />
      </div>

      {view === "list" ? (
        <TaskOverview defaultGroupBy="date" />
      ) : (
        <TasksCalendar
          mode={view}
          tasks={tasks}
          projects={projects}
          onPatch={(id, data) => void patchTask(id, data)}
          onDelete={(id) => void deleteTask(id)}
          onCreate={createTask}
        />
      )}
    </div>
  );
}
