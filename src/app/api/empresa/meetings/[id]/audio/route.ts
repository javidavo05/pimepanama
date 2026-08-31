import { NextRequest, NextResponse } from "next/server";
import { toFile } from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { putR2Object } from "@/lib/r2";
import { calcWhisperCost } from "@/lib/ai-pricing";
import { getOpenAI } from "@/lib/meetings/pipeline";
import { parseSegments, type MeetingSegment } from "@/lib/meetings/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Tramos de audio más largos que esto no caben cómodos en una llamada a Whisper. */
const MAX_BYTES = 24 * 1024 * 1024;

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Recibe un tramo de audio de la grabación en curso, lo archiva en R2 y lo
 * transcribe. El cliente graba en tramos independientes (cada uno es un webm
 * completo y decodificable) y los va subiendo en orden, así la transcripción
 * avanza durante la reunión en vez de esperar al final.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(req);
    const { id } = await params;

    const meeting = await prisma.meeting.findFirst({
      where: { id, userId: user.id },
      select: { id: true, language: true, segments: true, transcript: true, audioKeys: true, durationMs: true },
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

    const buffer = Buffer.from(await audio.arrayBuffer());
    const key = `meetings/${id}/${String(index).padStart(4, "0")}.webm`;
    await putR2Object(key, buffer, audio.type || "audio/webm");

    const openai = getOpenAI();
    const start = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(buffer, `tramo-${index}.webm`, { type: audio.type || "audio/webm" }),
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
      }))
      .filter((s) => s.text.length > 0);

    const chunkText = (raw.text ?? newSegments.map((s) => s.text).join(" ")).trim();
    const chunkMs = Math.round((Number(raw.duration) || 0) * 1000);

    const existing = parseSegments(meeting.segments);
    const merged = [...existing, ...newSegments].sort((a, b) => a.start - b.start);

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        status: "RECORDING",
        segments: merged as unknown as object[],
        transcript: [meeting.transcript?.trim(), chunkText].filter(Boolean).join(" "),
        audioKeys: meeting.audioKeys.includes(key) ? meeting.audioKeys : [...meeting.audioKeys, key],
        durationMs: Math.max(meeting.durationMs, offsetMs + chunkMs),
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
      segmentCount: merged.length,
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
