import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { calcGptCost } from "@/lib/ai-pricing";

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

  const systemPrompt = language === "es"
    ? `Eres un asistente de gestión de proyectos. Con base en las notas dictadas, extrae y estructura la información del proyecto. Responde SOLO con JSON válido, sin markdown.`
    : `You are a project management assistant. Based on the dictated notes, extract and structure the project information. Respond ONLY with valid JSON, no markdown.`;

  const userPrompt = language === "es"
    ? `Notas del proyecto:\n${rawNotes.slice(0, 3000)}\n\nGenera un JSON con estos campos:\n{"name": "nombre conciso del proyecto", "description": "descripción 1-2 párrafos", "scope": "alcance detallado con bullet points", "aiSummary": "resumen ejecutivo 1 párrafo", "aiTags": ["tag1","tag2"], "suggestedBudget": null_o_número}`
    : `Project notes:\n${rawNotes.slice(0, 3000)}\n\nGenerate JSON with these fields:\n{"name": "concise project name", "description": "1-2 paragraph description", "scope": "detailed scope with bullet points", "aiSummary": "1 paragraph executive summary", "aiTags": ["tag1","tag2"], "suggestedBudget": null_or_number}`;

  const start = Date.now();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    temperature: 0.4,
    max_tokens: 1000,
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

  return NextResponse.json({ ...result, costUSD });
}
