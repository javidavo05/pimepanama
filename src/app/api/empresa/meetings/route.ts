import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeMeeting } from "@/lib/meetings/serialize";
import { parseAttendees } from "@/lib/meetings/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("projectId") ?? undefined;
  const clientId = sp.get("clientId") ?? undefined;
  const status = sp.get("status") ?? undefined;

  const meetings = await prisma.meeting.findMany({
    where: {
      userId: user.id,
      ...(projectId && { projectId }),
      ...(clientId && { clientId }),
      ...(status && { status: status as never }),
    },
    include: {
      project: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, company: true } },
      _count: { select: { actionItems: true } },
    },
    orderBy: { meetingDate: "desc" },
  });

  return NextResponse.json(
    meetings.map((m) => ({
      ...serializeMeeting(m),
      project: m.project,
      client: m.client,
      _count: m._count,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await requireEmpresaUser(req);
  const body = await req.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  // Verificamos pertenencia del proyecto antes de enlazarlo: el projectId viene
  // del cliente y es la llave que da acceso a todo el contexto acumulado.
  let projectId: string | null = null;
  if (typeof body.projectId === "string" && body.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId: user.id },
      select: { id: true, clientId: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    projectId = project.id;
    if (!body.clientId && project.clientId) body.clientId = project.clientId;
  }

  let clientId: string | null = null;
  if (typeof body.clientId === "string" && body.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, userId: user.id },
      select: { id: true },
    });
    clientId = client?.id ?? null;
  }

  const meeting = await prisma.meeting.create({
    data: {
      userId: user.id,
      title,
      projectId,
      clientId,
      language: body.language === "en" ? "en" : "es",
      meetingDate: body.meetingDate ? new Date(body.meetingDate) : new Date(),
      attendees: parseAttendees(body.attendees) as unknown as object[],
      status: "DRAFT",
    },
  });

  return NextResponse.json(serializeMeeting(meeting), { status: 201 });
}
