import type { MeetingAttendee, MeetingSegment } from "./types";

/** ms → "mm:ss" (o "h:mm:ss" si pasa de la hora) */
export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, "0")}`
    : `${mm}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}min`;
}

/**
 * Segmentos numerados para la pasada de diarización. El índice es el contrato:
 * el modelo responde con `{ i, speaker }` y nosotros re-pegamos por índice, así
 * el modelo nunca reescribe el texto de la transcripción.
 */
export function numberedSegments(segments: MeetingSegment[], offset = 0): string {
  return segments
    .map((seg, i) => `[${offset + i}] (${formatTimestamp(seg.start)}) ${seg.text}`)
    .join("\n");
}

/**
 * Transcripción atribuida, en markdown. Agrupa segmentos consecutivos del mismo
 * hablante en un solo turno para que se lea como una conversación y no como una
 * lista de fragmentos.
 */
export function buildDiarizedText(segments: MeetingSegment[]): string {
  const turns: { speaker: string; start: number; parts: string[] }[] = [];

  for (const seg of segments) {
    const speaker = seg.speaker ?? "Desconocido";
    const last = turns[turns.length - 1];
    if (last && last.speaker === speaker) {
      last.parts.push(seg.text);
    } else {
      turns.push({ speaker, start: seg.start, parts: [seg.text] });
    }
  }

  return turns
    .map((t) => `**${t.speaker}** (${formatTimestamp(t.start)}): ${t.parts.join(" ")}`)
    .join("\n\n");
}

/** Estadísticas de participación por hablante, para el panel de hablantes. */
export function speakerStats(
  segments: MeetingSegment[]
): Map<string, { segmentCount: number; talkMs: number }> {
  const stats = new Map<string, { segmentCount: number; talkMs: number }>();
  for (const seg of segments) {
    const key = seg.speaker ?? "Desconocido";
    const prev = stats.get(key) ?? { segmentCount: 0, talkMs: 0 };
    stats.set(key, {
      segmentCount: prev.segmentCount + 1,
      talkMs: prev.talkMs + Math.max(0, seg.end - seg.start),
    });
  }
  return stats;
}

/** Resuelve la organización de un hablante buscándolo en la lista de asistentes. */
export function orgForSpeaker(name: string, attendees: MeetingAttendee[]): string {
  const match = attendees.find(
    (a) => a.name.toLowerCase() === name.trim().toLowerCase()
  );
  return match?.org ?? "DESCONOCIDO";
}

export function describeAttendees(attendees: MeetingAttendee[]): string {
  if (attendees.length === 0) return "(no se declararon asistentes)";
  return attendees
    .map((a) => {
      const org = a.org === "PIME" ? "equipo Pime" : a.org === "CLIENTE" ? "cliente" : "sin definir";
      return `- ${a.name} — ${org}${a.role ? `, ${a.role}` : ""}`;
    })
    .join("\n");
}

/**
 * Recorta la transcripción por el final conservando el inicio, que es donde
 * suele estar el encuadre de la reunión.
 */
export function clampTranscript(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[...transcripción truncada por longitud...]`;
}
