import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY no está configurada. Agrégala a .env.local y reinicia el servidor." },
        { status: 503 }
      );
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const { text, language = "es", context = "" } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const brandLang = language === "en" ? "en" : "es";
    const lang = language === "en" ? "professional English" : "formal Panamanian Spanish";
    const systemPrompt = brandSystemPrompt(
      `Reescribe el texto del usuario para que suene a un documento comercial de alto nivel — piensa en cómo lo redactaría un socio senior antes de enviarlo a un cliente que está evaluando invertir una cifra importante. Contexto del documento: ${context || "documento corporativo"}.

Qué hacer:
- Conserva TODOS los hechos, cifras, plazos y compromisos del texto original — no los cambies ni los omitas.
- Elimina redundancias, muletillas y frases vagas; reemplázalas por lenguaje directo y específico.
- Si el texto es una lista de ideas sueltas, dale estructura de prosa profesional (o de lista, si eso comunica mejor).
- Ajusta el tono a exactamente lo que pide el contexto (ej. una nota de factura es más seca/directa que la introducción de una propuesta).
- Responde enteramente en ${lang}.

Devuelve SOLO el texto mejorado, sin comillas, explicaciones ni notas.`,
      brandLang
    );

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_tokens: 900,
      temperature: 0.4,
    });

    const enhanced = response.choices[0]?.message?.content?.trim() ?? text;
    const usage = response.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const costUSD = calcGptCost(inputTokens, outputTokens);

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "enhance",
        model: "gpt-4o",
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({
      enhanced,
      tokensUsed: inputTokens + outputTokens,
      costUSD,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("AI enhance error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
