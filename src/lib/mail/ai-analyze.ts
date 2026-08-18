import OpenAI from "openai";
import { calcGptCost } from "@/lib/ai-pricing";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";

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
        content: brandSystemPrompt(
          `Clasificas correos entrantes en la bandeja de la empresa para que el equipo priorice sin abrir cada uno.
Analiza el correo y devuelve un JSON con:
- summary: resumen de una oración en español (máx 120 caracteres) — el hecho concreto, no "correo sobre facturación".
- tags: arreglo de etiquetas aplicables de [${TAGS.join(", ")}] (1-3 etiquetas).
- urgency: "high" | "medium" | "low" — alta si hay una fecha límite próxima, un pago vencido, o riesgo de perder al cliente.
- suggestedAction: siguiente paso concreto en español (máx 80 caracteres) — un verbo de acción, no "revisar correo".

Responde SOLO con JSON válido.`,
          "es"
        ),
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
