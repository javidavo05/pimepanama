import OpenAI from "openai";
import { calcGptCost } from "@/lib/ai-pricing";
import { htmlToPlainText } from "@/lib/mail/email-html";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";

export type ReplyEmailAnalysis = {
  topic: string;
  keyPoints: string[];
  senderAsk: string;
  urgency: "high" | "medium" | "low";
  costUSD: number;
};

export async function analyzeEmailForReply(
  subject: string,
  body: string
): Promise<ReplyEmailAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    return { topic: "", keyPoints: [], senderAsk: "", urgency: "low", costUSD: 0 };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const plain = htmlToPlainText(body).slice(0, 6000);

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content: brandSystemPrompt(
          `Analizas correos entrantes. El usuario va a responder este correo y necesita entenderlo primero, rápido, sin tener que releerlo completo.

Devuelve JSON en español con:
- topic: 2-3 oraciones claras explicando de qué trata el correo — el contexto de negocio, no un resumen genérico.
- keyPoints: arreglo de 2-5 strings con los hechos más importantes y accionables (montos, fechas, nombres, plazos, condiciones). Cada punto debe ser algo que cambiaría la respuesta si se ignorara.
- senderAsk: una oración — qué quiere o espera el remitente de nosotros específicamente (una decisión, un pago, una fecha, un documento).
- urgency: "high" | "medium" | "low" — alta si hay una fecha límite próxima, un pago vencido o un cliente molesto; baja si es solo informativo.

Sé estrictamente factual. No inventes información que no esté en el correo.`,
          "es"
        ),
      },
      {
        role: "user",
        content: `Asunto: ${subject || "(sin asunto)"}\n\n${plain || "(sin cuerpo)"}`,
      },
    ],
  });

  const usage = res.usage;
  const costUSD = calcGptCost(usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0);

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    return {
      topic: typeof parsed.topic === "string" ? parsed.topic.trim() : "",
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.filter((p: unknown) => typeof p === "string" && p.trim()).map((p: string) => p.trim())
        : [],
      senderAsk: typeof parsed.senderAsk === "string" ? parsed.senderAsk.trim() : "",
      urgency: ["high", "medium", "low"].includes(parsed.urgency) ? parsed.urgency : "low",
      costUSD,
    };
  } catch {
    return { topic: "", keyPoints: [], senderAsk: "", urgency: "low", costUSD };
  }
}
