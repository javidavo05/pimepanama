import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import { normalizeComposeAiResult } from "@/lib/mail/compose-ai";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const { intent, language = "es", tone = "formal" } = await request.json();

    if (!intent?.trim()) {
      return NextResponse.json({ error: "intent is required" }, { status: 400 });
    }

    const brandLang = language === "en" ? "en" : "es";
    const lang = language === "en" ? "professional English" : "formal Panamanian Spanish";
    const toneDesc = tone === "friendly" ? "warm and approachable yet professional" : "formal and corporate";

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: brandSystemPrompt(
            `The user gives you a short intent (what they want to say) — write a complete, ${toneDesc} business email in ${lang} from it.

Structure:
- Subject: specific and useful on its own in an inbox — never generic ("Follow up", "Información"). Reference the actual topic.
- Body: open with the concrete reason for writing (no throat-clearing like "I hope this finds you well"), give the necessary context in 1-2 sentences, then a clear ask or next step. End with a natural, brief close appropriate to the tone — no name/title/signature block, that's added separately.
- Do not invent prices, dates, or commitments the user didn't mention in their intent.

Return a JSON object with "subject" (string) and "body" (string — the email body only, no greeting/signature placeholders).`,
            brandLang
          ),
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
    const { subject, body } = normalizeComposeAiResult(content);

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

    return NextResponse.json({ subject, body, _meta: { costUSD, tokensUsed: inputTokens + outputTokens } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Compose error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
