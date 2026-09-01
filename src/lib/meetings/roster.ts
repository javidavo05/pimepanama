import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orgForSpeaker, speakerStats } from "./transcript";
import type { MeetingAttendee, MeetingSegment } from "./types";

/** Una etiqueta genérica no es el nombre de nadie: la fila queda sin `name`. */
function resolveName(label: string): string | null {
  return label.startsWith("Hablante") || label === "Desconocido" ? null : label;
}

/**
 * Recalcula quién habló y cuánto a partir de la transcripción. Se rehace entera
 * en vez de actualizarse fila por fila: la lista de hablantes es una vista
 * derivada de los segmentos, y cualquier cosa que los cambie —la diarización,
 * asignar un canal, renombrar una etiqueta— la invalida completa.
 */
export function rebuildRosterOps(
  meetingId: string,
  segments: MeetingSegment[],
  attendees: MeetingAttendee[]
): Prisma.PrismaPromise<unknown>[] {
  const stats = speakerStats(segments);
  return [
    prisma.meetingSpeaker.deleteMany({ where: { meetingId } }),
    prisma.meetingSpeaker.createMany({
      data: [...stats.entries()].map(([label, s]) => ({
        meetingId,
        label,
        name: resolveName(label),
        org: orgForSpeaker(label, attendees),
        segmentCount: s.segmentCount,
        talkMs: s.talkMs,
      })),
    }),
  ];
}

export async function rebuildRoster(
  meetingId: string,
  segments: MeetingSegment[],
  attendees: MeetingAttendee[]
): Promise<void> {
  await prisma.$transaction(rebuildRosterOps(meetingId, segments, attendees));
}
