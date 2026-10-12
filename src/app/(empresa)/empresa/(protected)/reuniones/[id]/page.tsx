import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import {
  serializeMeeting,
  serializeMeetingActionItem,
  serializeMeetingSpeaker,
} from "@/lib/meetings/serialize";
import { loadSegments } from "@/lib/meetings/segments";
import type { ExecutiveMinutes } from "@/lib/meetings/types";
import { parseTechnicalMinutes } from "@/lib/meetings/technical";
import { loadTaskWorkspace } from "@/lib/tasks";
import { TaskWorkspace } from "@/components/empresa/tasks/task-workspace";
import { MeetingDetail } from "./meeting-detail";
import { proyectosCandidatos } from "@/lib/proyectos/candidatos";
import { MOTIVO_LABEL, sugerirProyecto } from "@/lib/proyectos/sugerir-proyecto";

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
        project: { select: { id: true, name: true, repoOwner: true, repoSnapshot: true } },
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

  // Las tareas del proyecto (y las que salieron de esta reunión aunque no
  // tenga proyecto): los pendientes muestran su estado real y se pueden
  // completar desde aquí.
  const linkedTaskIds = [
    ...meeting.actionItems.map((i) => i.taskId),
    meeting.nextMeetingTaskId,
  ].filter((x): x is string => Boolean(x));
  const [workspace, candidatos] = await Promise.all([
    loadTaskWorkspace(user.id, meeting.projectId, linkedTaskIds),
    // Sin proyecto: se sugiere uno (por cliente, título o notas) para asignarlo de un toque.
    meeting.projectId ? Promise.resolve([]) : proyectosCandidatos(user.id),
  ]);
  const sug = meeting.projectId ? null : sugerirProyecto(meeting, candidatos);
  const sugerido = sug ? { id: sug.projectId, name: candidatos.find((p) => p.id === sug.projectId)?.name ?? "", motivo: MOTIVO_LABEL[sug.motivo] } : null;

  return (
    <div className="max-w-4xl mx-auto">
      <TaskWorkspace tasks={workspace.tasks} projects={workspace.projects}>
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
        technical={parseTechnicalMinutes(meeting.technicalMinutes)}
        hasRepo={meeting.project?.repoSnapshot != null}
        sugerido={sugerido}
      />
      </TaskWorkspace>
    </div>
  );
}
