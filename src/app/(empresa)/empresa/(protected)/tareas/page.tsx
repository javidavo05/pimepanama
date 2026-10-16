import { Suspense } from "react";
import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { loadTaskWorkspace } from "@/lib/tasks";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { puedeVer } from "@/lib/auth/permisos";
import { TaskWorkspace } from "@/components/empresa/tasks/task-workspace";
import { TasksView } from "./tasks-view";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Tareas — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const user = await getEmpresaUser();
  const [{ tasks, projects }, equipo] = await Promise.all([loadTaskWorkspace(user.id), equipoDeLaEmpresa(user.id)]);
  const pending = tasks.filter((t) => !t.completed && !t.parentId).length;
  const equipoInfo = {
    equipo,
    miembroId: user.miembro.id,
    puede: { leads: puedeVer(user.miembro.area, "leads"), oportunidades: puedeVer(user.miembro.area, "ventas") },
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        className="mb-6"
        title="Tareas"
        description={`${pending} tarea${pending !== 1 ? "s" : ""} pendiente${pending !== 1 ? "s" : ""} del equipo. Cada una con su responsable y, si aplica, su cliente, lead u oportunidad.`}
        actions={
          <Link href="/empresa/proyectos?vista=tareas" className={btn.secondary}>
            Ver por proyecto
          </Link>
        }
      />

      <TaskWorkspace tasks={tasks} projects={projects} equipoInfo={equipoInfo}>
        <Suspense>
          <TasksView />
        </Suspense>
      </TaskWorkspace>
    </div>
  );
}
