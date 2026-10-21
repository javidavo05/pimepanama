"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTaskStore } from "@/components/empresa/tasks/task-store";
import { Segmented } from "@/components/empresa/tasks/task-parts";
import { TaskOverview } from "@/components/empresa/tasks/task-overview";
import type { TaskItem } from "@/components/empresa/tasks/types";
import { TasksCalendar } from "./tasks-calendar";
import { PipelineGoogle } from "@/components/empresa/calendario/pipeline-google";

export type SerializedTask = TaskItem;

type ViewMode = "list" | "month" | "week" | "day";
type Alcance = "todas" | "mias";
const ALCANCE_KEY = "pime:tareas-alcance";

/** Debe vivir dentro de un <TaskWorkspace>. */
export function TasksView() {
  const { tasks, projects, equipoInfo, patchTask, deleteTask, createTask, openTask } = useTaskStore();
  const [view, setView] = useState<ViewMode>("list");
  const [alcance, setAlcance] = useState<Alcance>("todas");
  const [versionGoogle, setVersionGoogle] = useState(0);
  const params = useSearchParams();

  useEffect(() => {
    try {
      if (localStorage.getItem(ALCANCE_KEY) === "mias") setAlcance("mias");
    } catch {}
  }, []);

  // Un aviso del teléfono abre la tarea de la que habla (?tarea=<id>).
  const tareaPedida = params.get("tarea");
  useEffect(() => {
    if (tareaPedida && tasks.some((t) => t.id === tareaPedida)) openTask(tareaPedida);
    // Solo al llegar: no reabrir cuando el usuario la cierra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaPedida]);

  function cambiarAlcance(v: Alcance) {
    setAlcance(v);
    try {
      localStorage.setItem(ALCANCE_KEY, v);
    } catch {}
  }

  const soloMias = alcance === "mias";
  const visibles = soloMias && equipoInfo ? tasks.filter((t) => t.responsableId === equipoInfo.miembroId) : tasks;
  const mias = equipoInfo ? tasks.filter((t) => !t.parentId && !t.completed && t.responsableId === equipoInfo.miembroId).length : undefined;

  return (
    <div>
      <PipelineGoogle onCambio={() => { setVersionGoogle((v) => v + 1); if (view === "list") setView("week"); }} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
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
        <Segmented
          label="De quién"
          value={alcance}
          onChange={cambiarAlcance}
          options={[
            { value: "todas", label: "Todo el equipo" },
            { value: "mias", label: "Mis tareas", count: mias },
          ]}
        />
      </div>

      {view === "list" ? (
        <TaskOverview defaultGroupBy="date" soloMias={soloMias} />
      ) : (
        <TasksCalendar
          versionGoogle={versionGoogle}
          mode={view}
          tasks={visibles}
          projects={projects}
          onPatch={(id, data) => void patchTask(id, data)}
          onDelete={(id) => void deleteTask(id)}
          onCreate={createTask}
        />
      )}
    </div>
  );
}
