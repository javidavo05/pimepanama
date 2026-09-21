import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { TASK_INCLUDE, resolveTaskPlacement, serializeTask } from "@/lib/tasks";

export const runtime = "nodejs";

const EDITABLE = [
  "title", "description", "assignee", "priority", "dueDate", "endDate",
  "allDay", "completed", "sortOrder", "projectId", "sectionId",
] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await request.json();
    const update: Record<string, unknown> = {};
    for (const key of EDITABLE) if (key in data) update[key] = data[key];

    if ("title" in update && (typeof update.title !== "string" || !update.title.trim())) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }
    if ("dueDate" in update) {
      update.dueDate = update.dueDate ? new Date(update.dueDate as string) : null;
    }
    if ("endDate" in update) {
      update.endDate = update.endDate ? new Date(update.endDate as string) : null;
    }
    if ("completed" in update) {
      if (update.completed && !existing.completed) update.completedAt = new Date();
      if (!update.completed) update.completedAt = null;
    }

    // Mover de proyecto: la sección se valida contra el proyecto nuevo y, si
    // no se manda, se suelta (una sección no viaja entre proyectos).
    const movesProject = "projectId" in update && update.projectId !== existing.projectId;
    if ("projectId" in update || "sectionId" in update) {
      if (existing.parentId) {
        delete update.projectId;
        delete update.sectionId;
      } else {
        const placement = await resolveTaskPlacement(
          user.id,
          "projectId" in update ? (update.projectId as string | null) : existing.projectId,
          "sectionId" in update ? (update.sectionId as string | null) : movesProject ? null : existing.sectionId,
        );
        if ("error" in placement) return NextResponse.json({ error: placement.error }, { status: 400 });
        update.projectId = placement.projectId;
        update.sectionId = placement.sectionId;
      }
    }

    const task = await prisma.task.update({ where: { id }, data: update, include: TASK_INCLUDE });

    // Las subtareas siguen a su tarea madre de proyecto.
    if (movesProject && !existing.parentId) {
      await prisma.task.updateMany({ where: { parentId: id }, data: { projectId: task.projectId } });
    }

    return NextResponse.json(serializeTask(task));
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
