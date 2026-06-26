import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const { intent, language = "es", tone = "formal" } = await request.json();

    if (!intent?.trim()) {
      return NextResponse.json({ error: "intent is required" }, { status: 400 });
    }

    const lang = language === "en" ? "professional English" : "formal Panamanian Spanish";
    const toneDesc = tone === "friendly" ? "warm and approachable yet professional" : "formal and corporate";

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a corporate communications expert for Pime Panamá, a technology company. Write a ${toneDesc} business email in ${lang}. Return a JSON object with "subject" (string) and "body" (string — the full email body without greeting/signature placeholders, just the core content). Keep it concise and professional.`,
        },
        { role: "user", content: intent },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.5,
    });

    const usage = response.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const costUSD = calcGptCost(inputTokens, outputTokens);
    const content = JSON.parse(response.choices[0]?.message?.content ?? "{}");

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "compose",
        model: "gpt-4o",
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ ...content, _meta: { costUSD, tokensUsed: inputTokens + outputTokens } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Compose error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
