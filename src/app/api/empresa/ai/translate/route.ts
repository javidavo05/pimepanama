import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY no está configurada." },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const { texts, to = "en" } = await request.json() as { texts: string[]; to: "en" | "es" };

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: "texts array is required" }, { status: 400 });
    }

    const targetLang = to === "en" ? "professional English" : "formal Panamanian Spanish";
    const systemPrompt = `You are a professional translator for a Panamanian technology company. Translate the provided JSON array of strings from Spanish to ${targetLang}. Preserve technical terms, proper nouns, numbers, and formatting. Return ONLY a valid JSON array with the same number of elements in the same order. No explanations.`;

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(texts) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.2,
    });

    const usage = response.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const costUSD = calcGptCost(inputTokens, outputTokens);

    // GPT returns { "translations": [...] } or similar — extract the array
    const raw = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    const translated: string[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.translations)
        ? raw.translations
        : Array.isArray(raw.texts)
          ? raw.texts
          : Object.values(raw).find(Array.isArray) as string[] ?? texts;

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "translate",
        model: "gpt-4o",
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ texts: translated, costUSD });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Translate error:", err);
    return NextResponse.json({ error: "Translation error" }, { status: 500 });
  }
}
