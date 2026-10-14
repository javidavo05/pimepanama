import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import {
  ANALYZE_MODEL,
  analyzeProjectDocument,
  type DocumentAnalysis,
} from "@/lib/ai/project-from-document";

export const runtime = "nodejs";
// Una propuesta de 15 páginas convertida entera en fases y entregables tarda
// más de un minuto en redactarse.
export const maxDuration = 300;

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { fileName, fileDataUrl, text } = await request.json();

    if (!fileDataUrl && !text?.trim()) {
      return NextResponse.json(
        { error: "Adjunta un PDF o pega el texto del documento" },
        { status: 400 }
      );
    }

    if (fileDataUrl) {
      const base64 = String(fileDataUrl).split(",")[1] ?? "";
      if (Buffer.byteLength(base64, "base64") > MAX_BYTES) {
        return NextResponse.json({ error: "El archivo supera 12 MB" }, { status: 413 });
      }
    }

    const start = Date.now();
    const result = await analyzeProjectDocument(openai, { fileName, fileDataUrl, text });
    const costUSD = calcGptCost(result.inputTokens, result.outputTokens, ANALYZE_MODEL);

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "analyze-contract",
        model: ANALYZE_MODEL,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - start,
      },
    });

    if (result.incomplete) {
      return NextResponse.json(
        { error: "El documento es demasiado largo para leerlo de una vez. Divídelo en partes o pega solo las secciones de alcance e inversión." },
        { status: 422 }
      );
    }

    let parsed: DocumentAnalysis;
    try {
      parsed = JSON.parse(result.outputText || "{}");
    } catch {
      return NextResponse.json(
        { error: "El modelo no devolvió un JSON válido. Intenta de nuevo." },
        { status: 502 }
      );
    }

    if (parsed.noCommercialContent) {
      return NextResponse.json(
        {
          error:
            "El documento no tiene contenido comercial aprovechable: no se ven servicios, alcance ni montos.",
        },
        { status: 422 }
      );
    }

    // Lista plana para quien todavía lea `deliverables` sin fases.
    const deliverables = parsed.phases.flatMap((p) => p.deliverables);

    return NextResponse.json({ ...parsed, deliverables, costUSD });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Error al analizar el documento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
