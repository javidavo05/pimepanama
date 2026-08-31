import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { deleteR2Object } from "@/lib/r2";
import {
  serializeMeeting,
  serializeMeetingActionItem,
  serializeMeetingSpeaker,
} from "@/lib/meetings/serialize";
import { parseAttendees } from "@/lib/meetings/types";

export const runtime = "nodejs";

async function loadMeeting(userId: string, id: string) {
  return prisma.meeting.findFirst({
    where: { id, userId },
    include: {
      project: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, company: true } },
      speakers: { orderBy: { talkMs: "desc" } },
      actionItems: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export const GET = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const meeting = await loadMeeting(user.id, id);
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...serializeMeeting(meeting),
    project: meeting.project,
    client: meeting.client,
    speakers: meeting.speakers.map(serializeMeetingSpeaker),
    actionItems: meeting.actionItems.map(serializeMeetingActionItem),
  });
});

export const PATCH = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const existing = await prisma.meeting.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (body.language === "es" || body.language === "en") data.language = body.language;
  if (body.meetingDate) data.meetingDate = new Date(body.meetingDate);
  if (body.attendees !== undefined) data.attendees = parseAttendees(body.attendees);
  if (typeof body.transcript === "string") data.transcript = body.transcript;
  if (typeof body.diarizedText === "string") data.diarizedText = body.diarizedText;
  if (typeof body.technicalPrompt === "string") data.technicalPrompt = body.technicalPrompt;
  if (typeof body.contextSummary === "string") data.contextSummary = body.contextSummary;
  if (typeof body.durationMs === "number") data.durationMs = Math.max(0, Math.round(body.durationMs));

  if (body.projectId !== undefined) {
    if (body.projectId === null || body.projectId === "") {
      data.projectId = null;
    } else {
      const project = await prisma.project.findFirst({
        where: { id: body.projectId, userId: user.id },
        select: { id: true },
      });
      if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      data.projectId = project.id;
    }
  }

  if (body.clientId !== undefined) {
    if (body.clientId === null || body.clientId === "") {
      data.clientId = null;
    } else {
      const client = await prisma.client.findFirst({
        where: { id: body.clientId, userId: user.id },
        select: { id: true },
      });
      data.clientId = client?.id ?? null;
    }
  }

  const meeting = await prisma.meeting.update({ where: { id }, data });
  return NextResponse.json(serializeMeeting(meeting));
});

export const DELETE = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    select: { id: true, audioKeys: true },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // El audio en R2 no se borra en cascada con la fila; se limpia aquí.
  // Si R2 falla no abortamos el borrado: la fila es la fuente de verdad.
  await Promise.allSettled(meeting.audioKeys.map((key) => deleteR2Object(key)));
  await prisma.meeting.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
