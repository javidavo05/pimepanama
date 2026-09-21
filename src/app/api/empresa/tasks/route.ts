import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { TASK_INCLUDE, resolveTaskPlacement, serializeTask } from "@/lib/tasks";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get("completed");
    const documentId = searchParams.get("documentId");
    const paymentScheduleId = searchParams.get("paymentScheduleId");
    const projectId = searchParams.get("projectId");

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        ...(completed !== null ? { completed: completed === "1" } : {}),
        ...(documentId ? { documentId } : {}),
        ...(paymentScheduleId ? { paymentScheduleId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: TASK_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks.map(serializeTask));
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const data = await request.json();

    if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    // Una subtarea vive en el proyecto de su tarea madre.
    let parentId: string | null = null;
    let projectId: string | null = data.projectId ?? null;
    let sectionId: string | null = data.sectionId ?? null;
    if (data.parentId) {
      const parent = await prisma.task.findFirst({
        where: { id: data.parentId, userId: user.id },
        select: { id: true, projectId: true },
      });
      if (!parent) return NextResponse.json({ error: "Tarea madre no encontrada" }, { status: 404 });
      parentId = parent.id;
      projectId = parent.projectId;
      sectionId = null;
    }

    const placement = await resolveTaskPlacement(user.id, projectId, sectionId);
    if ("error" in placement) return NextResponse.json({ error: placement.error }, { status: 400 });

    // Al final de su grupo: la tarea nueva aparece donde se escribió.
    const last = await prisma.task.findFirst({
      where: { userId: user.id, projectId: placement.projectId, sectionId: placement.sectionId, parentId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: data.title.trim(),
        description: data.description ?? null,
        assignee: data.assignee ?? null,
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        allDay: data.allDay ?? true,
        documentId: data.documentId ?? null,
        paymentScheduleId: data.paymentScheduleId ?? null,
        projectId: placement.projectId,
        sectionId: placement.sectionId,
        parentId,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
      include: TASK_INCLUDE,
    });

    return NextResponse.json(serializeTask(task), { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
