import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { TasksView } from "./tasks-view";

export const metadata = { title: "Tareas — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const user = await getEmpresaUser();

  const rawTasks = await prisma.task.findMany({
    where: { userId: user.id },
    include: {
      document: { select: { id: true, type: true, number: true, clientName: true, clientCompany: true } },
      paymentSchedule: { select: { id: true, description: true, documentId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tasks = rawTasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const pending = tasks.filter((t) => !t.completed).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Tareas</h1>
          <p className="text-white/60 text-sm mt-0.5">
            {pending} tarea{pending !== 1 ? "s" : ""} pendiente{pending !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <TasksView initialTasks={tasks} />
    </div>
  );
}
