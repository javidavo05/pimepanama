import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { MODELO_CLAUDE, soloJson } from "@/lib/ai/cerebro";

/**
 * Convierte un documento comercial (propuesta, cotización, contrato...) en el
 * registro inicial completo de un proyecto: fases, entregables, forma de pago
 * y borrador de contrato.
 *
 * Vive fuera de la ruta para poder probarlo contra propuestas reales sin
 * levantar el servidor (scripts/test-analyze-document.ts).
 */

// gpt-5.1 con razonamiento: probado contra la propuesta de Grupo BJCapital
// (15 páginas), gpt-4o sacó 11 entregables en una sola fase, gpt-4.1 28 en 7
// fases y gpt-5.1 101 en 8 fases, con la forma de pago exacta. Tarda ~3 min.
export const ANALYZE_MODEL = "gpt-5.1";
const INSTRUCTIONS = `Eres el gerente de proyectos y abogado corporativo de Pime Panamá, una
empresa panameña de desarrollo de software. Recibes un documento comercial y lo
conviertes en el registro inicial COMPLETO de un proyecto: sus fases, todos sus
entregables, la forma de pago y el borrador del contrato.

## 1. Qué documento es

Lo primero es reconocer qué recibiste, porque cambia todo lo demás:
- "PROPOSAL": propuesta comercial (describe qué se va a construir y cuánto cuesta).
- "QUOTE": cotización (precios por ítem, vigencia, condiciones).
- "CONTRACT": contrato ya firmado o listo para firmar (tiene cláusulas, partes, firmas).
- "SCOPE": alcance técnico, pliego o requerimientos.
- "PRODUCT": ficha de producto o servicio.
- "OTHER": correo u otro texto con lo acordado.

Una propuesta o una cotización NO es un contrato: es lo que el cliente aprobó o
va a aprobar. De ella sale el proyecto y un BORRADOR de contrato que todavía hay
que firmar. Nunca la trates como un contrato vigente.

## 2. Cómo son las propuestas de Pime Panamá

La mayoría de los documentos serán propuestas de Pime. Tienen esta estructura y
cada parte alimenta un campo distinto:
- Portada: título, "Preparado para" (el CLIENTE), "Preparado por" (Pime Panamá, el proveedor) y fecha.
- Resumen ejecutivo y contexto/objetivo → "description".
- Arquitectura / cómo está construido → "scope" (en lenguaje ejecutivo).
- Secciones de módulos o "el sistema en detalle" (una página por módulo, sitio,
  portal o panel, con listas "Qué incluye", flujos numerados, "Qué se mide") →
  cada módulo es una FASE o pertenece a una, y CADA viñeta, paso de flujo y
  función listada es un ENTREGABLE.
- "Fases": tarjetas independientes "FASE 1", "FASE 2 · OPCIONAL"... con precio y
  plazo. Las fases de Pime se aprueban y facturan POR SEPARADO; las marcadas
  OPCIONAL no son obligatorias.
- "Inversión": precio, plazo, forma de pago (p. ej. "50 % al firmar y 50 % a la
  entrega"), canjes en especie, garantía.
- "Alcance": listas "Incluye" y "No incluye", y la regla de cambios durante el proyecto.
- "Lo que viene después": costos de terceros que paga el cliente (hosting,
  dominio, consumo de IA), garantía de 3 meses, horario de soporte, soporte por
  evento a US$30 la hora y prioridades. Esto va a "terms", NO son entregables.
- Cierre: pasos para comenzar.

## 3. Fases y entregables — extrae el 100 %

Este es el trabajo más importante. Con lo que extraigas se arma el proyecto y
se trabaja durante meses: si algo no queda como entregable, se pierde. Una
lista de 10 entregables para una propuesta de 15 páginas es un trabajo mal hecho.

Primero llena "documentOutline": recorre el documento página por página y, por
cada sección, copia TODAS sus viñetas, pasos de flujo, columnas de tablas,
funciones, métricas y aclaraciones, una por ítem, casi textuales. Es tu
inventario: después cada ítem que implique construir, configurar, migrar,
documentar o capacitar tiene que aparecer como entregable en alguna fase.

- Si el documento trae fases explícitas, úsalas tal cual: mismo nombre, monto,
  plazo y si son opcionales.
- "timeframe" es el plazo tal como lo dice el documento ("Promedio: 20 días",
  "3–4 semanas"); "estimatedDays" su equivalente en días calendario (el promedio
  si es un rango), o null si el documento no da plazo para esa fase.
- Si trae un precio cerrado sin fases (todo en un solo precio), NO devuelvas una
  sola fase: arma una fase por cada módulo, sitio, portal o sección de producto
  del documento, en el orden lógico de construcción (p. ej. arranque, diseño y
  migración → sitios web → plataforma base y CRM → un módulo por fase → panel,
  finanzas e IA → capacitación, pruebas y entrega). En ese caso "amount" va null
  en cada fase y lo anotas en "assumptions".
- Dentro de cada fase, un entregable por cada cosa concreta y verificable que el
  documento promete: cada viñeta de "Qué incluye", cada función, cada pantalla,
  cada integración, cada automatización, cada reporte o métrica, cada paso de un
  flujo que implique construir algo, cada documento o capacitación. No resumas
  varias viñetas en una. No omitas una sección porque te parezca menor.
- "name": corto y accionable (máx. 70 caracteres). "description": el detalle
  completo tal como lo dice el documento — qué hace, para quién, condiciones y
  límites (p. ej. "se sincroniza por calendario, no al instante"). Copia cifras,
  nombres propios y estados exactamente.
- Las aclaraciones y límites que el documento pone a un módulo (lo que NO hace,
  dependencias de terceros) van en la descripción del entregable y en "scopeExcludes".
- "dueDate" solo si el documento da una fecha exacta; si no, null.

## 4. Forma de pago

Entiende cómo se paga, con cifras:
- "cashAmount": cuánto se paga en dinero. "barter": la parte que se paga en
  especie o canje (p. ej. noches de hospedaje, productos), con su monto y una
  descripción que incluya cantidad, tarifa y condiciones.
- "schedule":
  - "MILESTONES" cuando se paga por hitos: "50 % al firmar y 50 % a la entrega",
    "40 / 30 / 30", "al aprobar cada fase". Un hito por pago, con su porcentaje
    del monto en efectivo y su disparador: "SIGNING" (al firmar o al aprobar la
    propuesta), "DELIVERY" (a la entrega), "PHASE" (al cerrar una fase; di cuál
    en la descripción), "DATE" (fecha fija). Los porcentajes suman 100.
    La "description" de cada hito es corta (máx. 40 caracteres): "50 % al firmar",
    "50 % a la entrega", "30 % al cerrar la fase 2". El detalle va en "paymentNotes".
  - "INSTALLMENTS" cuando hay abono más cuotas iguales periódicas (mensuales,
    quincenales, semanales).
  - "SINGLE" un solo pago. "UNSPECIFIED" si el documento no lo dice.
- Si las fases se facturan por separado, dilo en "paymentNotes".

## 5. Contrato

- HECHOS (partes, montos, moneda, fechas, entregables, forma de pago) se extraen
  y nunca se inventan: si no están, van null.
- CLÁUSULAS ("scope", "responsibilities", "terms") se REDACTAN con calidad
  contractual (servicios profesionales en Panamá) a partir del documento,
  completando lo que falte con cláusulas estándar. Cada cosa que agregues que no
  estaba en el documento va en "assumptions", en una frase.
- "terms" incluye forma de pago exacta (con el canje si existe), plazo de
  ejecución y desde cuándo corre, garantía, soporte posterior y su tarifa,
  costos de terceros a cargo del cliente, propiedad intelectual,
  confidencialidad, cambios de alcance y causales de terminación.
- "responsibilities" separa lo que entrega el proveedor y lo que se obliga el
  cliente (contenidos, accesos, aprobaciones, cuentas a su nombre, contraparte).

## Reglas estrictas

- Montos, fechas y nombres de partes NO se inventan. Nunca deduzcas fechas de la
  fecha de hoy. Un plazo como "hasta 3 meses desde la recepción de contenidos"
  va en "durationText", no se convierte en fecha.
- "clientName" es quien contrata (el "Preparado para"), nunca Pime Panamá.
- "value": el valor total que el cliente se compromete a pagar (efectivo más
  canje). Si las fases son independientes y opcionales, es la suma de las fases
  NO opcionales, y lo dices en "assumptions".
- Redacta en el idioma del documento.
- "noCommercialContent" es true solo si el documento no tiene nada comercial
  aprovechable (ni servicios, ni productos, ni alcance, ni montos).`;

const USER_PROMPT =
  "Lee el documento completo, página por página, y devuelve el JSON con todas sus fases, todos sus entregables, la forma de pago y el borrador del contrato.";

const nullableString = { type: ["string", "null"] } as const;
const nullableNumber = { type: ["number", "null"] } as const;

/** Salida estructurada estricta: el modelo no puede saltarse ni renombrar campos. */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "noCommercialContent", "documentOutline", "sourceType", "documentSummary", "projectName",
    "contractTitle", "clientName", "value", "currency", "startsAt", "endsAt",
    "durationText", "description", "scope", "scopeIncludes", "scopeExcludes",
    "phases", "payment", "responsibilities", "terms", "assumptions",
  ],
  properties: {
    noCommercialContent: { type: "boolean" },
    documentOutline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["section", "items"],
        properties: {
          section: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
      },
    },
    sourceType: { type: "string", enum: ["CONTRACT", "PROPOSAL", "QUOTE", "PRODUCT", "SCOPE", "OTHER"] },
    documentSummary: { type: "string" },
    projectName: { type: "string" },
    contractTitle: { type: "string" },
    clientName: nullableString,
    value: nullableNumber,
    currency: nullableString,
    startsAt: nullableString,
    endsAt: nullableString,
    durationText: nullableString,
    description: { type: "string" },
    scope: { type: "string" },
    scopeIncludes: { type: "array", items: { type: "string" } },
    scopeExcludes: { type: "array", items: { type: "string" } },
    phases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "summary", "amount", "timeframe", "estimatedDays", "optional", "deliverables"],
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          amount: nullableNumber,
          timeframe: nullableString,
          estimatedDays: nullableNumber,
          optional: { type: "boolean" },
          deliverables: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "description", "dueDate"],
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                dueDate: nullableString,
              },
            },
          },
        },
      },
    },
    payment: {
      type: "object",
      additionalProperties: false,
      required: ["cashAmount", "barter", "schedule", "milestones", "installments", "paymentNotes"],
      properties: {
        cashAmount: nullableNumber,
        barter: {
          type: ["object", "null"],
          additionalProperties: false,
          required: ["amount", "description"],
          properties: { amount: { type: "number" }, description: { type: "string" } },
        },
        schedule: { type: "string", enum: ["MILESTONES", "INSTALLMENTS", "SINGLE", "UNSPECIFIED"] },
        milestones: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["description", "percent", "trigger", "dueDate"],
            properties: {
              description: { type: "string" },
              percent: { type: "number" },
              trigger: { type: "string", enum: ["SIGNING", "DELIVERY", "PHASE", "DATE"] },
              dueDate: nullableString,
            },
          },
        },
        installments: {
          type: ["object", "null"],
          additionalProperties: false,
          required: ["downPayment", "count", "frequency", "firstDueDate"],
          properties: {
            downPayment: { type: "number" },
            count: { type: "number" },
            frequency: { type: "string", enum: ["MONTHLY", "BIWEEKLY", "WEEKLY"] },
            firstDueDate: nullableString,
          },
        },
        paymentNotes: nullableString,
      },
    },
    responsibilities: { type: "string" },
    terms: { type: "string" },
    assumptions: { type: "array", items: { type: "string" } },
  },
} as const;

export type DocumentAnalysis = {
  noCommercialContent: boolean;
  phases: { deliverables: { name: string; description: string; dueDate: string | null }[] }[];
  [key: string]: unknown;
};


export type AnalyzeInput = { fileName?: string; fileDataUrl?: string; text?: string };

export async function analyzeProjectDocument(
  openai: OpenAI,
  input: AnalyzeInput,
  model: string = ANALYZE_MODEL
) {
  const reasoning = model.startsWith("gpt-5");
  // El PDF va directo al modelo: no hay que extraer texto y así también
  // funcionan las propuestas escaneadas.
  const content: OpenAI.Responses.ResponseInputContent[] = input.fileDataUrl
    ? [
        { type: "input_file", filename: String(input.fileName ?? "documento.pdf"), file_data: String(input.fileDataUrl) },
        { type: "input_text", text: USER_PROMPT },
      ]
    : [{ type: "input_text", text: `${USER_PROMPT}\n\n${input.text ?? ""}` }];

  const response = await openai.responses.create({
    model,
    instructions: INSTRUCTIONS,
    input: [{ role: "user", content }],
    text: {
      format: {
        type: "json_schema",
        name: "project_from_document",
        strict: true,
        schema: SCHEMA as unknown as Record<string, unknown>,
      },
    },
    // Todas las fases con todos sus entregables, más el contrato redactado.
    // Los modelos de razonamiento gastan parte del presupuesto pensando.
    max_output_tokens: reasoning ? 48000 : 24000,
    ...(reasoning ? { reasoning: { effort: "medium" as const } } : { temperature: 0.1 }),
  });

  return {
    incomplete: response.status === "incomplete",
    outputText: response.output_text || "",
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

/** Lo mismo con Claude: el PDF va como documento y la salida sigue el mismo esquema. */
export async function analyzeProjectDocumentConClaude(input: AnalyzeInput) {
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = input.fileDataUrl ? String(input.fileDataUrl).split(",")[1] ?? "" : "";
  const content: Anthropic.Beta.BetaContentBlockParam[] = base64
    ? [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 }, title: String(input.fileName ?? "documento.pdf") },
        { type: "text", text: USER_PROMPT },
      ]
    : [{ type: "text", text: `${USER_PROMPT}\n\n${input.text ?? ""}` }];
  // Salida larga (todas las fases con sus entregables y el contrato): va en streaming.
  const r = await claude.beta.messages
    .stream({
      model: MODELO_CLAUDE,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // El esquema es demasiado grande para la salida estructurada de Claude: va en el prompt.
      system: `${INSTRUCTIONS}\n\nResponde únicamente con un objeto JSON que cumpla exactamente este esquema (todas las claves, sin texto antes ni después y sin cercas de código):\n${JSON.stringify(SCHEMA)}`,
      output_config: { effort: "medium" },
      messages: [{ role: "user", content }],
    })
    .finalMessage();
  return {
    incomplete: r.stop_reason === "max_tokens" || r.stop_reason === "refusal",
    outputText: soloJson(r.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("")),
    inputTokens: r.usage.input_tokens,
    outputTokens: r.usage.output_tokens,
    model: r.model,
  };
}
