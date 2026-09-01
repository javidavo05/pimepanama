import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import type { ExecutiveMinutes } from "@/lib/meetings/types";

export const runtime = "nodejs";

/**
 * Convierte la "próxima reunión" de la minuta en una tarea del calendario.
 *
 * Es el compromiso que más se pierde: queda escrito en la minuta, nadie lo
 * agenda, y a las dos semanas el proyecto está parado esperando una reunión que
 * nunca se convocó. La tarea nace con la fecha que se acordó y con el contexto
 * de qué había quedado pendiente.
 */
export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: { project: { select: { name: true } }, client: { select: { name: true } } },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (meeting.nextMeetingTaskId) {
    return NextResponse.json(
      { error: "La próxima reunión ya está agendada.", taskId: meeting.nextMeetingTaskId },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawDate = typeof body.dueDate === "string" ? body.dueDate.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    return NextResponse.json({ error: "Elige la fecha de la próxima reunión." }, { status: 400 });
  }
  // Mediodía: una fecha suelta interpretada como medianoche UTC se corre de día
  // en la zona de Panamá.
  const dueDate = new Date(rawDate.length === 10 ? `${rawDate}T12:00:00` : rawDate);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const executive = meeting.executiveMinutes as unknown as ExecutiveMinutes | null;
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : `Reunión de seguimiento — ${meeting.project?.name ?? meeting.client?.name ?? meeting.title}`;

  const context = [
    executive?.nextMeeting && executive.nextMeeting !== "Por agendar"
      ? `Acordado en la reunión: ${executive.nextMeeting}`
      : "",
    executive?.nextSteps ? `Próximos pasos que quedaron:\n${executive.nextSteps}` : "",
    `Origen: reunión "${meeting.title}" del ${meeting.meetingDate.toISOString().split("T")[0]}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title,
      description: context,
      dueDate,
      allDay: body.allDay !== false,
      priority: "MEDIUM",
    },
  });

  await prisma.meeting.update({ where: { id }, data: { nextMeetingTaskId: task.id } });

  return NextResponse.json({ taskId: task.id, title, dueDate: dueDate.toISOString() }, { status: 201 });
});
