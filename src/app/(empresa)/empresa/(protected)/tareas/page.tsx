import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { loadTaskWorkspace } from "@/lib/tasks";
import { TaskWorkspace } from "@/components/empresa/tasks/task-workspace";
import { TasksView } from "./tasks-view";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Tareas — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const user = await getEmpresaUser();
  const { tasks, projects } = await loadTaskWorkspace(user.id);
  const pending = tasks.filter((t) => !t.completed && !t.parentId).length;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        className="mb-6"
        title="Tareas"
        description={`${pending} tarea${pending !== 1 ? "s" : ""} pendiente${pending !== 1 ? "s" : ""}`}
        actions={
          <Link href="/empresa/proyectos?vista=tareas" className={btn.secondary}>
            Ver por proyecto
          </Link>
        }
      />

      <TaskWorkspace tasks={tasks} projects={projects}>
        <TasksView />
      </TaskWorkspace>
    </div>
  );
}
