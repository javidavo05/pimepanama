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
