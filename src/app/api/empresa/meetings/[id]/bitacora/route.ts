import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { ensurePimeOwner } from "@/lib/bitacora-attendees";
import { parseAttendees, type ExecutiveMinutes } from "@/lib/meetings/types";

export const runtime = "nodejs";

/**
 * Emite la bitácora formal (Document tipo BITACORA) a partir de la minuta
 * ejecutiva de la reunión — el documento que sí sale hacia el cliente y que ya
 * tiene plantilla de PDF. La minuta técnica y el prompt se quedan adentro.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: {
      project: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true, company: true } },
    },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (meeting.bitacoraId) {
    return NextResponse.json(
      { error: "Esta reunión ya emitió su bitácora.", documentId: meeting.bitacoraId },
      { status: 409 }
    );
  }

  const executive = meeting.executiveMinutes as unknown as ExecutiveMinutes | null;
  if (!executive) {
    return NextResponse.json(
      { error: "Genera primero la minuta ejecutiva." },
      { status: 400 }
    );
  }

  const attendees = parseAttendees(meeting.attendees);
  const actionItems = await prisma.meetingActionItem.findMany({
    where: { meetingId: id },
    orderBy: { sortOrder: "asc" },
    select: { title: true, owner: true, dueDate: true },
  });

  const year = new Date().getFullYear();
  const count = await prisma.document.count({ where: { type: "BITACORA", userId: user.id } });
  const number = `BIT-${year}-${String(count + 1).padStart(4, "0")}`;

  const decisions = [...executive.decisions, ...executive.commitments].join("\n");
  const actionItemsText = actionItems
    .map((i) => {
      const owner = i.owner ?? "Por definir";
      const due = i.dueDate ? i.dueDate.toISOString().split("T")[0] : "Por definir";
      return `${i.title} (${owner}) — ${due}`;
    })
    .join("\n");

  const document = await prisma.document.create({
    data: {
      type: "BITACORA",
      status: "DRAFT",
      number,
      title: meeting.title,
      language: meeting.language,
      userId: user.id,
      clientId: meeting.clientId,
      clientName: meeting.client?.name ?? undefined,
      clientEmail: meeting.client?.email ?? undefined,
      clientCompany: meeting.client?.company ?? undefined,
      projectId: meeting.projectId,
      issueDate: meeting.meetingDate,
      content: {
        project: meeting.project?.name ?? meeting.title,
        attendees: attendees
          .filter((a) => a.org === "CLIENTE")
          .map((a) => a.name)
          .join(", "),
        pimeAttendees: ensurePimeOwner(
          attendees
            .filter((a) => a.org === "PIME")
            .map((a) => a.name)
            .join(", ")
        ),
        agenda: executive.agenda,
        decisions,
        actionItems: actionItemsText,
        nextMeeting: executive.nextMeeting,
        rawNotes: meeting.diarizedText ?? meeting.transcript ?? "",
      },
    },
  });

  await prisma.meeting.update({ where: { id }, data: { bitacoraId: document.id } });

  return NextResponse.json({ documentId: document.id, number }, { status: 201 });
}
