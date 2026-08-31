import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeMeetingActionItem } from "@/lib/meetings/serialize";

export const runtime = "nodejs";

/** El detalle que se copia a la tarea: contexto + criterios de aceptación. */
function buildTaskDescription(item: {
  detail: string | null;
  acceptance: string[];
  touchpoints: string[];
  meetingTitle: string;
  meetingDate: Date;
}): string {
  const parts: string[] = [];
  if (item.detail) parts.push(item.detail);
  if (item.acceptance.length > 0) {
    parts.push(`Criterios de aceptación:\n${item.acceptance.map((a) => `- ${a}`).join("\n")}`);
  }
  if (item.touchpoints.length > 0) {
    parts.push(`Toca: ${item.touchpoints.join(", ")}`);
  }
  const date = item.meetingDate.toISOString().split("T")[0];
  parts.push(`Origen: reunión "${item.meetingTitle}" del ${date}.`);
  return parts.join("\n\n");
}

/**
 * Materializa pendientes de la reunión en el módulo de Tareas (y opcionalmente
 * como entregables del proyecto). Es idempotente por pendiente: uno que ya tiene
 * `taskId` se salta en vez de duplicarse.
 */
export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    select: { id: true, title: true, meetingDate: true, projectId: true },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds.map(String) : [];
  const asDeliverables = body.asDeliverables === true;

  if (itemIds.length === 0) {
    return NextResponse.json({ error: "No se seleccionó ningún pendiente" }, { status: 400 });
  }
  if (asDeliverables && !meeting.projectId) {
    return NextResponse.json(
      { error: "La reunión no está ligada a un proyecto, no se pueden crear entregables." },
      { status: 400 }
    );
  }

  const items = await prisma.meetingActionItem.findMany({
    where: { id: { in: itemIds }, meetingId: id },
    orderBy: { sortOrder: "asc" },
  });

  const created: string[] = [];
  const skipped: string[] = [];

  for (const item of items) {
    if (item.taskId) {
      skipped.push(item.id);
      continue;
    }

    const description = buildTaskDescription({
      detail: item.detail,
      acceptance: item.acceptance,
      touchpoints: item.touchpoints,
      meetingTitle: meeting.title,
      meetingDate: meeting.meetingDate,
    });

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: item.title,
        description,
        assignee: item.owner,
        priority: item.priority,
        dueDate: item.dueDate,
        allDay: true,
      },
    });

    let deliverableId: string | null = null;
    if (asDeliverables && meeting.projectId && item.kind === "TECNICO") {
      const deliverable = await prisma.deliverable.create({
        data: {
          projectId: meeting.projectId,
          name: item.title,
          description: item.detail,
          dueDate: item.dueDate,
          sortOrder: item.sortOrder,
          source: "AI_MEETING",
        },
      });
      deliverableId = deliverable.id;
    }

    await prisma.meetingActionItem.update({
      where: { id: item.id },
      data: { taskId: task.id, ...(deliverableId ? { deliverableId } : {}) },
    });
    created.push(item.id);
  }

  const refreshed = await prisma.meetingActionItem.findMany({
    where: { meetingId: id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    created: created.length,
    skipped: skipped.length,
    actionItems: refreshed.map(serializeMeetingActionItem),
  });
});
