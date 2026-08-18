import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { calcGptCost } from "@/lib/ai-pricing";
import { coerceAiText } from "@/lib/ai-text";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 503 });
  }
  const openai = new OpenAI({ apiKey });
  const { id } = await params;

  // Allow tmp- prefix for new projects not yet saved to DB
  if (!id.startsWith("tmp-")) {
    const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const rawNotes: string = body.rawNotes ?? "";
  const language: string = body.language ?? "es";

  if (!rawNotes.trim()) {
    return NextResponse.json({ error: "Se requieren notas para generar el proyecto" }, { status: 400 });
  }

  const brandLang = language === "es" ? "es" : "en";
  const systemPrompt = brandSystemPrompt(
    language === "es"
      ? `Eres un asistente de gestión de proyectos. Con base en notas dictadas (a veces desordenadas, con ideas a medio formar), extrae y estructura la información del proyecto como lo haría un gerente de proyecto experimentado preparando el registro inicial. Responde SOLO con JSON válido, sin markdown.

Para cada campo:
- "name": nombre conciso y específico (evita nombres genéricos como "Proyecto Web" si las notas dan más contexto).
- "description": 1-2 párrafos en prosa real explicando qué es el proyecto y para quién, no una lista de features sueltas.
- "scope": alcance detallado con bullet points — funcionalidades y entregables concretos mencionados o claramente implícitos en las notas.
- "aiSummary": resumen ejecutivo de 1 párrafo, el tipo de texto que leería un director que no tiene tiempo de leer el resto.
- "aiTags": 2-5 etiquetas cortas y específicas (tecnología, industria, tipo de proyecto).
- "suggestedBudget": un número si las notas mencionan un presupuesto o dan pistas suficientes para estimarlo razonablemente; null si no hay base para estimarlo — no inventes una cifra sin fundamento.`
      : `You are a project management assistant. Based on dictated notes (sometimes messy, half-formed ideas), extract and structure the project information the way an experienced project manager would when creating the initial record. Respond ONLY with valid JSON, no markdown.

For each field:
- "name": concise, specific name (avoid generic names like "Web Project" if the notes give more context).
- "description": 1-2 paragraphs of real prose explaining what the project is and who it's for, not a loose feature list.
- "scope": detailed scope with bullet points — concrete features and deliverables mentioned or clearly implied in the notes.
- "aiSummary": 1-paragraph executive summary, the kind a director with no time to read the rest would read.
- "aiTags": 2-5 short, specific tags (technology, industry, project type).
- "suggestedBudget": a number if the notes mention a budget or give enough signal to estimate one reasonably; null if there's no basis to estimate — don't invent an unfounded figure.`,
    brandLang
  );

  const userPrompt = language === "es"
    ? `Notas del proyecto:\n${rawNotes.slice(0, 3000)}\n\nGenera un JSON con estos campos:\n{"name": "nombre conciso del proyecto", "description": "descripción 1-2 párrafos", "scope": "alcance detallado con bullet points", "aiSummary": "resumen ejecutivo 1 párrafo", "aiTags": ["tag1","tag2"], "suggestedBudget": null_o_número}`
    : `Project notes:\n${rawNotes.slice(0, 3000)}\n\nGenerate JSON with these fields:\n{"name": "concise project name", "description": "1-2 paragraph description", "scope": "detailed scope with bullet points", "aiSummary": "1 paragraph executive summary", "aiTags": ["tag1","tag2"], "suggestedBudget": null_or_number}`;

  const start = Date.now();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    temperature: 0.4,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });

  const durationMs = Date.now() - start;
  const inputTokens = resp.usage?.prompt_tokens ?? 0;
  const outputTokens = resp.usage?.completion_tokens ?? 0;

  await prisma.aiUsageLog.create({
    data: {
      supabaseUid: user.supabaseUid,
      operation: "project-expand",
      model: "gpt-4o",
      inputTokens,
      outputTokens,
      durationMs,
      documentId: id.startsWith("tmp-") ? undefined : id,
    },
  });

  let result: Record<string, unknown> = {};
  try {
    result = JSON.parse(resp.choices[0].message.content ?? "{}");
  } catch { /* keep empty */ }

  const costUSD = calcGptCost(inputTokens, outputTokens);

  return NextResponse.json({
    name: coerceAiText(result.name),
    description: coerceAiText(result.description),
    scope: coerceAiText(result.scope),
    aiSummary: coerceAiText(result.aiSummary),
    aiTags: Array.isArray(result.aiTags)
      ? result.aiTags.map((tag) => String(tag)).filter(Boolean)
      : [],
    suggestedBudget:
      typeof result.suggestedBudget === "number" && Number.isFinite(result.suggestedBudget)
        ? result.suggestedBudget
        : null,
    costUSD,
  });
}
