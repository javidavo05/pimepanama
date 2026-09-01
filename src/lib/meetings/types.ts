import type { Meeting, MeetingActionItem, MeetingSpeaker } from "@prisma/client";

/** Organización a la que pertenece un asistente. */
export type AttendeeOrg = "PIME" | "CLIENTE" | "DESCONOCIDO";

/** Asistente declarado antes de grabar; es la lista contra la que se resuelven los hablantes. */
export interface MeetingAttendee {
  name: string;
  org: AttendeeOrg;
  role?: string;
}

/**
 * Canal físico del que salió el audio. Cuando se graba con dos fuentes
 * separadas (micrófono por un lado, audio de la llamada por el otro) el canal
 * ya dice quién habló sin necesidad de IA: eso es lo que permite ver la
 * conversación atribuida en vivo.
 */
export type MeetingChannel = "LOCAL" | "REMOTE";

/** Segmento crudo de Whisper, con timestamps absolutos en ms desde el inicio de la reunión. */
export interface MeetingSegment {
  /** ms desde el inicio de la reunión */
  start: number;
  /** ms desde el inicio de la reunión */
  end: number;
  text: string;
  /** Etiqueta del hablante, asignada por el canal (en vivo) o por la diarización */
  speaker?: string;
  /** Fuente de audio; ausente en grabaciones de un solo canal mezclado */
  channel?: MeetingChannel;
  /**
   * `true` cuando el hablante viene del canal y no de la IA. La diarización no
   * toca estos segmentos: el hardware ya sabe más que el modelo.
   */
  locked?: boolean;
}

/** Un tramo de audio archivado en R2 y dónde cae dentro de la reunión. */
export interface MeetingAudioChunk {
  key: string;
  channel?: MeetingChannel;
  index: number;
  /** ms desde el inicio de la reunión */
  offsetMs: number;
  durationMs: number;
  mime: string;
}

/** Un tema de la reunión, para poder saltar directo a donde se habló de él. */
export interface MeetingChapter {
  /** ms desde el inicio de la reunión */
  startMs: number;
  title: string;
  summary: string;
}

export interface ExecutiveMinutes {
  /** Prosa de 2-4 oraciones: de qué se habló y por qué */
  agenda: string;
  decisions: string[];
  /** Compromisos asumidos frente al cliente */
  commitments: string[];
  risks: string[];
  nextSteps: string;
  nextMeeting: string;
}

export interface TechnicalChange {
  area: string;
  what: string;
  why: string;
}

export interface TechnicalMinutes {
  /** Resumen técnico en prosa para quien no estuvo en la reunión */
  summary: string;
  /** Decisiones de arquitectura o enfoque técnico tomadas */
  architecture: string[];
  changes: TechnicalChange[];
  /** Dependencias externas, accesos o insumos que hacen falta */
  dependencies: string[];
  /** Lo que quedó ambiguo y hay que preguntar antes de construir */
  openQuestions: string[];
}

export interface DraftActionItem {
  title: string;
  detail?: string;
  kind: "TECNICO" | "COMERCIAL" | "ADMINISTRATIVO" | "DECISION" | "RIESGO";
  owner?: string;
  dueDate?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  acceptance: string[];
  touchpoints: string[];
  estimateHours?: number | null;
}

export interface SerializedMeeting
  extends Omit<
    Meeting,
    | "meetingDate"
    | "createdAt"
    | "updatedAt"
    | "minutesSentAt"
    | "attendees"
    | "segments"
    | "chapters"
    | "audioChunks"
  > {
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
  minutesSentAt: string | null;
  attendees: MeetingAttendee[];
  chapters: MeetingChapter[];
  audioChunks: MeetingAudioChunk[];
  /** Cuántas intervenciones tiene la transcripción, sin traerlas todas */
  segmentCount: number;
}

export interface SerializedMeetingActionItem
  extends Omit<MeetingActionItem, "dueDate" | "createdAt" | "updatedAt"> {
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedMeetingSpeaker extends Omit<MeetingSpeaker, "createdAt"> {
  createdAt: string;
}

export interface SerializedMeetingFull extends SerializedMeeting {
  segments: MeetingSegment[];
  speakers: SerializedMeetingSpeaker[];
  actionItems: SerializedMeetingActionItem[];
  project: { id: string; name: string } | null;
  client: { id: string; name: string; company: string | null } | null;
}

export function parseAttendees(value: unknown): MeetingAttendee[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) return [];
    const org = rec.org === "PIME" || rec.org === "CLIENTE" ? rec.org : "DESCONOCIDO";
    const role = typeof rec.role === "string" && rec.role.trim() ? rec.role.trim() : undefined;
    return [{ name, org, role } satisfies MeetingAttendee];
  });
}

export function parseSegments(value: unknown): MeetingSegment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (!text) return [];
    return [
      {
        start: Number(rec.start) || 0,
        end: Number(rec.end) || 0,
        text,
        speaker: typeof rec.speaker === "string" ? rec.speaker : undefined,
        channel: rec.channel === "LOCAL" || rec.channel === "REMOTE" ? rec.channel : undefined,
        locked: rec.locked === true ? true : undefined,
      } satisfies MeetingSegment,
    ];
  });
}

export function parseChapters(value: unknown): MeetingChapter[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title.trim() : "";
    if (!title) return [];
    return [
      {
        startMs: Math.max(0, Number(rec.startMs) || 0),
        title,
        summary: typeof rec.summary === "string" ? rec.summary.trim() : "",
      } satisfies MeetingChapter,
    ];
  });
}

export function parseAudioChunks(value: unknown): MeetingAudioChunk[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const rec = raw as Record<string, unknown>;
      const key = typeof rec.key === "string" ? rec.key : "";
      if (!key) return [];
      return [
        {
          key,
          channel: rec.channel === "LOCAL" || rec.channel === "REMOTE" ? rec.channel : undefined,
          index: Number(rec.index) || 0,
          offsetMs: Math.max(0, Number(rec.offsetMs) || 0),
          durationMs: Math.max(0, Number(rec.durationMs) || 0),
          mime: typeof rec.mime === "string" && rec.mime ? rec.mime : "audio/webm",
        } satisfies MeetingAudioChunk,
      ];
    })
    .sort((a, b) => a.offsetMs - b.offsetMs);
}
