import type { MeetingSegment as SegmentRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MeetingChannel, MeetingSegment } from "./types";

/**
 * Acceso a la transcripción. Desde la migración 0025 los segmentos viven en su
 * propia tabla y no en un JSONB de `Meeting`: grabando, cada tramo de 8 s
 * inserta solo sus filas en vez de reescribir la transcripción entera, y
 * renombrar un hablante es un UPDATE con WHERE en vez de un rewrite completo.
 */

function toDomain(row: SegmentRow): MeetingSegment {
  return {
    start: row.startMs,
    end: row.endMs,
    text: row.text,
    speaker: row.speaker ?? undefined,
    channel: (row.channel as MeetingChannel | null) ?? undefined,
    locked: row.locked ? true : undefined,
  };
}

function toRow(meetingId: string, seg: MeetingSegment) {
  return {
    meetingId,
    startMs: Math.max(0, Math.round(seg.start)),
    endMs: Math.max(0, Math.round(seg.end)),
    text: seg.text,
    speaker: seg.speaker ?? null,
    channel: seg.channel ?? null,
    locked: seg.locked === true,
  };
}

/**
 * Filas por INSERT. Postgres admite 65 535 parámetros por sentencia y cada
 * segmento gasta siete, así que una reunión de varias horas se pasaría del
 * límite en un solo `createMany`.
 */
const INSERT_BATCH = 2_000;

function batches<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += INSERT_BATCH) {
    out.push(items.slice(i, i + INSERT_BATCH));
  }
  return out;
}

export async function loadSegments(meetingId: string): Promise<MeetingSegment[]> {
  const rows = await prisma.meetingSegment.findMany({
    where: { meetingId },
    orderBy: { startMs: "asc" },
  });
  return rows.map(toDomain);
}

export function countSegments(meetingId: string): Promise<number> {
  return prisma.meetingSegment.count({ where: { meetingId } });
}

/** Añade los segmentos de un tramo recién transcrito. */
export async function appendSegments(
  meetingId: string,
  segments: MeetingSegment[]
): Promise<void> {
  if (segments.length === 0) return;
  for (const batch of batches(segments)) {
    await prisma.meetingSegment.createMany({ data: batch.map((s) => toRow(meetingId, s)) });
  }
}

/**
 * Reemplaza la transcripción completa. Lo usa la diarización, que devuelve los
 * mismos segmentos con el hablante resuelto; nada referencia el id de un
 * segmento, así que regenerarlos no rompe nada.
 */
export async function replaceSegments(
  meetingId: string,
  segments: MeetingSegment[]
): Promise<void> {
  await prisma.$transaction([
    prisma.meetingSegment.deleteMany({ where: { meetingId } }),
    ...batches(segments).map((batch) =>
      prisma.meetingSegment.createMany({ data: batch.map((s) => toRow(meetingId, s)) })
    ),
  ]);
}

/**
 * Asigna (o desasigna, con `null`) la persona de un canal de audio. Es lo que
 * corrige en vivo lo ya transcrito cuando el usuario dice quién es cada voz.
 */
export function assignChannelSpeaker(
  meetingId: string,
  channel: MeetingChannel,
  speaker: string | null
): Promise<{ count: number }> {
  return prisma.meetingSegment.updateMany({
    where: { meetingId, channel },
    data: { speaker, locked: speaker !== null },
  });
}

/** Renombra una etiqueta genérica ("Hablante 2") al nombre real de la persona. */
export function renameSpeakerLabel(
  meetingId: string,
  from: string,
  to: string
): Promise<{ count: number }> {
  return prisma.meetingSegment.updateMany({
    where: { meetingId, speaker: from },
    data: { speaker: to, locked: true },
  });
}

/** Transcripción plana en orden cronológico, para los análisis sin atribuir. */
export function flatten(segments: MeetingSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}
