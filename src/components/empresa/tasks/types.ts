import type { TaskPriority } from "@prisma/client";
import type { SerializedTaskRow } from "@/lib/tasks";

export type TaskItem = SerializedTaskRow;

export interface SectionOption {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ProjectOption {
  id: string;
  name: string;
  sections: SectionOption[];
}

export type TaskFilter = "open" | "done" | "all";

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const PRIORITY_PILL: Record<TaskPriority, string> = {
  HIGH: "bg-danger/10 text-danger",
  // Media es lo normal: no compite por atención
  MEDIUM: "bg-fill-2 text-fg-dim",
  LOW: "text-fg-faint",
};

/** Persona del equipo que puede tener tareas a cargo. */
export interface MiembroOption {
  id: string;
  nombre: string;
}

/** Qué sabe el panel de tareas de quien entró: su id, su equipo y qué vínculos del CRM puede buscar. */
export interface EquipoInfo {
  equipo: MiembroOption[];
  miembroId: string;
  puede: { leads: boolean; oportunidades: boolean };
}

/** Nombre de quien tiene la tarea: el responsable del equipo o, en tareas viejas, el texto de «assignee». */
export function nombreResponsable(task: Pick<TaskItem, "responsable" | "assignee">): string | null {
  const n = task.responsable?.nombre ?? task.assignee ?? null;
  // Sin nombre en el perfil llega el correo: se muestra la parte antes de la arroba, que cabe en la fila.
  return n && n.includes("@") && !n.includes(" ") ? n.split("@")[0] : n;
}
