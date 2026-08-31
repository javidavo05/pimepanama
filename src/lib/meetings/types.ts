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
  extends Omit<Meeting, "meetingDate" | "createdAt" | "updatedAt" | "attendees" | "segments"> {
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
  attendees: MeetingAttendee[];
  segments: MeetingSegment[];
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
