import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const { rawNotes, language = "es" } = await request.json();

    if (!rawNotes?.trim()) {
      return NextResponse.json({ error: "rawNotes is required" }, { status: 400 });
    }

    const brandLang = language === "en" ? "en" : "es";
    const lang = language === "en" ? "professional English" : "formal Panamanian Spanish";

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: brandSystemPrompt(
            `Actúas como la persona que redacta la minuta oficial de una reunión con cliente. El usuario te da notas crudas (a veces dictadas, desordenadas); tu trabajo es convertirlas en una bitácora formal que el cliente pueda leer como registro del acuerdo. Responde enteramente en ${lang}.

Devuelve un JSON con estas claves exactas:
- "agenda" (string): resumen de 2-4 oraciones de los temas tratados — no una lista de palabras sueltas, prosa real que dé contexto.
- "decisions" (array de strings): cada decisión como una afirmación completa y verificable ("Se aprobó X", "Se acordó posponer Y hasta Z") — no fragmentos.
- "actionItems" (array de objetos con "task", "owner", "due"): tareas concretas y accionables. Si las notas no especifican responsable o fecha, usa "Por definir" en vez de inventar un nombre o fecha.
- "nextMeeting" (string): próximos pasos o fecha de la siguiente reunión si se mencionó; si no se mencionó, indica "Por agendar" en vez de inventar una fecha.

No inventes decisiones, tareas, responsables ni fechas que no estén en las notas. Si las notas son ambiguas, refleja esa ambigüedad en vez de resolverla por tu cuenta.`,
            brandLang
          ),
        },
        { role: "user", content: rawNotes },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.3,
    });

    const usage = response.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const costUSD = calcGptCost(inputTokens, outputTokens);
    const content = JSON.parse(response.choices[0]?.message?.content ?? "{}");

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "restructure",
        model: "gpt-4o",
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ ...content, _meta: { costUSD, tokensUsed: inputTokens + outputTokens } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Restructure error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
