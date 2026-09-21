import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { loadTaskWorkspace } from "@/lib/tasks";
import { TaskWorkspace } from "@/components/empresa/tasks/task-workspace";
import { TasksView } from "./tasks-view";

export const metadata = { title: "Tareas — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const user = await getEmpresaUser();
  const { tasks, projects } = await loadTaskWorkspace(user.id);
  const pending = tasks.filter((t) => !t.completed && !t.parentId).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-fg-dim text-sm mt-1">
            {pending} tarea{pending !== 1 ? "s" : ""} pendiente{pending !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/empresa/proyectos?vista=tareas" className="text-sm text-fg-dim hover:text-brand-fg min-h-11 inline-flex items-center">
          Ver por proyecto
        </Link>
      </div>

      <TaskWorkspace tasks={tasks} projects={projects}>
        <TasksView />
      </TaskWorkspace>
    </div>
  );
}
