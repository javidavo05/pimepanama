import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcWhisperCost } from "@/lib/ai-pricing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) ?? "es";

    if (!audioFile) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const file = await toFile(buffer, "recording.webm", { type: "audio/webm" });

    const start = Date.now();
    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: language === "en" ? "en" : "es",
      response_format: "text",
    });

    const durationMs = Date.now() - start;
    const costUSD = calcWhisperCost(durationMs);

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "transcribe",
        model: "whisper-1",
        inputTokens: 0,
        outputTokens: 0,
        durationMs,
      },
    });

    return NextResponse.json({ transcript: response, costUSD });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Transcribe error:", err);
    return NextResponse.json({ error: "Transcription error" }, { status: 500 });
  }
}
