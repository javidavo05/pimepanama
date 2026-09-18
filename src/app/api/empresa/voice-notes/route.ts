import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";
import { calcGptCost, calcWhisperCost } from "@/lib/ai-pricing";
import { applyGlossary, WHISPER_PROMPT } from "@/lib/voice-notes/glossary";
import { deleteR2Object, getR2Object } from "@/lib/r2";
import { MAX_VOICE_NOTE_BYTES, voiceNoteKeyPrefix } from "@/lib/voice-notes/storage";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Bajo este avg_logprob un tramo se marca como dudoso (mismo umbral que la skill). */
const LOW_CONFIDENCE = -1.0;
const INTERPRET_MODEL = "gpt-4o";

/**
 * Whisper decide el formato por la extensión del nombre. WhatsApp guarda sus
 * notas como .opus, que es Opus dentro de Ogg: renombrado a .ogg lo acepta.
 */
function whisperFileName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "wav", "webm"].includes(ext)) {
    return `nota.${ext}`;
  }
  return "nota.ogg";
}

function mmss(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const INTERPRET_PROMPT = `Recibes la transcripción de una nota de voz de WhatsApp que le mandaron a Javier (Pime Panamá, desarrollo de software). Devuelve JSON con esta forma exacta:
{"resumen": string, "acciones": string[], "dudas": string[]}

- resumen: una o dos frases con lo que la persona quiere en total.
- acciones: lo que pide que se haga, concreto y en orden. Una por elemento, empezando por verbo.
- dudas: partes ambiguas, contradicciones o ideas que sonaron a descartadas. Vacío si no hay.

Reglas:
- Separa instrucción, contexto y pensamiento en voz alta. Lo que la persona descarta a mitad de frase ("podríamos... no, mejor no") NO es acción.
- Si dice una cosa y más adelante otra sobre el mismo punto, manda la última.
- Números dictados en cifras ("cuarenta y cinco mil" → 45,000).
- No inventes nada que no esté en el audio. Si hay pocas acciones, devuelve pocas.
- Español neutro y directo, sin relleno.`;

export const POST = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  const { key, name, type } = (await request.json().catch(() => ({}))) as {
    key?: string;
    name?: string;
    type?: string;
  };

  // El audio ya está en R2 (ver upload-url): aquí solo llega la clave.
  if (typeof key !== "string" || !key.startsWith(voiceNoteKeyPrefix(user.id))) {
    return NextResponse.json({ error: "No llegó ningún audio." }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    const object = await getR2Object(key);
    buffer = Buffer.from(await object.Body!.transformToByteArray());
  } catch (err) {
    console.error("[voice-notes] r2 get", err);
    return NextResponse.json({ error: "No se encontró el audio subido. Reintenta." }, { status: 404 });
  } finally {
    // La nota no se guarda: se borra en cuanto está en memoria.
    await deleteR2Object(key).catch((err) => console.error("[voice-notes] r2 delete", err));
  }

  if (buffer.length === 0) {
    return NextResponse.json({ error: "El archivo llegó vacío." }, { status: 400 });
  }
  if (buffer.length > MAX_VOICE_NOTE_BYTES) {
    return NextResponse.json(
      { error: "Pesa más de 25 MB. Para una grabación larga usa «Grabar reunión → Subir audio»." },
      { status: 413 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let transcription: OpenAI.Audio.TranscriptionVerbose;
  const started = Date.now();
  try {
    transcription = await openai.audio.transcriptions.create({
      file: await toFile(buffer, whisperFileName(name ?? key), { type: type || "audio/ogg" }),
      model: "whisper-1",
      language: "es",
      prompt: WHISPER_PROMPT,
      response_format: "verbose_json",
    });
  } catch (err) {
    console.error("[voice-notes] whisper", err);
    return NextResponse.json(
      { error: "No se pudo transcribir. Revisa que sea un audio (ogg, opus, m4a, mp3, wav)." },
      { status: 422 }
    );
  }

  const durationSec = transcription.duration ?? 0;
  const { text, corrections } = applyGlossary(transcription.text.trim());
  const doubtful = (transcription.segments ?? [])
    .filter((s) => s.avg_logprob < LOW_CONFIDENCE && s.text.trim())
    .map((s) => `${mmss(s.start)}–${mmss(s.end)}: ${applyGlossary(s.text.trim()).text}`);

  await prisma.aiUsageLog.create({
    data: {
      supabaseUid: user.supabaseUid,
      operation: "voice-note-transcribe",
      model: "whisper-1",
      durationMs: Math.round(durationSec * 1000),
    },
  });

  let costUSD = calcWhisperCost(durationSec * 1000);
  let interpretation: { resumen: string; acciones: string[]; dudas: string[] } | null = null;

  if (text) {
    try {
      const resp = await openai.chat.completions.create({
        model: INTERPRET_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INTERPRET_PROMPT },
          { role: "user", content: text },
        ],
      });
      const parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
      interpretation = {
        resumen: typeof parsed.resumen === "string" ? parsed.resumen : "",
        acciones: Array.isArray(parsed.acciones) ? parsed.acciones.filter((a: unknown) => typeof a === "string") : [],
        dudas: Array.isArray(parsed.dudas) ? parsed.dudas.filter((d: unknown) => typeof d === "string") : [],
      };
      const inputTokens = resp.usage?.prompt_tokens ?? 0;
      const outputTokens = resp.usage?.completion_tokens ?? 0;
      costUSD += calcGptCost(inputTokens, outputTokens);
      await prisma.aiUsageLog.create({
        data: {
          supabaseUid: user.supabaseUid,
          operation: "voice-note-interpret",
          model: INTERPRET_MODEL,
          inputTokens,
          outputTokens,
          durationMs: Date.now() - started,
        },
      });
    } catch (err) {
      // El texto ya está: sin interpretación la nota sigue sirviendo.
      console.error("[voice-notes] interpret", err);
    }
  }

  return NextResponse.json({ text, durationSec, corrections, doubtful, interpretation, costUSD });
});
