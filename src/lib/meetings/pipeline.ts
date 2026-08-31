import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import {
  actionItemsPrompt,
  diarizationPrompt,
  minutesPrompt,
  technicalPromptPrompt,
} from "./prompts";
import { clampTranscript, numberedSegments } from "./transcript";
import type {
  DraftActionItem,
  ExecutiveMinutes,
  MeetingAttendee,
  MeetingSegment,
  TechnicalMinutes,
} from "./types";

const MODEL = "gpt-4o";
/** Segmentos por llamada de diarización — acota tokens de salida y permite arrastrar el roster. */
const DIARIZATION_BATCH = 100;
/** Tope de caracteres de transcripción por llamada de análisis (~40k tokens de entrada). */
const MAX_TRANSCRIPT_CHARS = 60_000;

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
 * Asigna un hablante a cada segmento. Procesa por lotes y arrastra el roster de
 * hablantes ya identificados, para que el hablante 2 del minuto 40 sea el mismo
 * que el del minuto 3 y no una persona nueva.
 *
 * El modelo nunca reescribe el texto: solo devuelve `{i, speaker}` y nosotros
 * re-pegamos por índice sobre los segmentos originales de Whisper.
 */
export async function runDiarization(
  openai: OpenAI,
  segments: MeetingSegment[],
  attendees: MeetingAttendee[],
  projectContext: string
): Promise<AiCallResult<MeetingSegment[]>> {
  const assigned: MeetingSegment[] = segments.map((s) => ({ ...s }));
  const knownSpeakers = new Set<string>();
  let costUSD = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (let offset = 0; offset < segments.length; offset += DIARIZATION_BATCH) {
    const batch = segments.slice(offset, offset + DIARIZATION_BATCH);
    const system = diarizationPrompt(attendees, [...knownSpeakers], projectContext);
    const user = `Transcripción (índice global, timestamp, texto):\n\n${numberedSegments(batch, offset)}\n\nDevuelve la asignación de hablante para los índices ${offset} a ${offset + batch.length - 1}.`;

    const result = await jsonCall<{ assignments?: Assignment[] }>(
      openai,
      system,
      user,
      Math.min(4000, batch.length * 30 + 500)
    );

    costUSD += result.costUSD;
    inputTokens += result.inputTokens;
    outputTokens += result.outputTokens;

    for (const a of result.data.assignments ?? []) {
      const idx = Number(a?.i);
      const speaker = typeof a?.speaker === "string" ? a.speaker.trim() : "";
      if (!speaker || !Number.isInteger(idx) || !assigned[idx]) continue;
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

export async function runMinutes(
  openai: OpenAI,
  diarizedText: string,
  attendees: MeetingAttendee[],
  projectContext: string
): Promise<AiCallResult<MinutesResult>> {
  const result = await jsonCall<Partial<MinutesResult>>(
    openai,
    minutesPrompt(attendees, projectContext),
    `Transcripción atribuida por hablante:\n\n${clampTranscript(diarizedText, MAX_TRANSCRIPT_CHARS)}`,
    3000
  );

  return {
    ...result,
    data: {
      executive: normalizeExecutive(result.data.executive),
      technical: normalizeTechnical(result.data.technical),
    },
  };
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

  const result = await jsonCall<{ items?: unknown[] }>(
    openai,
    actionItemsPrompt(attendees, projectContext),
    `Minuta técnica de la reunión:\n${technicalDigest}\n\n---\n\nTranscripción atribuida:\n\n${clampTranscript(diarizedText, MAX_TRANSCRIPT_CHARS)}`,
    3000
  );

  const items: DraftActionItem[] = (result.data.items ?? []).flatMap((raw) => {
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

  return { ...result, data: items };
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
  meetingTitle: string
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
${itemsDigest || "(ninguno)"}`;

  const result = await jsonCall<Partial<TechnicalPromptResult>>(
    openai,
    technicalPromptPrompt(projectContext),
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
