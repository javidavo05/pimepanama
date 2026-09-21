import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { loadTaskWorkspace } from "@/lib/tasks";
import { TaskWorkspace } from "@/components/empresa/tasks/task-workspace";
import { TaskOverview } from "@/components/empresa/tasks/task-overview";
import { ProjectsTable, type ProjectRow } from "./projects-table";

export const metadata = { title: "Proyectos — Pime Suite" };
export const dynamic = "force-dynamic";

type Vista = "proyectos" | "tareas";

export default async function ProyectosPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista: rawVista } = await searchParams;
  const vista: Vista = rawVista === "tareas" ? "tareas" : "proyectos";
  const user = await getEmpresaUser();

  const [projectCount, openTaskCount] = await Promise.all([
    prisma.project.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id, completed: false, parentId: null } }),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-fg-dim text-sm mt-1">
            {projectCount} proyecto{projectCount !== 1 ? "s" : ""} · {openTaskCount} tarea{openTaskCount !== 1 ? "s" : ""} pendiente{openTaskCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/empresa/proyectos/nuevo"
          // En la pestaña de tareas la acción principal es agregar una tarea
          className={`px-4 min-h-11 inline-flex items-center text-sm font-semibold rounded-lg transition-colors ${
            vista === "tareas"
              ? "bg-fill border border-line text-fg-mute hover:text-fg hover:border-line-loud"
              : "bg-brand hover:bg-brand-hi text-on-brand"
          }`}
        >
          Crear proyecto
        </Link>
      </div>

      <nav aria-label="Vistas de proyectos" className="flex gap-6 border-b border-line mb-6">
        {(
          [
            { key: "proyectos", label: "Proyectos", href: "/empresa/proyectos", count: projectCount },
            { key: "tareas", label: "Tareas", href: "/empresa/proyectos?vista=tareas", count: openTaskCount },
          ] as const
        ).map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={vista === tab.key ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 min-h-11 border-b-2 text-sm font-medium transition-colors ${
              vista === tab.key ? "border-brand text-fg" : "border-transparent text-fg-dim hover:text-fg-mute"
            }`}
          >
            {tab.label}
            <span className="text-xs text-fg-faint tabular-nums">{tab.count}</span>
          </Link>
        ))}
      </nav>

      {vista === "tareas" ? <TasksTab userId={user.id} /> : <ProjectsTab userId={user.id} />}
    </div>
  );
}

async function TasksTab({ userId }: { userId: string }) {
  const { tasks, projects } = await loadTaskWorkspace(userId);
  return (
    <TaskWorkspace tasks={tasks} projects={projects}>
      <TaskOverview defaultGroupBy="project" />
    </TaskWorkspace>
  );
}

async function ProjectsTab({ userId }: { userId: string }) {
  const [projects, taskCounts, nextTasks] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: {
        client: { select: { name: true, company: true } },
        clients: { include: { client: { select: { name: true, company: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.groupBy({
      by: ["projectId", "completed"],
      where: { userId, projectId: { not: null }, parentId: null },
      _count: { _all: true },
    }),
    // La próxima entrega pendiente de cada proyecto
    prisma.task.findMany({
      where: { userId, projectId: { not: null }, parentId: null, completed: false, dueDate: { not: null } },
      select: { projectId: true, title: true, dueDate: true, allDay: true },
      orderBy: { dueDate: "asc" },
      distinct: ["projectId"],
    }),
  ]);

  if (projects.length === 0) {
    return (
      <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
        <p className="text-fg-mute font-medium">Todavía no tienes proyectos</p>
        <p className="text-fg-dim text-sm mt-1 max-w-md mx-auto leading-relaxed">
          Un proyecto reúne a su cliente, sus tareas, cotizaciones, contratos y pagos en un solo lugar.
        </p>
        <Link
          href="/empresa/proyectos/nuevo"
          className="inline-flex items-center mt-6 px-4 min-h-11 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors"
        >
          Crear el primer proyecto
        </Link>
      </div>
    );
  }

  const rows: ProjectRow[] = projects.map((p) => {
    const counts = taskCounts.filter((c) => c.projectId === p.id);
    const done = counts.find((c) => c.completed)?._count._all ?? 0;
    const open = counts.find((c) => !c.completed)?._count._all ?? 0;
    const next = nextTasks.find((t) => t.projectId === p.id);
    const clientNames =
      p.clients.length > 0
        ? p.clients.map((pc) => pc.client.company || pc.client.name)
        : p.client
          ? [p.client.company || p.client.name]
          : [];
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      clients: clientNames,
      done,
      total: done + open,
      endDate: p.endDate?.toISOString() ?? null,
      next: next ? { title: next.title, dueDate: next.dueDate!.toISOString(), allDay: next.allDay } : null,
    };
  });

  return <ProjectsTable rows={rows} />;
}
