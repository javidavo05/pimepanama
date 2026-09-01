import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import {
  serializeMeeting,
  serializeMeetingActionItem,
  serializeMeetingSpeaker,
} from "@/lib/meetings/serialize";
import { loadSegments } from "@/lib/meetings/segments";
import type { ExecutiveMinutes, TechnicalMinutes } from "@/lib/meetings/types";
import { MeetingDetail } from "./meeting-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { id }, select: { title: true } });
  return { title: meeting ? `${meeting.title} — Reunión` : "Reunión" };
}

export default async function ReunionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getEmpresaUser();
  const { id } = await params;

  // Los proyectos y clientes viajan con la reunión para poder asignarla a un
  // proyecto después de grabada, sin salir del detalle.
  const [meeting, segments, projects, clients] = await Promise.all([
    prisma.meeting.findFirst({
      where: { id, userId: user.id },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, company: true } },
        speakers: { orderBy: { talkMs: "desc" } },
        actionItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    // Los segmentos alimentan la transcripción y los saltos al audio.
    loadSegments(id),
    prisma.project.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, clientId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!meeting) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <MeetingDetail
        meeting={serializeMeeting(meeting, segments.length)}
        segments={segments}
        project={meeting.project}
        client={meeting.client}
        projects={projects}
        clients={clients}
        speakers={meeting.speakers.map(serializeMeetingSpeaker)}
        actionItems={meeting.actionItems.map(serializeMeetingActionItem)}
        executive={meeting.executiveMinutes as unknown as ExecutiveMinutes | null}
        technical={meeting.technicalMinutes as unknown as TechnicalMinutes | null}
      />
    </div>
  );
}
