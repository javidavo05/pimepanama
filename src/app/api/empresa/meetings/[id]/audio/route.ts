import { NextRequest, NextResponse } from "next/server";
import { toFile } from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { generatePresignedDownloadUrl, putR2Object } from "@/lib/r2";
import { calcWhisperCost } from "@/lib/ai-pricing";
import { getOpenAI } from "@/lib/meetings/pipeline";
import { appendSegments, flatten, loadSegments } from "@/lib/meetings/segments";
import {
  parseAudioChunks,
  type MeetingAudioChunk,
  type MeetingChannel,
  type MeetingSegment,
} from "@/lib/meetings/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Tramos de audio más largos que esto no caben cómodos en una llamada a Whisper. */
const MAX_BYTES = 24 * 1024 * 1024;

/** Formatos que acepta Whisper. La extensión importa: la usa para decodificar. */
const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/flac": "flac",
};

function extensionFor(mime: string): string {
  return EXTENSION_BY_MIME[mime.split(";")[0].trim().toLowerCase()] ?? "webm";
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Recibe un tramo de audio, lo archiva en R2 y lo transcribe. Sirve para las dos
 * formas de entrar audio al sistema:
 *
 * - **Grabando**: el cliente corta la reunión en tramos cortos e independientes
 *   (cada uno un webm completo y decodificable) y los sube en orden, así la
 *   transcripción avanza durante la reunión en vez de esperar al final.
 * - **Subiendo un archivo ya grabado** (la exportación de un Zoom, una nota de
 *   voz): el cliente lo decodifica, lo parte en tramos y los sube por aquí
 *   mismo, con su `offsetMs`. Para el servidor es el mismo caso.
 *
 * Cuando la grabación tiene dos fuentes de audio separadas (micrófono por un
 * lado, audio de la videollamada por el otro) cada tramo llega etiquetado con su
 * canal y con el nombre que el usuario le asignó a esa voz. Ese hablante se
 * guarda ya resuelto y marcado como `locked`: no lo toca la diarización, porque
 * el canal es evidencia física y el modelo solo adivina.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(req);
    const { id } = await params;

    const meeting = await prisma.meeting.findFirst({
      where: { id, userId: user.id },
      select: { id: true, language: true, audioKeys: true, audioChunks: true, durationMs: true },
    });
    if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const formData = await req.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo de audio" }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "El tramo de audio es demasiado largo. Reduce la duración del tramo." },
        { status: 413 }
      );
    }

    // Desplazamiento del tramo respecto al inicio de la reunión, para que los
    // timestamps de Whisper (relativos al tramo) queden absolutos.
    const offsetMs = Math.max(0, Number(formData.get("offsetMs")) || 0);
    const index = Math.max(0, Number(formData.get("index")) || 0);

    const rawChannel = formData.get("channel");
    const channel: MeetingChannel | undefined =
      rawChannel === "LOCAL" || rawChannel === "REMOTE" ? rawChannel : undefined;
    // Nombre que el usuario le puso a la voz de este canal. Si el canal no está
    // mapeado a nadie, el segmento queda sin hablante y lo resuelve la IA.
    const rawSpeaker = formData.get("speaker");
    const speaker =
      typeof rawSpeaker === "string" && rawSpeaker.trim() ? rawSpeaker.trim().slice(0, 80) : undefined;

    const mime = audio.type || "audio/webm";
    const buffer = Buffer.from(await audio.arrayBuffer());
    const key = `meetings/${id}/${channel === "REMOTE" ? "r" : "l"}${String(index).padStart(4, "0")}.${extensionFor(mime)}`;
    await putR2Object(key, buffer, mime);

    const openai = getOpenAI();
    const start = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(buffer, `tramo-${index}.${extensionFor(mime)}`, { type: mime }),
      model: "whisper-1",
      language: meeting.language === "en" ? "en" : "es",
      response_format: "verbose_json",
    });
    const durationMs = Date.now() - start;

    const raw = transcription as unknown as { segments?: WhisperSegment[]; text?: string; duration?: number };
    const newSegments: MeetingSegment[] = (raw.segments ?? [])
      .map((s) => ({
        start: offsetMs + Math.round((Number(s.start) || 0) * 1000),
        end: offsetMs + Math.round((Number(s.end) || 0) * 1000),
        text: String(s.text ?? "").trim(),
        ...(channel ? { channel } : {}),
        ...(speaker ? { speaker, locked: true } : {}),
      }))
      .filter((s) => s.text.length > 0);

    const chunkText = (raw.text ?? newSegments.map((s) => s.text).join(" ")).trim();
    const chunkMs = Math.round((Number(raw.duration) || 0) * 1000);

    // Insertar solo las filas de este tramo: la transcripción anterior no se
    // toca. Antes cada tramo reescribía el JSON completo de la reunión.
    await appendSegments(id, newSegments);

    // El mapa de tramos es lo que después permite reproducir la reunión y saltar
    // al minuto de un turno.
    const chunks = parseAudioChunks(meeting.audioChunks).filter((c) => c.key !== key);
    chunks.push({ key, channel, index, offsetMs, durationMs: chunkMs, mime } satisfies MeetingAudioChunk);

    // Con dos canales los tramos no llegan en orden cronológico, así que la
    // transcripción plana se rearma desde los segmentos ya ordenados.
    const allSegments = await loadSegments(id);

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        status: "RECORDING",
        transcript: flatten(allSegments),
        audioKeys: meeting.audioKeys.includes(key) ? meeting.audioKeys : [...meeting.audioKeys, key],
        audioChunks: chunks as unknown as object[],
        durationMs: Math.max(meeting.durationMs, offsetMs + chunkMs),
        // La transcripción también cuesta: sin esto el total de la reunión solo
        // contaba el análisis y subestimaba lo que se gastó.
        aiCostUSD: { increment: calcWhisperCost(chunkMs || durationMs) },
      },
      select: { transcript: true, durationMs: true },
    });

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "meeting-transcribe",
        model: "whisper-1",
        inputTokens: 0,
        outputTokens: 0,
        durationMs,
      },
    });

    return NextResponse.json({
      chunkText,
      // Solo los segmentos de este tramo: el cliente los va acumulando para
      // pintar la conversación en vivo sin re-descargar toda la transcripción.
      segments: newSegments,
      segmentCount: allSegments.length,
      transcript: updated.transcript,
      durationMs: updated.durationMs,
      costUSD: calcWhisperCost(chunkMs || durationMs),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Meeting audio error:", err);
    return NextResponse.json({ error: "Error al transcribir el tramo" }, { status: 500 });
  }
}

/**
 * Enlaces temporales para escuchar la reunión. El audio vive en un bucket
 * privado, así que se firma tramo por tramo para quien ya probó ser dueño de la
 * reunión; el reproductor los encadena usando el `offsetMs` de cada uno.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(req);
    const { id } = await params;

    const meeting = await prisma.meeting.findFirst({
      where: { id, userId: user.id },
      select: { audioChunks: true, audioKeys: true, durationMs: true },
    });
    if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let chunks = parseAudioChunks(meeting.audioChunks);

    // Reuniones grabadas antes de 0025 solo tienen las claves, sin offsets. Se
    // reconstruyen desde el nombre del archivo, que codifica canal e índice.
    if (chunks.length === 0 && meeting.audioKeys.length > 0) {
      chunks = meeting.audioKeys
        .map((key) => {
          const name = key.split("/").pop() ?? "";
          const index = Number(name.slice(1).split(".")[0]) || 0;
          return {
            key,
            channel: name.startsWith("r") ? ("REMOTE" as const) : ("LOCAL" as const),
            index,
            offsetMs: 0,
            durationMs: 0,
            mime: "audio/webm",
          };
        })
        // Sin offsets guardados, el orden de grabación es lo único que hay.
        .sort((a, b) => a.index - b.index);
    }

    if (chunks.length === 0) {
      return NextResponse.json({ chunks: [], durationMs: meeting.durationMs });
    }

    const signed = await Promise.all(
      chunks.map(async (c) => ({ ...c, url: await generatePresignedDownloadUrl(c.key) }))
    );

    return NextResponse.json({ chunks: signed, durationMs: meeting.durationMs });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Meeting audio list error:", err);
    return NextResponse.json({ error: "No se pudo preparar el audio" }, { status: 500 });
  }
}
