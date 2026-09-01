import type { MeetingAttendee, MeetingChannel, MeetingSegment } from "./types";

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

/**
 * "mm:ss" o "h:mm:ss" → ms. Es la vuelta de `formatTimestamp`: el modelo copia
 * los timestamps de la transcripción tal como los ve, y aquí se convierten en el
 * número con el que se salta el audio.
 */
export function parseTimestamp(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [h, m, s] = parts.length === 3 ? nums : [0, nums[0], nums[1]];
  return ((h * 60 + m) * 60 + s) * 1000;
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
 *
 * Los segmentos cuyo hablante ya se conoce (porque vinieron de un canal de audio
 * separado o porque una persona lo asignó a mano) se listan con el nombre
 * delante. No son para que el modelo los reasigne: son el ancla que le dice de
 * quién es la voz que responde alrededor.
 */
export function numberedSegments(segments: MeetingSegment[], offset = 0): string {
  return segments
    .map((seg, i) => {
      const known = seg.speaker ? `«${seg.speaker}» ` : "";
      return `[${offset + i}] (${formatTimestamp(seg.start)}) ${known}${seg.text}`;
    })
    .join("\n");
}

/** Un turno de conversación: lo que dijo una persona antes de que hablara otra. */
export interface SpeakerTurn {
  speaker: string;
  channel?: MeetingChannel;
  /** ms desde el inicio de la reunión */
  start: number;
  text: string;
}

/**
 * Agrupa segmentos consecutivos del mismo hablante en un solo turno, para que la
 * conversación se lea como conversación y no como una lista de fragmentos.
 * Lo usan tanto la vista en vivo como la transcripción final.
 */
export function groupTurns(
  segments: MeetingSegment[],
  labelFor: (seg: MeetingSegment) => string = (seg) => seg.speaker ?? "Desconocido"
): SpeakerTurn[] {
  const turns: (SpeakerTurn & { parts: string[] })[] = [];

  for (const seg of segments) {
    const speaker = labelFor(seg);
    const last = turns[turns.length - 1];
    if (last && last.speaker === speaker) {
      last.parts.push(seg.text);
    } else {
      turns.push({ speaker, channel: seg.channel, start: seg.start, text: "", parts: [seg.text] });
    }
  }

  return turns.map(({ parts, ...turn }) => ({ ...turn, text: parts.join(" ") }));
}

/** Transcripción atribuida, en markdown. */
export function buildDiarizedText(segments: MeetingSegment[]): string {
  return groupTurns(segments)
    .map((t) => `**${t.speaker}** (${formatTimestamp(t.start)}): ${t.text}`)
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
 * suele estar el encuadre de la reunión. Es el último recurso: para una reunión
 * larga se usa `chunkTranscript`, que no tira nada.
 */
export function clampTranscript(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[...transcripción truncada por longitud...]`;
}

/**
 * Parte la transcripción atribuida en bloques que caben en una llamada, cortando
 * siempre entre turnos: un turno nunca queda partido a la mitad, porque medio
 * turno sin su cierre se lee como una decisión que no se tomó.
 *
 * Una reunión que cabe entera devuelve un solo bloque, y entonces el pipeline
 * hace exactamente lo que hacía antes: una llamada, sin pasada de fusión.
 */
export function chunkTranscript(text: string, maxChars: number): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed ? [trimmed] : [];

  const chunks: string[] = [];
  let current = "";

  for (const turn of trimmed.split("\n\n")) {
    // Un turno más largo que el bloque entero (una intervención kilométrica) se
    // parte por caracteres: es preferible a descartarlo.
    if (turn.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < turn.length; i += maxChars) {
        chunks.push(turn.slice(i, i + maxChars));
      }
      continue;
    }
    if (current.length + turn.length + 2 > maxChars) {
      chunks.push(current);
      current = turn;
    } else {
      current = current ? `${current}\n\n${turn}` : turn;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
