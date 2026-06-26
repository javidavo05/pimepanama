import OpenAI from "openai";
import { calcGptCost } from "@/lib/ai-pricing";

const TAGS = ["urgent", "invoice", "follow-up", "support", "payment", "spam", "general"] as const;
export type EmailTag = typeof TAGS[number];

export interface EmailAnalysis {
  summary: string;
  tags: EmailTag[];
  urgency: "high" | "medium" | "low";
  suggestedAction: string;
  costUSD: number;
}

export async function analyzeEmail(subject: string, bodyText: string): Promise<EmailAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    return { summary: "", tags: ["general"], urgency: "low", suggestedAction: "", costUSD: 0 };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const truncated = bodyText.slice(0, 2000);

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You are an email analyzer for a Panamanian technology company.
Analyze the provided email and return a JSON object with:
- summary: one sentence summary in Spanish (max 120 chars)
- tags: array of applicable tags from [${TAGS.join(", ")}] (1-3 tags)
- urgency: "high" | "medium" | "low"
- suggestedAction: short suggested next step in Spanish (max 80 chars)

Respond ONLY with valid JSON.`,
      },
      {
        role: "user",
        content: `Subject: ${subject}\n\n${truncated}`,
      },
    ],
  });

  const usage = res.usage;
  const costUSD = calcGptCost(usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0);

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    return {
      summary: parsed.summary ?? "",
      tags: (parsed.tags ?? ["general"]).filter((t: string) => TAGS.includes(t as EmailTag)),
      urgency: parsed.urgency ?? "low",
      suggestedAction: parsed.suggestedAction ?? "",
      costUSD,
    };
  } catch {
    return { summary: "", tags: ["general"], urgency: "low", suggestedAction: "", costUSD };
  }
}
