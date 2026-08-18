import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import { normalizeComposeAiResult } from "@/lib/mail/compose-ai";
import { htmlToPlainText } from "@/lib/mail/email-html";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 503 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const {
      synthesis,
      originalSubject = "",
      originalBody = "",
      analysis,
      language = "es",
      tone = "formal",
    } = await request.json();

    if (!synthesis?.trim()) {
      return NextResponse.json({ error: "synthesis is required" }, { status: 400 });
    }

    const brandLang = language === "en" ? "en" : "es";
    const lang = language === "en" ? "professional English" : "formal Panamanian Spanish";
    const toneDesc =
      tone === "friendly"
        ? "warm and approachable yet professional"
        : "formal and corporate";

    const plainOriginal = htmlToPlainText(String(originalBody)).slice(0, 6000);

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: brandSystemPrompt(
            `The user gives you a SHORT synthesis of how they want to reply to an email. Expand it into a complete, ${toneDesc} reply in ${lang} — the kind a busy but careful account manager would actually send, not a generic template.

Rules:
- Write only the reply body (greeting + content + professional closing like "Saludos cordiales" or "Atentamente"). Do NOT add name, title, company name, phone, email, or signature block — that's added separately.
- Stay strictly faithful to the user's synthesis — do not invent commitments, prices, or dates they did not mention. If the synthesis is ambiguous, keep the reply equally general rather than guessing specifics.
- If the original email and its analysis are provided, acknowledge the sender's specific ask/topic naturally in the opening — don't restate the whole original email back to them.
- Keep it concise (2–5 short paragraphs max). Every sentence should carry information; cut anything that's just politeness filler.
- Return a JSON object with a single key "body" (string, plain text with paragraph breaks as \\n\\n).`,
            brandLang
          ),
        },
        {
          role: "user",
          content: [
            originalSubject ? `Original subject: ${originalSubject}` : null,
            analysis?.topic ? `Email analysis — topic: ${analysis.topic}` : null,
            analysis?.senderAsk ? `What sender wants: ${analysis.senderAsk}` : null,
            Array.isArray(analysis?.keyPoints) && analysis.keyPoints.length
              ? `Key points: ${analysis.keyPoints.join("; ")}`
              : null,
            plainOriginal ? `Original email:\n${plainOriginal}` : null,
            `User synthesis (expand this): ${synthesis.trim()}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 900,
      temperature: 0.45,
    });

    const usage = response.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const costUSD = calcGptCost(inputTokens, outputTokens);
    const content = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    const { body } = normalizeComposeAiResult(content);

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "reply",
        model: "gpt-4o",
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({
      body,
      _meta: { costUSD, tokensUsed: inputTokens + outputTokens },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("AI reply error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
