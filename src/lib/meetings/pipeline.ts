import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import {
  actionItemsPrompt,
  askPrompt,
  chaptersPrompt,
  diarizationPrompt,
  contractDraftPrompt,
  masterPromptPrompt,
  mergeItemsPrompt,
  mergeMinutesPrompt,
  minutesPrompt,
  partialPass,
  technicalDeliverablePrompt,
  technicalPromptPrompt,
} from "./prompts";
import { chunkTranscript, clampTranscript, numberedSegments, parseTimestamp } from "./transcript";
import { parseTechnicalDeliverable } from "./types";
import type {
  DraftActionItem,
  ExecutiveMinutes,
  MeetingAttendee,
  MeetingChapter,
  MeetingSegment,
  TechnicalDeliverable,
  TechnicalMinutes,
} from "./types";

const MODEL = "gpt-4o";
/** Segmentos por llamada de diarización — acota tokens de salida y permite arrastrar el roster. */
const DIARIZATION_BATCH = 100;
/** Tope de caracteres de transcripción por llamada de análisis (~40k tokens de entrada). */
const MAX_TRANSCRIPT_CHARS = 60_000;
/**
 * Tamaño de cada tramo cuando la reunión no cabe en una llamada. Es menor que el
 * tope para dejarle sitio al prompt y al contexto del proyecto, que viajan con
 * cada tramo.
 */
const CHUNK_CHARS = 40_000;

export interface AiCallResult<T> {
  data: T;
  costUSD: number;
  inputTokens: number;
  outputTokens: number;
}

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Response(JSON.stringify({ error: "OPENAI_API_KEY no configurada" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new OpenAI({ apiKey });
}

async function jsonCall<T>(
  openai: OpenAI,
  system: string,
  user: string,
  maxTokens: number
): Promise<AiCallResult<T>> {
  const resp = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.25,
    max_tokens: maxTokens,
  });

  const inputTokens = resp.usage?.prompt_tokens ?? 0;
  const outputTokens = resp.usage?.completion_tokens ?? 0;

  let data: T;
  try {
    data = JSON.parse(resp.choices[0]?.message?.content ?? "{}") as T;
  } catch {
    data = {} as T;
  }

  return { data, costUSD: calcGptCost(inputTokens, outputTokens), inputTokens, outputTokens };
}

export async function logMeetingAiUsage(
  supabaseUid: string,
  operation: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number
): Promise<void> {
  await prisma.aiUsageLog.create({
    data: { supabaseUid, operation, model: MODEL, inputTokens, outputTokens, durationMs },
  });
}

// ─── Paso 1: diarización ─────────────────────────────────────────────────────

interface Assignment {
  i: number;
  speaker: string;
}

/**
 * Asigna un hablante a cada segmento que todavía no lo tenga. Procesa por lotes
 * y arrastra el roster de hablantes ya identificados, para que el hablante 2 del
 * minuto 40 sea el mismo que el del minuto 3 y no una persona nueva.
 *
 * Los segmentos que llegan con hablante ya resuelto —los que vinieron de un
 * canal de audio propio, o los que una persona asignó a mano— se respetan tal
 * cual: se le muestran al modelo como contexto pero nunca se reasignan. Si la
 * reunión se grabó con micrófono y llamada en canales separados, esta pasada no
 * tiene nada que adivinar y no cuesta nada.
 *
 * El modelo nunca reescribe el texto: solo devuelve `{i, speaker}` y nosotros
 * re-pegamos por índice sobre los segmentos originales de Whisper.
 */
export async function runDiarization(
  openai: OpenAI,
  segments: MeetingSegment[],
  attendees: MeetingAttendee[],
  projectContext: string,
  audioSource?: string | null
): Promise<AiCallResult<MeetingSegment[]>> {
  const assigned: MeetingSegment[] = segments.map((s) => ({ ...s }));
  const knownSpeakers = new Set<string>(
    segments.flatMap((s) => (s.speaker ? [s.speaker] : []))
  );
  let costUSD = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  const pendingCount = segments.filter((s) => !s.speaker).length;

  for (let offset = 0; offset < segments.length && pendingCount > 0; offset += DIARIZATION_BATCH) {
    const batch = segments.slice(offset, offset + DIARIZATION_BATCH);
    const pending = batch.flatMap((s, i) => (s.speaker ? [] : [offset + i]));
    // Un lote entero ya atribuido por canal no se le manda al modelo.
    if (pending.length === 0) continue;

    const system = diarizationPrompt(attendees, [...knownSpeakers], projectContext, audioSource);
    const user = `Transcripción (índice global, timestamp, texto). Las líneas que ya traen «Nombre» delante están confirmadas: úsalas como referencia, no las reasignes.\n\n${numberedSegments(batch, offset)}\n\nDevuelve la asignación de hablante SOLO para estos índices: ${pending.join(", ")}.`;

    const result = await jsonCall<{ assignments?: Assignment[] }>(
      openai,
      system,
      user,
      Math.min(4000, pending.length * 30 + 500)
    );

    costUSD += result.costUSD;
    inputTokens += result.inputTokens;
    outputTokens += result.outputTokens;

    for (const a of result.data.assignments ?? []) {
      const idx = Number(a?.i);
      const speaker = typeof a?.speaker === "string" ? a.speaker.trim() : "";
      if (!speaker || !Number.isInteger(idx) || !assigned[idx]) continue;
      // Un hablante confirmado por canal o a mano no se pisa con una inferencia.
      if (assigned[idx].locked || segments[idx].speaker) continue;
      assigned[idx].speaker = speaker;
      knownSpeakers.add(speaker);
    }
  }

  // Los índices que el modelo se saltó heredan el hablante anterior: en una
  // conversación real la continuidad es mucho más probable que un cambio.
  let last = "Desconocido";
  for (const seg of assigned) {
    if (seg.speaker) last = seg.speaker;
    else seg.speaker = last;
  }

  return { data: assigned, costUSD, inputTokens, outputTokens };
}

// ─── Paso 2: minutas ─────────────────────────────────────────────────────────

export interface MinutesResult {
  executive: ExecutiveMinutes;
  technical: TechnicalMinutes;
}

/**
 * Suma el costo y los tokens de varias llamadas encadenadas, para que una etapa
 * de N pasadas se contabilice como una sola.
 */
class CostTally {
  costUSD = 0;
  inputTokens = 0;
  outputTokens = 0;

  add<T>(result: AiCallResult<T>): T {
    this.costUSD += result.costUSD;
    this.inputTokens += result.inputTokens;
    this.outputTokens += result.outputTokens;
    return result.data;
  }

  wrap<T>(data: T): AiCallResult<T> {
    return {
      data,
      costUSD: this.costUSD,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    };
  }
}

/**
 * Minuta ejecutiva + minuta técnica.
 *
 * Una reunión que cabe en una llamada se analiza de una. Una que no cabe —a
 * partir de un par de horas— se analiza por tramos y luego se fusiona, en vez de
 * recortarla: antes se truncaba a 60k caracteres y el final de la reunión, que
 * es justo donde se cierran los acuerdos, no llegaba nunca al modelo.
 */
export async function runMinutes(
  openai: OpenAI,
  diarizedText: string,
  attendees: MeetingAttendee[],
  projectContext: string,
  audioSource?: string | null
): Promise<AiCallResult<MinutesResult>> {
  const chunks = chunkTranscript(diarizedText, CHUNK_CHARS);
  const tally = new CostTally();

  if (chunks.length <= 1) {
    const data = tally.add(
      await jsonCall<Partial<MinutesResult>>(
        openai,
        minutesPrompt(attendees, projectContext, audioSource),
        `Transcripción atribuida por hablante:\n\n${clampTranscript(diarizedText, MAX_TRANSCRIPT_CHARS)}`,
        3000
      )
    );
    return tally.wrap({
      executive: normalizeExecutive(data.executive),
      technical: normalizeTechnical(data.technical),
    });
  }

  const partials: Partial<MinutesResult>[] = [];
  for (let i = 0; i < chunks.length; i++) {
    partials.push(
      tally.add(
        await jsonCall<Partial<MinutesResult>>(
          openai,
          minutesPrompt(attendees, projectContext, audioSource) + partialPass(i, chunks.length),
          `Transcripción atribuida por hablante — tramo ${i + 1} de ${chunks.length}:\n\n${chunks[i]}`,
          3000
        )
      )
    );
  }

  const merged = tally.add(
    await jsonCall<Partial<MinutesResult>>(
      openai,
      mergeMinutesPrompt(attendees, projectContext),
      `Minutas parciales de los ${chunks.length} tramos, en orden cronológico:\n\n${partials
        .map((p, i) => `### Tramo ${i + 1}\n${JSON.stringify(p)}`)
        .join("\n\n")}`,
      3000
    )
  );

  return tally.wrap({
    executive: normalizeExecutive(merged.executive),
    technical: normalizeTechnical(merged.technical),
  });
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
}

function normalizeExecutive(raw: unknown): ExecutiveMinutes {
  const rec = (raw ?? {}) as Record<string, unknown>;
  return {
    agenda: str(rec.agenda),
    decisions: strArray(rec.decisions),
    commitments: strArray(rec.commitments),
    risks: strArray(rec.risks),
    nextSteps: str(rec.nextSteps),
    nextMeeting: str(rec.nextMeeting, "Por agendar"),
  };
}

function normalizeTechnical(raw: unknown): TechnicalMinutes {
  const rec = (raw ?? {}) as Record<string, unknown>;
  const changes = Array.isArray(rec.changes)
    ? rec.changes.flatMap((c) => {
        if (!c || typeof c !== "object") return [];
        const cr = c as Record<string, unknown>;
        const what = str(cr.what);
        if (!what) return [];
        return [{ area: str(cr.area, "General"), what, why: str(cr.why) }];
      })
    : [];

  return {
    summary: str(rec.summary),
    architecture: strArray(rec.architecture),
    changes,
    dependencies: strArray(rec.dependencies),
    openQuestions: strArray(rec.openQuestions),
  };
}

// ─── Paso 3: pendientes ──────────────────────────────────────────────────────

const KINDS = ["TECNICO", "COMERCIAL", "ADMINISTRATIVO", "DECISION", "RIESGO"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export async function runActionItems(
  openai: OpenAI,
  diarizedText: string,
  technical: TechnicalMinutes,
  attendees: MeetingAttendee[],
  projectContext: string
): Promise<AiCallResult<DraftActionItem[]>> {
  const technicalDigest = [
    technical.summary,
    technical.changes.map((c) => `- [${c.area}] ${c.what} (motivo: ${c.why})`).join("\n"),
    technical.dependencies.length > 0 ? `Dependencias: ${technical.dependencies.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const chunks = chunkTranscript(diarizedText, CHUNK_CHARS);
  const tally = new CostTally();
  let rawItems: unknown[];

  if (chunks.length <= 1) {
    rawItems =
      tally.add(
        await jsonCall<{ items?: unknown[] }>(
          openai,
          actionItemsPrompt(attendees, projectContext),
          `Minuta técnica de la reunión:\n${technicalDigest}\n\n---\n\nTranscripción atribuida:\n\n${clampTranscript(diarizedText, MAX_TRANSCRIPT_CHARS)}`,
          3000
        )
      ).items ?? [];
  } else {
    // Reunión larga: pendientes por tramo y una pasada final que los fusiona,
    // porque el mismo encargo suele mencionarse en dos tramos distintos.
    const partials: unknown[][] = [];
    for (let i = 0; i < chunks.length; i++) {
      const part = tally.add(
        await jsonCall<{ items?: unknown[] }>(
          openai,
          actionItemsPrompt(attendees, projectContext) + partialPass(i, chunks.length),
          `Minuta técnica de la reunión completa:\n${technicalDigest}\n\n---\n\nTranscripción atribuida — tramo ${i + 1} de ${chunks.length}:\n\n${chunks[i]}`,
          2500
        )
      );
      partials.push(part.items ?? []);
    }

    rawItems =
      tally.add(
        await jsonCall<{ items?: unknown[] }>(
          openai,
          mergeItemsPrompt(attendees, projectContext),
          `Pendientes extraídos de cada tramo, en orden cronológico:\n\n${partials
            .map((items, i) => `### Tramo ${i + 1}\n${JSON.stringify(items)}`)
            .join("\n\n")}`,
          3000
        )
      ).items ?? [];
  }

  const items: DraftActionItem[] = rawItems.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    const title = str(rec.title);
    if (!title) return [];

    const kind = KINDS.includes(rec.kind as (typeof KINDS)[number])
      ? (rec.kind as DraftActionItem["kind"])
      : "TECNICO";
    const priority = PRIORITIES.includes(rec.priority as (typeof PRIORITIES)[number])
      ? (rec.priority as DraftActionItem["priority"])
      : "MEDIUM";
    const due = str(rec.dueDate);
    const hours = Number(rec.estimateHours);

    return [
      {
        title,
        detail: str(rec.detail) || undefined,
        kind,
        owner: str(rec.owner) || undefined,
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
        priority,
        acceptance: strArray(rec.acceptance),
        touchpoints: strArray(rec.touchpoints),
        estimateHours: Number.isFinite(hours) && hours > 0 ? hours : null,
      },
    ];
  });

  return tally.wrap(items);
}

// ─── Paso 4: prompt técnico + memoria del proyecto ───────────────────────────

export interface TechnicalPromptResult {
  technicalPrompt: string;
  contextSummary: string;
}

export async function runTechnicalPrompt(
  openai: OpenAI,
  technical: TechnicalMinutes,
  executiveDecisions: string[],
  items: DraftActionItem[],
  projectContext: string,
  meetingTitle: string,
  deliverable: TechnicalDeliverable | null,
  hasRepo: boolean
): Promise<AiCallResult<TechnicalPromptResult>> {
  const itemsDigest = items
    .filter((i) => i.kind === "TECNICO" || i.kind === "DECISION")
    .map((i) => {
      const acceptance = i.acceptance.length > 0 ? `\n  Aceptación: ${i.acceptance.join(" | ")}` : "";
      const touch = i.touchpoints.length > 0 ? `\n  Toca: ${i.touchpoints.join(", ")}` : "";
      return `- (${i.kind}/${i.priority}) ${i.title}${i.detail ? `\n  ${i.detail}` : ""}${acceptance}${touch}`;
    })
    .join("\n");

  const user = `Reunión: ${meetingTitle}

Decisiones tomadas:
${executiveDecisions.map((d) => `- ${d}`).join("\n") || "(ninguna registrada)"}

Minuta técnica:
${technical.summary}

Decisiones de arquitectura:
${technical.architecture.map((a) => `- ${a}`).join("\n") || "(ninguna)"}

Cambios identificados:
${technical.changes.map((c) => `- [${c.area}] ${c.what} — porque: ${c.why}`).join("\n") || "(ninguno)"}

Dependencias pendientes:
${technical.dependencies.map((d) => `- ${d}`).join("\n") || "(ninguna)"}

Preguntas abiertas:
${technical.openQuestions.map((q) => `- ${q}`).join("\n") || "(ninguna)"}

Pendientes técnicos derivados:
${itemsDigest || "(ninguno)"}

${deliverable ? describeDeliverable(deliverable) : "Entregable técnico: no se determinó."}`;

  const result = await jsonCall<Partial<TechnicalPromptResult>>(
    openai,
    // Con repositorio conectado el encargo puede nombrar archivos reales; sin él
    // se escribe en términos de "localizar el módulo que…".
    hasRepo ? masterPromptPrompt(projectContext, true) : technicalPromptPrompt(projectContext),
    user,
    4000
  );

  return {
    ...result,
    data: {
      technicalPrompt: str(result.data.technicalPrompt),
      contextSummary: str(result.data.contextSummary),
    },
  };
}

// ─── Capítulos: el índice de temas de la reunión ─────────────────────────────

/**
 * Parte la reunión en temas con su minuto. Es lo que convierte una hora de audio
 * en algo que se puede recorrer: se lee el índice y se salta a donde importa.
 *
 * El modelo copia timestamps que ya vio en la transcripción; aquí se validan
 * contra la duración real y se descarta cualquiera inventado.
 */
export async function runChapters(
  openai: OpenAI,
  diarizedText: string,
  durationMs: number,
  projectContext: string
): Promise<AiCallResult<MeetingChapter[]>> {
  const result = await jsonCall<{ chapters?: unknown[] }>(
    openai,
    chaptersPrompt(projectContext),
    `Transcripción atribuida por hablante, con timestamps:\n\n${clampTranscript(diarizedText, MAX_TRANSCRIPT_CHARS)}`,
    2000
  );

  const seen = new Set<number>();
  const chapters: MeetingChapter[] = (result.data.chapters ?? [])
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const rec = raw as Record<string, unknown>;
      const title = str(rec.title);
      const startMs = parseTimestamp(str(rec.start));
      if (!title || startMs === null) return [];
      // Un capítulo fuera de la reunión es un timestamp inventado.
      if (durationMs > 0 && startMs > durationMs) return [];
      if (seen.has(startMs)) return [];
      seen.add(startMs);
      return [{ startMs, title, summary: str(rec.summary) } satisfies MeetingChapter];
    })
    .sort((a, b) => a.startMs - b.startMs);

  return { ...result, data: chapters };
}

// ─── Preguntarle a la reunión ────────────────────────────────────────────────

export interface MeetingCitation {
  /** ms desde el inicio de la reunión */
  startMs: number;
  speaker: string;
  quote: string;
}

export interface MeetingAnswer {
  answer: string;
  citations: MeetingCitation[];
}

/**
 * Responde una pregunta sobre lo que se dijo, citando el minuto exacto. La cita
 * es lo que hace la respuesta comprobable: se puede ir a escuchar ese momento en
 * vez de creerle al modelo.
 *
 * En una reunión larga se pregunta tramo por tramo y luego se juntan las
 * respuestas; un tramo que no sabe nada del tema se descarta.
 */
export async function runAsk(
  openai: OpenAI,
  diarizedText: string,
  question: string,
  attendees: MeetingAttendee[],
  projectContext: string
): Promise<AiCallResult<MeetingAnswer>> {
  const chunks = chunkTranscript(diarizedText, CHUNK_CHARS);
  const tally = new CostTally();

  const passes: MeetingAnswer[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const system =
      chunks.length > 1
        ? askPrompt(attendees, projectContext) + partialPass(i, chunks.length)
        : askPrompt(attendees, projectContext);
    const data = tally.add(
      await jsonCall<{ answer?: unknown; citations?: unknown[] }>(
        openai,
        system,
        `Transcripción atribuida${chunks.length > 1 ? ` — tramo ${i + 1} de ${chunks.length}` : ""}:\n\n${chunks[i]}\n\n---\n\nPregunta: ${question}`,
        1200
      )
    );
    passes.push(normalizeAnswer(data));
  }

  if (passes.length === 0) {
    return tally.wrap({ answer: "Esta reunión no tiene transcripción todavía.", citations: [] });
  }
  if (passes.length === 1) return tally.wrap(passes[0]);

  // Los tramos que no encontraron nada no aportan: se quedan los que citan algo.
  const withEvidence = passes.filter((p) => p.citations.length > 0);
  if (withEvidence.length === 0) return tally.wrap(passes[0]);

  return tally.wrap({
    answer: withEvidence.map((p) => p.answer).join(" "),
    citations: withEvidence.flatMap((p) => p.citations).sort((a, b) => a.startMs - b.startMs),
  });
}

function normalizeAnswer(raw: { answer?: unknown; citations?: unknown[] }): MeetingAnswer {
  const citations: MeetingCitation[] = (raw.citations ?? []).flatMap((c) => {
    if (!c || typeof c !== "object") return [];
    const rec = c as Record<string, unknown>;
    const quote = str(rec.quote);
    const startMs = parseTimestamp(str(rec.time));
    if (!quote || startMs === null) return [];
    return [{ startMs, speaker: str(rec.speaker, "Desconocido"), quote }];
  });

  return { answer: str(raw.answer, "No se pudo responder con esta transcripción."), citations };
}

// ─── El entregable técnico de la reunión ─────────────────────────────────────

/** El entregable resumido, para que el master prompt se construya sobre él. */
export function describeDeliverable(d: TechnicalDeliverable): string {
  const section = (label: string, items: string[]) =>
    items.length > 0 ? `\n${label}:\n${items.map((i) => `- ${i}`).join("\n")}` : "";

  return `Entregable técnico (${d.kind}, va a ${d.readyFor}): ${d.title}
${d.summary}${section("Alcance", d.scope)}${section("Fuera de alcance", d.outOfScope)}${section("Criterios de aceptación", d.acceptance)}${section("Toca en el código", d.touchedAreas)}${section("Se reutiliza", d.reuse)}${section("Bloqueos", d.blockers)}${
    d.recommendation ? `\nRecomendación técnica: ${d.recommendation}` : ""
  }`;
}

/**
 * Determina qué entregable técnico deja la reunión. Siempre devuelve uno: en un
 * entorno técnico una reunión sin entregable identificado es una minuta que
 * nadie ejecuta, así que hasta un seguimiento deja el estado de lo que está en
 * curso.
 */
export async function runTechnicalDeliverable(
  openai: OpenAI,
  diarizedText: string,
  technical: TechnicalMinutes,
  items: DraftActionItem[],
  projectContext: string,
  meetingTitle: string,
  hasRepo: boolean
): Promise<AiCallResult<TechnicalDeliverable | null>> {
  const itemsDigest = items
    .map((i) => `- (${i.kind}/${i.priority}) ${i.title}${i.detail ? ` — ${i.detail}` : ""}`)
    .join("\n");

  const user = `Reunión: ${meetingTitle}

Minuta técnica:
${technical.summary || "(sin resumen)"}

Decisiones de arquitectura:
${technical.architecture.map((a) => `- ${a}`).join("\n") || "(ninguna)"}

Cambios identificados:
${technical.changes.map((c) => `- [${c.area}] ${c.what} — porque: ${c.why}`).join("\n") || "(ninguno)"}

Dependencias pendientes:
${technical.dependencies.map((d) => `- ${d}`).join("\n") || "(ninguna)"}

Preguntas abiertas:
${technical.openQuestions.map((q) => `- ${q}`).join("\n") || "(ninguna)"}

Pendientes extraídos:
${itemsDigest || "(ninguno)"}

---

Transcripción atribuida:

${clampTranscript(diarizedText, MAX_TRANSCRIPT_CHARS)}`;

  const result = await jsonCall<unknown>(
    openai,
    technicalDeliverablePrompt(projectContext, hasRepo),
    user,
    2500
  );

  return { ...result, data: parseTechnicalDeliverable(result.data) };
}

// ─── Borrador de contrato ────────────────────────────────────────────────────

export interface ContractDraft {
  title: string;
  description: string;
  responsibilities: string;
  terms: string;
}

/**
 * Redacta el alcance contractual del entregable acordado. Es lo que convierte
 * "quedamos en que hacen los pagos parciales" en algo que se puede firmar.
 */
export async function runContractDraft(
  openai: OpenAI,
  deliverable: TechnicalDeliverable,
  executiveDecisions: string[],
  projectContext: string,
  meetingTitle: string
): Promise<AiCallResult<ContractDraft>> {
  const user = `Reunión: ${meetingTitle}

Decisiones tomadas:
${executiveDecisions.map((d) => `- ${d}`).join("\n") || "(ninguna registrada)"}

${describeDeliverable(deliverable)}`;

  const result = await jsonCall<Partial<ContractDraft>>(
    openai,
    contractDraftPrompt(projectContext),
    user,
    2500
  );

  return {
    ...result,
    data: {
      title: str(result.data.title, deliverable.title),
      description: str(result.data.description),
      responsibilities: str(result.data.responsibilities),
      terms: str(result.data.terms),
    },
  };
}
