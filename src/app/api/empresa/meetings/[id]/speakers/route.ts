import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { buildDiarizedText, orgForSpeaker, speakerStats } from "@/lib/meetings/transcript";
import {
  parseAttendees,
  parseSegments,
  type MeetingChannel,
  type MeetingSegment,
} from "@/lib/meetings/types";

export const runtime = "nodejs";

interface ChannelRename {
  channel: MeetingChannel;
  /** Cadena vacía = desasignar: el canal vuelve a manos de la diarización. */
  speaker: string;
}

interface LabelRename {
  from: string;
  to: string;
}

/**
 * Reasigna quién es quién. Sirve en dos momentos:
 *
 * - **En vivo**, mientras se graba: el usuario elige qué persona es cada canal
 *   de audio y todos los segmentos ya transcritos de ese canal se re-etiquetan
 *   al instante, hacia atrás y hacia adelante.
 * - **Después**, en el detalle: renombrar una etiqueta que la IA dejó como
 *   "Hablante 2" al nombre real de la persona.
 *
 * Los segmentos re-etiquetados quedan `locked`: la diarización no los vuelve a
 * tocar, porque una asignación hecha por una persona vale más que una inferida.
 */
export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    select: { id: true, segments: true, attendees: true, diarizedText: true },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const channels: ChannelRename[] = Array.isArray(body?.channels)
    ? body.channels.flatMap((raw: unknown) => {
        const rec = (raw ?? {}) as Record<string, unknown>;
        const channel = rec.channel === "LOCAL" || rec.channel === "REMOTE" ? rec.channel : null;
        if (!channel || typeof rec.speaker !== "string") return [];
        return [{ channel, speaker: rec.speaker.trim().slice(0, 80) } satisfies ChannelRename];
      })
    : [];

  const labels: LabelRename[] = Array.isArray(body?.labels)
    ? body.labels.flatMap((raw: unknown) => {
        const rec = (raw ?? {}) as Record<string, unknown>;
        const from = typeof rec.from === "string" ? rec.from.trim() : "";
        const to = typeof rec.to === "string" ? rec.to.trim().slice(0, 80) : "";
        return from && to ? [{ from, to } satisfies LabelRename] : [];
      })
    : [];

  if (channels.length === 0 && labels.length === 0) {
    return NextResponse.json({ error: "Nada que reasignar" }, { status: 400 });
  }

  const byChannel = new Map(channels.map((c) => [c.channel, c.speaker]));
  const byLabel = new Map(labels.map((l) => [l.from, l.to]));

  const segments: MeetingSegment[] = parseSegments(meeting.segments).map((seg) => {
    const fromChannel = seg.channel ? byChannel.get(seg.channel) : undefined;
    if (fromChannel !== undefined) {
      return fromChannel
        ? { ...seg, speaker: fromChannel, locked: true }
        : { ...seg, speaker: undefined, locked: undefined };
    }
    const renamed = seg.speaker ? byLabel.get(seg.speaker) : undefined;
    if (renamed) return { ...seg, speaker: renamed, locked: true };
    return seg;
  });

  const attendees = parseAttendees(meeting.attendees);
  // La transcripción atribuida solo se rearma si ya existía: durante la
  // grabación todavía no hay, y no queremos generarla a medias.
  const diarizedText = meeting.diarizedText ? buildDiarizedText(segments) : null;
  const stats = speakerStats(segments);

  await prisma.$transaction([
    prisma.meeting.update({
      where: { id },
      data: {
        segments: segments as unknown as object[],
        ...(diarizedText ? { diarizedText } : {}),
      },
    }),
    prisma.meetingSpeaker.deleteMany({ where: { meetingId: id } }),
    prisma.meetingSpeaker.createMany({
      data: [...stats.entries()].map(([label, s]) => ({
        meetingId: id,
        label,
        name: label.startsWith("Hablante") || label === "Desconocido" ? null : label,
        org: orgForSpeaker(label, attendees),
        segmentCount: s.segmentCount,
        talkMs: s.talkMs,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, segments, diarizedText });
});
