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
    | "proposalDraftedAt"
    | "attendees"
    | "segments"
    | "chapters"
    | "audioChunks"
    | "technicalDeliverable"
  > {
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
  minutesSentAt: string | null;
  proposalDraftedAt: string | null;
  attendees: MeetingAttendee[];
  chapters: MeetingChapter[];
  audioChunks: MeetingAudioChunk[];
  /** El entregable técnico de la reunión; toda reunión deja uno */
  technicalDeliverable: TechnicalDeliverable | null;
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

/**
 * Qué clase de entregable técnico deja la reunión. Toda reunión deja uno:
 * incluso un seguimiento donde no se decidió nada nuevo deja el estado del
 * entregable en curso, que es información y no un vacío.
 */
export type DeliverableKind =
  | "SISTEMA_NUEVO"
  | "MODIFICACION"
  | "PROPUESTA_COMERCIAL"
  | "CONTRATO"
  | "MANTENIMIENTO"
  | "SEGUIMIENTO";

/** Hacia dónde va el entregable una vez definido. */
export type DeliverableDestination = "PROPUESTA" | "CONTRATO" | "DESARROLLO";

export interface TechnicalDeliverable {
  kind: DeliverableKind;
  title: string;
  /** Qué hay que construir o entregar, en prosa, para quien no estuvo */
  summary: string;
  scope: string[];
  /** Lo que explícitamente queda fuera, para que no se construya de más */
  outOfScope: string[];
  acceptance: string[];
  /** Archivos, módulos o pantallas REALES del repositorio que toca */
  touchedAreas: string[];
  /** Lo que ya existe en el código y se reutiliza en vez de rehacer */
  reuse: string[];
  estimateHours: number | null;
  /** Lo que impide empezar: accesos, decisiones, contenido del cliente */
  blockers: string[];
  /** Cómo hacerlo dado lo que el repositorio ya tiene */
  recommendation: string;
  readyFor: DeliverableDestination;
}

export const DELIVERABLE_KINDS: DeliverableKind[] = [
  "SISTEMA_NUEVO",
  "MODIFICACION",
  "PROPUESTA_COMERCIAL",
  "CONTRATO",
  "MANTENIMIENTO",
  "SEGUIMIENTO",
];

export function parseTechnicalDeliverable(value: unknown): TechnicalDeliverable | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const title = typeof rec.title === "string" ? rec.title.trim() : "";
  if (!title) return null;

  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : [];
  const hours = Number(rec.estimateHours);

  return {
    kind: DELIVERABLE_KINDS.includes(rec.kind as DeliverableKind)
      ? (rec.kind as DeliverableKind)
      : "MODIFICACION",
    title,
    summary: typeof rec.summary === "string" ? rec.summary.trim() : "",
    scope: list(rec.scope),
    outOfScope: list(rec.outOfScope),
    acceptance: list(rec.acceptance),
    touchedAreas: list(rec.touchedAreas),
    reuse: list(rec.reuse),
    estimateHours: Number.isFinite(hours) && hours > 0 ? hours : null,
    blockers: list(rec.blockers),
    recommendation: typeof rec.recommendation === "string" ? rec.recommendation.trim() : "",
    readyFor:
      rec.readyFor === "PROPUESTA" || rec.readyFor === "CONTRATO" ? rec.readyFor : "DESARROLLO",
  };
}

/**
 * De dónde salió el audio de la reunión. Cambia cómo se separan las voces y cómo
 * se redacta la minuta: una llamada son dos personas turnándose sin verse, una
 * sala son varias voces solapándose, y una nota de voz es una sola persona.
 */
export type MeetingAudioSource =
  | "VIDEOLLAMADA"
  | "LLAMADA"
  | "PRESENCIAL"
  | "NOTA_VOZ"
  | "OTRO";

const AUDIO_SOURCES: MeetingAudioSource[] = [
  "VIDEOLLAMADA",
  "LLAMADA",
  "PRESENCIAL",
  "NOTA_VOZ",
  "OTRO",
];

export function parseAudioSource(value: unknown): MeetingAudioSource | null {
  return AUDIO_SOURCES.includes(value as MeetingAudioSource)
    ? (value as MeetingAudioSource)
    : null;
}

/** Lo que el modelo necesita saber del origen para no equivocarse de escenario. */
export function describeAudioSource(source: string | null | undefined): string {
  switch (source) {
    case "VIDEOLLAMADA":
      return "El audio viene de una videollamada (Meet, Zoom o Teams). Los turnos son limpios: la gente se interrumpe poco y casi nunca hablan dos a la vez.";
    case "LLAMADA":
      return "El audio viene de una llamada telefónica. Casi siempre son DOS personas alternándose, así que no inventes un tercer hablante salvo que sea evidente que alguien más entró a la línea.";
    case "PRESENCIAL":
      return "El audio viene de una reunión presencial grabada en una sala. Espera ruido de fondo, voces que se solapan y frases que empiezan antes de que la otra persona termine; algunos fragmentos serán inaudibles.";
    case "NOTA_VOZ":
      return "El audio es una nota de voz: habla UNA sola persona. No lo redactes como una conversación ni atribuyas nada a un segundo hablante.";
    default:
      return "No se declaró de dónde salió el audio.";
  }
}
