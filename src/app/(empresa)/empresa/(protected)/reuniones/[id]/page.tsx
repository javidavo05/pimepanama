import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import {
  serializeMeeting,
  serializeMeetingActionItem,
  serializeMeetingSpeaker,
} from "@/lib/meetings/serialize";
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

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: {
      project: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, company: true } },
      speakers: { orderBy: { talkMs: "desc" } },
      actionItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!meeting) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <MeetingDetail
        meeting={serializeMeeting(meeting)}
        project={meeting.project}
        client={meeting.client}
        speakers={meeting.speakers.map(serializeMeetingSpeaker)}
        actionItems={meeting.actionItems.map(serializeMeetingActionItem)}
        executive={meeting.executiveMinutes as unknown as ExecutiveMinutes | null}
        technical={meeting.technicalMinutes as unknown as TechnicalMinutes | null}
      />
    </div>
  );
}
