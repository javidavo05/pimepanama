import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "gpt-4o";
const MAX_BYTES = 12 * 1024 * 1024;

const INSTRUCTIONS = `Eres un abogado corporativo panameño que redacta contratos de servicios.

Recibes CUALQUIER documento comercial: una propuesta, una cotización, un detalle
de producto o servicio, un alcance técnico, un pliego, un correo con lo acordado,
o un contrato ya firmado. Tu trabajo NO es solo extraer: es CONVERTIR ese
documento en el borrador de un contrato listo para revisar.

Trabajas en dos niveles distintos y no los mezclas:

1. HECHOS — se extraen, nunca se inventan. Si no están en el documento van null:
   partes, montos, moneda, fechas, entregables listados, forma de pago.
2. CLÁUSULAS — se REDACTAN. Aunque el documento sea una propuesta de dos páginas,
   escribes alcance, responsabilidades y términos con calidad contractual, usando
   los hechos del documento y completando con cláusulas estándar del sector
   (servicios profesionales en Panamá) lo que el documento no diga.

Devuelve SOLO un objeto JSON con estas claves exactas:
- "sourceType": uno de "CONTRACT" | "PROPOSAL" | "QUOTE" | "PRODUCT" | "SCOPE" | "OTHER".
  Qué es el documento que recibiste, no lo que estás produciendo.
- "projectName" (string): nombre corto del proyecto que nace de este documento.
- "contractTitle" (string): título del contrato. Si el documento ya es un contrato,
  úsalo tal cual; si no, redáctalo (ej. "Contrato de prestación de servicios — <proyecto>").
- "clientName" (string|null): el CLIENTE que contrata, no el proveedor.
- "value" (number|null): valor total en números, sin símbolo de moneda.
- "currency" (string|null): código ISO, ej. "USD".
- "startsAt" (string|null) y "endsAt" (string|null): formato yyyy-mm-dd.
- "scope" (string): el alcance del trabajo, en prosa contractual. Detalla qué se
  hace y qué queda expresamente fuera.
- "responsibilities" (string): qué se obliga a entregar cada parte. Incluye las
  obligaciones del cliente (accesos, información, aprobaciones, contraparte).
- "terms" (string): condiciones de pago, plazos, propiedad intelectual,
  confidencialidad, garantía, causales de terminación.
- "deliverables" (array de objetos con "name", "description", "dueDate"):
  entregables concretos y verificables. Si el documento describe servicios sin
  listarlos como entregables, conviértelos en entregables. "name" corto
  (máx. 60 caracteres), "description" una oración. "dueDate" en yyyy-mm-dd o null.
- "financing" (objeto|null): SOLO si el documento describe pagos fraccionados.
  Claves: "downPayment" (number), "installments" (number),
  "frequency" ("MONTHLY"|"BIWEEKLY"|"WEEKLY"), "firstDueDate" (yyyy-mm-dd|null).
- "assumptions" (array de strings): cada cláusula o dato que redactaste tú y que
  NO estaba en el documento, en una frase. Es lo que el usuario debe revisar.
  Array vacío si todo salió del documento.

Reglas estrictas:
- Montos, fechas y nombres de partes NO se inventan jamás: o están en el
  documento o van null. Nunca deduzcas fechas de la fecha de hoy.
- Las cláusulas sí se redactan, pero cada supuesto que agregues va en "assumptions".
- Redacta en el mismo idioma del documento.
- Solo si el documento no tiene ningún contenido comercial aprovechable
  (ni servicios, ni productos, ni alcance, ni montos) devuelve
  {"error":"sin_contenido_comercial"}.`;

const USER_PROMPT =
  "Convierte este documento en el borrador de contrato y devuelve el JSON pedido.";

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { fileName, fileDataUrl, text } = await request.json();

    if (!fileDataUrl && !text?.trim()) {
      return NextResponse.json(
        { error: "Adjunta un PDF o pega el texto del documento" },
        { status: 400 }
      );
    }

    if (fileDataUrl) {
      const base64 = String(fileDataUrl).split(",")[1] ?? "";
      if (Buffer.byteLength(base64, "base64") > MAX_BYTES) {
        return NextResponse.json({ error: "El archivo supera 12 MB" }, { status: 413 });
      }
    }

    const start = Date.now();

    // El PDF va directo al modelo: no hay que extraer texto y así también
    // funcionan las propuestas escaneadas.
    const content: OpenAI.Responses.ResponseInputContent[] = fileDataUrl
      ? [
          { type: "input_file", filename: String(fileName ?? "documento.pdf"), file_data: String(fileDataUrl) },
          { type: "input_text", text: USER_PROMPT },
        ]
      : [{ type: "input_text", text: `${USER_PROMPT}\n\n${text}` }];

    const response = await openai.responses.create({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: [{ role: "user", content }],
      text: { format: { type: "json_object" } },
      // Redactar cláusulas ocupa mucho más que extraerlas de un contrato hecho.
      max_output_tokens: 6000,
      temperature: 0.2,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const costUSD = calcGptCost(inputTokens, outputTokens);

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(response.output_text || "{}");
    } catch {
      return NextResponse.json(
        { error: "El modelo no devolvió un JSON válido. Intenta de nuevo." },
        { status: 502 }
      );
    }

    // El modelo a veces responde "mensual" en vez del enum: se normaliza en vez
    // de confiar en que respete el formato.
    const FREQ: Record<string, "MONTHLY" | "BIWEEKLY" | "WEEKLY"> = {
      mensual: "MONTHLY", monthly: "MONTHLY", mes: "MONTHLY",
      quincenal: "BIWEEKLY", biweekly: "BIWEEKLY", quincena: "BIWEEKLY",
      semanal: "WEEKLY", weekly: "WEEKLY", semana: "WEEKLY",
    };
    const fin = parsed.financing as Record<string, unknown> | null | undefined;
    if (fin && typeof fin === "object") {
      const raw = String(fin.frequency ?? "").trim().toLowerCase();
      fin.frequency = FREQ[raw] ?? (["MONTHLY", "BIWEEKLY", "WEEKLY"].includes(raw.toUpperCase())
        ? raw.toUpperCase()
        : "MONTHLY");
    }

    const SOURCES = ["CONTRACT", "PROPOSAL", "QUOTE", "PRODUCT", "SCOPE", "OTHER"];
    const rawSource = String(parsed.sourceType ?? "").trim().toUpperCase();
    parsed.sourceType = SOURCES.includes(rawSource) ? rawSource : "OTHER";

    if (!Array.isArray(parsed.assumptions)) parsed.assumptions = [];

    if (parsed.error === "sin_contenido_comercial") {
      return NextResponse.json(
        {
          error:
            "El documento no tiene contenido comercial aprovechable: no se ven servicios, alcance ni montos.",
        },
        { status: 422 }
      );
    }

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "analyze-contract",
        model: MODEL,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json({ ...parsed, costUSD });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : "Error al analizar el documento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
