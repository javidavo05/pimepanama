import type { MeetingStatus, Prisma } from "@prisma/client";

const STATUSES: MeetingStatus[] = [
  "DRAFT",
  "RECORDING",
  "TRANSCRIBED",
  "PROCESSING",
  "READY",
  "FAILED",
];

export interface MeetingListFilters {
  q?: string;
  projectId?: string;
  clientId?: string;
  status?: string;
}

/**
 * Filtro del listado de reuniones. La búsqueda no se queda en el título: entra
 * a la transcripción, a las notas de contexto y al resumen, porque lo normal es
 * acordarse de lo que se dijo en una reunión y no de cómo se llamaba.
 */
export function meetingSearchFilter(
  userId: string,
  { q, projectId, clientId, status }: MeetingListFilters
): Prisma.MeetingWhereInput {
  const term = q?.trim();

  return {
    userId,
    ...(projectId ? { projectId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(status && STATUSES.includes(status as MeetingStatus)
      ? { status: status as MeetingStatus }
      : {}),
    ...(term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            { transcript: { contains: term, mode: "insensitive" } },
            { diarizedText: { contains: term, mode: "insensitive" } },
            { contextSummary: { contains: term, mode: "insensitive" } },
            { manualContext: { contains: term, mode: "insensitive" } },
            { actionItems: { some: { title: { contains: term, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}
