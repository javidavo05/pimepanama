import OpenAI from "openai";
import type { Client, Project } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";
import { parseProposalContent, type ProposalContent } from "./proposal-content";

/**
 * Genera el contenido estructurado de una propuesta comercial.
 *
 * Vive aquí y no dentro de una ruta porque tiene dos entradas: el botón del
 * proyecto y la reunión, que la redacta a partir del entregable técnico que se
 * acordó. Duplicar el prompt en dos sitios habría hecho que las propuestas
 * salieran distintas según por dónde se pidieran.
 */

const PROPOSAL_JSON_SHAPE = `{
  "pillars": ["pilar 1 (una oración)", "pilar 2 (una oración)", "pilar 3 (una oración)"],
  "whatWereBuilding": "1 párrafo",
  "whyThisApproach": "1 párrafo",
  "contextObjective": "2-3 párrafos",
  "architecture": {
    "frontend": "1-2 oraciones sobre la interfaz, en lenguaje ejecutivo",
    "backend": "1-2 oraciones sobre datos y backend, en lenguaje ejecutivo",
    "infra": "1-2 oraciones sobre infraestructura, en lenguaje ejecutivo",
    "attributes": ["Responsive", "SEO", "..."]
  },
  "phases": [
    {
      "tag": "FASE 1",
      "isFirstPhase": true,
      "name": "nombre de la fase",
      "price": "$X,XXX",
      "timeframe": "Promedio: NN días",
      "body": "1-2 oraciones de alcance de la fase",
      "footerLabel": "Punto de partida del proyecto"
    },
    {
      "tag": "FASE 2 · OPCIONAL",
      "isFirstPhase": false,
      "name": "nombre de la fase",
      "price": "$X,XXX",
      "timeframe": "NN–NN días",
      "body": "1-2 oraciones de alcance de la fase",
      "footerLabel": "Se aprueba por separado"
    }
  ],
  "scopeIncludes": ["ítem incluido 1", "ítem incluido 2"],
  "scopeExcludes": ["ítem no incluido 1", "ítem no incluido 2"],
  "investmentNote": "1 oración aclarando que los montos son una referencia y cada fase se factura por separado",
  "closingSteps": [
    { "title": "Aprobación de propuesta", "description": "1 oración" },
    { "title": "Kickoff", "description": "1 oración" },
    { "title": "Primeras entregas", "description": "1 oración" }
  ]
}`;

export interface GenerateProposalInput {
  project: Project & { client: Pick<Client, "name" | "company"> | null };
  /** Contexto extra: notas del usuario, o el entregable técnico de una reunión */
  extraNotes?: string;
  language?: string;
  supabaseUid: string;
}

export interface GenerateProposalResult {
  content: ProposalContent;
  costUSD: number;
}

export class ProposalGenerationError extends Error {}

export async function generateProposalContent({
  project,
  extraNotes = "",
  language = "es",
  supabaseUid,
}: GenerateProposalInput): Promise<GenerateProposalResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ProposalGenerationError("OPENAI_API_KEY no configurada");

  const brandLang = language === "en" ? "en" : "es";

  const systemPrompt = brandSystemPrompt(
    `Eres quien redacta propuestas comerciales de proyectos de software para clientes de Pime Panamá. Con base en los datos del proyecto, genera el contenido estructurado completo para una propuesta comercial en PDF de varias páginas — el documento que decide si el cliente firma o pide otra cotización. Sigue exactamente esta estructura (portada ya generada aparte; tú generas desde el resumen ejecutivo hasta el cierre).

Reglas específicas de esta propuesta (no negociables):
- Las fases se aprueban y facturan de forma INDEPENDIENTE. La primera fase nunca lleva "OPCIONAL"; el resto sí, con el patrón de tag "FASE N · OPCIONAL". Nunca redactes "investmentNote" como si las fases fueran un paquete obligatorio — siempre aclara que es una referencia conjunta y cada fase se aprueba por separado.
- Los plazos son siempre rangos o promedios, nunca fechas exactas.
- Si el proyecto ya tiene un presupuesto total (totalBudget), las fases deben sumar aproximadamente esa cifra; si no lo tiene, estima montos razonables para un proyecto de este tipo y tamaño según lo que describen las notas.
- Genera entre 2 y 4 fases, dependiendo de la complejidad del proyecto descrito. Cada "body" de fase debe describir un entregable verificable (lo que el cliente puede revisar al cierre de la fase), no una lista de tecnologías.
- "scopeExcludes" siempre debe incluir cosas típicamente no incluidas salvo que el proyecto indique lo contrario (licencias de terceros, dominio, cuentas de desarrollador, hosting premium futuro).
- "pillars" son los 3 argumentos de venta más fuertes de este proyecto específico, no genéricos de la industria — deben poder repetirse en una llamada de ventas sin sonar a relleno.
- "contextObjective" debe nombrar el problema de negocio real detrás del proyecto (qué le cuesta al cliente no tener esto, o qué oportunidad pierde), no solo describir qué se va a construir.
- Todo el texto debe sonar como el socio senior de una consultora boutique explicándole el proyecto a un comité no técnico que ya recibió otras cotizaciones — diferénciate siendo específico donde los competidores son genéricos.

Responde ÚNICAMENTE con un JSON que siga EXACTAMENTE esta forma (mismas claves, mismos tipos):
${PROPOSAL_JSON_SHAPE}`,
    brandLang
  );

  const userPrompt = `Proyecto: ${project.name}
Cliente: ${project.client?.company ?? project.client?.name ?? "No especificado"}
Descripción: ${project.description ?? "(sin descripción)"}
Alcance conocido: ${project.scope ?? "(sin alcance definido)"}
Resumen ejecutivo previo: ${project.aiSummary ?? "(ninguno)"}
Presupuesto total conocido: ${project.totalBudget != null ? `USD ${Number(project.totalBudget)}` : "(no definido, estíma uno razonable)"}
${extraNotes.trim() ? `Notas adicionales:\n${extraNotes.trim()}` : ""}`.trim();

  const openai = new OpenAI({ apiKey });
  const start = Date.now();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 3200,
    response_format: { type: "json_object" },
  });

  const inputTokens = resp.usage?.prompt_tokens ?? 0;
  const outputTokens = resp.usage?.completion_tokens ?? 0;

  await prisma.aiUsageLog.create({
    data: {
      supabaseUid,
      operation: "project-proposal-expand",
      model: "gpt-4o",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - start,
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
  } catch {
    throw new ProposalGenerationError("La IA devolvió una respuesta inválida. Intenta de nuevo.");
  }

  const result = parseProposalContent(parsed);
  if (!result.success) {
    console.error("Proposal content failed validation:", result.error.issues);
    throw new ProposalGenerationError(
      "La IA devolvió un contenido incompleto o mal formado. Intenta de nuevo."
    );
  }

  return { content: result.data, costUSD: calcGptCost(inputTokens, outputTokens) };
}
