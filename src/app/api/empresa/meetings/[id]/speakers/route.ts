import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { rebuildRoster } from "@/lib/meetings/roster";
import { assignChannelSpeaker, loadSegments, renameSpeakerLabel } from "@/lib/meetings/segments";
import { buildDiarizedText } from "@/lib/meetings/transcript";
import { parseAttendees, type MeetingChannel } from "@/lib/meetings/types";

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
    select: { id: true, attendees: true, diarizedText: true },
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

  // Cada reasignación es un UPDATE con WHERE sobre los segmentos afectados: no
  // hace falta traerse la transcripción para reescribirla entera.
  for (const c of channels) {
    await assignChannelSpeaker(id, c.channel, c.speaker || null);
  }
  for (const l of labels) {
    await renameSpeakerLabel(id, l.from, l.to);
  }

  const segments = await loadSegments(id);
  const attendees = parseAttendees(meeting.attendees);
  // La transcripción atribuida solo se rearma si ya existía: durante la
  // grabación todavía no hay, y no queremos generarla a medias.
  const diarizedText = meeting.diarizedText ? buildDiarizedText(segments) : null;

  await rebuildRoster(id, segments, attendees);
  if (diarizedText) {
    await prisma.meeting.update({ where: { id }, data: { diarizedText } });
  }

  return NextResponse.json({ ok: true, segments, diarizedText });
});
