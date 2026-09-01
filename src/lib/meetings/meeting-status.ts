import type { MeetingStatus } from "@prisma/client";

/**
 * En qué estado queda una reunión después de una etapa del pipeline.
 *
 * Antes cada etapa fijaba el estado a mano y las intermedias dejaban
 * `PROCESSING`: correr solo «Minutas» o solo «Pendientes» desde el detalle
 * dejaba la reunión marcada como procesando para siempre, aunque hubiera
 * terminado. El estado se deriva de lo que la reunión ya tiene, no de qué
 * etapa acaba de correr.
 */
export function resolveMeetingStatus(meeting: {
  technicalPrompt: string | null;
  segmentCount: number;
}): MeetingStatus {
  if (meeting.technicalPrompt?.trim()) return "READY";
  if (meeting.segmentCount > 0) return "TRANSCRIBED";
  return "DRAFT";
}
