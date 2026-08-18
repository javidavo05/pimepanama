import type { SerializedTask } from "./tasks-view";

// Todo-el-día se guarda como "medianoche UTC" del día elegido (una etiqueta de
// calendario sin zona horaria) — se lee con getters UTC. Las tareas con hora
// se guardan como un instante real construido con el reloj local del
// navegador — se leen con getters locales. Ver plan de la sesión para detalle.

export function taskLocalDate(task: Pick<SerializedTask, "dueDate" | "allDay">): Date | null {
  if (!task.dueDate) return null;
  const d = new Date(task.dueDate);
  if (task.allDay) return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return d;
}

export function taskLocalEndDate(task: Pick<SerializedTask, "endDate">): Date | null {
  return task.endDate ? new Date(task.endDate) : null;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function mondayOf(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  return addDays(startOfDay(d), -day);
}

export function daysDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export function allDayISO(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

export function timedISO(d: Date): string {
  return d.toISOString();
}
