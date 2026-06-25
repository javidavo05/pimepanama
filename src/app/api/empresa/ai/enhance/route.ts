import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const { text, language = "es", context = "" } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const lang = language === "en" ? "professional English" : "formal Panamanian Spanish";
    const systemPrompt = `You are a corporate communications expert for a Panamanian technology company. Enhance the following text to be professional, precise, and appropriate for formal business documents (invoices, quotes, proposals). Context: ${context || "corporate document"}. Respond entirely in ${lang}. Return only the enhanced text, no explanations.`;

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_tokens: 500,
      temperature: 0.4,
    });

    const enhanced = response.choices[0]?.message?.content?.trim() ?? text;
    const usage = response.usage;

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "enhance",
        model: "gpt-4o",
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({
      enhanced,
      tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("AI enhance error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
