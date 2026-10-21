import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calcGptCost } from "@/lib/ai-pricing";
import { brandSystemPrompt } from "@/lib/ai/pime-brand-voice";
import { projects } from "@/lib/portfolio/catalog";

/**
 * Propuesta corta que acompaña el primer correo a un prospecto: cinco páginas (portada, lo que vimos, qué
 * construiríamos, lo que viene después y próximos pasos). Es la misma forma de las propuestas que se mandaron a
 * mano a PFS y a APE el 2026-10-19, ahora con react-pdf y redactada por la IA desde lo que el agente investigó.
 *
 * Sin precios: el prospecto todavía no habló con nadie. Cada fase dice «precio cerrado» y se cotiza después de la
 * reunión. La página de costos de terceros, garantía y soporte es fija (templates/propuesta-prospecto-pdf.tsx).
 */

// Los máximos son un tope de seguridad (el doble de lo que cabe cómodo), no un límite de redacción.
const texto = (max: number) => z.string().trim().min(1).max(max);

export const propuestaProspectoSchema = z.object({
  /** Arriba del título de la portada: «Propuesta · Plataforma de operación naviera». */
  eyebrow: texto(160),
  titulo: texto(220),
  subtitulo: texto(520),
  vimos: z.object({
    titulo: texto(180),
    tarjetas: z.array(z.object({ titulo: texto(100), texto: texto(520) })).min(2).max(3),
    duele: texto(840),
    bien: texto(840),
  }),
  construiriamos: z.object({
    titulo: texto(180),
    fases: z.array(z.object({ nombre: texto(100), plazo: texto(80), texto: texto(560) })).min(1).max(3),
    /** Un caso real del catálogo o de las notas del agente. Null si ninguno se parece. */
    caso: z.object({ nombre: texto(120), texto: texto(640) }).nullable(),
    comoTrabajamos: z.array(texto(180)).min(3).max(5),
    /** Ejemplo de falla crítica en el sistema propuesto, para la tabla de soporte. */
    ejemploCritico: texto(180),
  }),
  /** Si la IA deja menos de dos, el PDF usa los pasos de siempre (templates/propuesta-prospecto-pdf.tsx). */
  pasos: z.array(z.object({ titulo: texto(120), texto: texto(400) })).max(4).default([]),
  /** El correo que presenta la propuesta adjunta. Opcional: las primeras propuestas (21-oct-2026) no lo traían. */
  correo: z.object({ asunto: texto(200), cuerpo: texto(3000) }).optional(),
});

export type PropuestaProspecto = z.infer<typeof propuestaProspectoSchema>;

export function leerPropuesta(valor: unknown): PropuestaProspecto | null {
  const r = propuestaProspectoSchema.safeParse(valor);
  return r.success ? r.data : null;
}

const FORMA_ES = `{
  "eyebrow": "Propuesta · <tipo de sistema en 3-5 palabras>",
  "titulo": "lo que haría el sistema para ESTA empresa, nombrándola (máx. 12 palabras)",
  "subtitulo": "1-2 oraciones: es una idea a partir de lo que se vio desde afuera, para validar en una conversación de 20 minutos",
  "vimos": {
    "titulo": "el hallazgo principal en una frase corta",
    "tarjetas": [{ "titulo": "hecho observado (3-5 palabras)", "texto": "1-2 oraciones con el hecho y de dónde sale" }],
    "duele": "dónde suele doler en empresas así, sin afirmar que a ellos les pasa",
    "bien": "lo que ya tienen bien y que no se reemplaza"
  },
  "construiriamos": {
    "titulo": "del <inicio del proceso> al <final>, en una frase",
    "fases": [{ "nombre": "nombre corto", "plazo": "Estimado: N–M semanas", "texto": "1-2 oraciones con el entregable verificable" }],
    "caso": { "nombre": "cliente del caso", "texto": "qué construimos y por qué aplica aquí" },
    "comoTrabajamos": ["El código es de ustedes, sin comisiones", "Trato directo con el fundador de Pime", "..."],
    "ejemploCritico": "falla crítica típica del sistema propuesto, p. ej. «El cotizador no abre o no permite enviar cotizaciones»"
  },
  "pasos": [{ "titulo": "Conversación de 20 minutos", "texto": "1 oración" }],
  "correo": { "asunto": "una idea concreta para ESTA empresa (máx. 10 palabras)", "cuerpo": "el correo completo, ver reglas" }
}`;

// En inglés la forma va en inglés: con los ejemplos en español, el modelo mezclaba los dos idiomas.
const FORMA_EN = `{
  "eyebrow": "Proposal · <type of system in 3-5 words>",
  "titulo": "what the system would do for THIS company, naming it (max. 12 words)",
  "subtitulo": "1-2 sentences: an idea based on what we saw from the outside, to validate in a 20-minute conversation",
  "vimos": {
    "titulo": "the main finding in one short sentence",
    "tarjetas": [{ "titulo": "observed fact (3-5 words)", "texto": "1-2 sentences with the fact and where it comes from" }],
    "duele": "where it usually hurts for companies like this, without claiming it happens to them",
    "bien": "what they already do well and won't be replaced"
  },
  "construiriamos": {
    "titulo": "from <start of the process> to <end>, in one sentence",
    "fases": [{ "nombre": "short name", "plazo": "Estimate: N–M weeks", "texto": "1-2 sentences with the verifiable deliverable" }],
    "caso": { "nombre": "case client", "texto": "what we built and why it applies here" },
    "comoTrabajamos": ["The code is yours, no commissions", "You work directly with Pime's founder", "..."],
    "ejemploCritico": "typical critical failure of the proposed system, e.g. «The portal is down or clients can't submit requests»"
  },
  "pasos": [{ "titulo": "20-minute conversation", "texto": "1 sentence" }],
  "correo": { "asunto": "a concrete idea for THIS company (max. 10 words)", "cuerpo": "the full email, see rules" }
}`;

const CANTIDADES = {
  es: 'Cantidades exactas: "vimos.tarjetas" 3 elementos; "construiriamos.fases" 2 o 3; "comoTrabajamos" 4; "pasos" 3 (conversación de 20 minutos, propuesta con precio cerrado en tres días hábiles, primera entrega en dos semanas). "correo" siempre.',
  en: 'Exact counts: "vimos.tarjetas" 3 items; "construiriamos.fases" 2 or 3; "comoTrabajamos" 4; "pasos" 3 (20-minute conversation, fixed-price proposal within three business days, first delivery in two weeks). "correo" always. Every value in English; only the JSON keys stay as they are.',
};

/** Casos que se pueden nombrar. Grupo GRF nunca se nombra (decisión de Javier, 2026-10-19). */
function casosNombrables(): string {
  return projects
    .filter((p) => p.client && !/grf/i.test(`${p.client} ${p.name}`) && ["produccion", "interno", "beta"].includes(p.status))
    .map((p) => `- ${p.client} (${p.industry}): ${p.tagline}`)
    .join("\n");
}

const REGLAS_CORREO = {
  es: `"correo" es el primer correo que acompaña la propuesta, con la forma de los que ya se enviaron:
    1) saludo («Hola, equipo de <empresa>:»);
    2) un párrafo con lo que vimos de ellos (hechos de las notas) y por qué pesa;
    3) un párrafo: soy Javier Vallejo, fundador de Pime, empresa panameña de software a medida; el caso relacionado en una frase; «Les adjunto una propuesta corta: <las fases en una frase>»; cada pieza se aprueba por separado y el código es de ellos;
    4) cierre: «¿Les parece una conversación de 20 minutos esta semana o la próxima? Si no es de su interés, lo entiendo.».
  Máximo 140 palabras. Sin despedida ni firma (la firma del buzón va sola), sin dirección postal ni enlace de baja (se agregan solos), sin precios. Párrafos separados por una línea en blanco.`,
  en: `"correo" is the first email that goes with the proposal, shaped like the ones already sent:
    1) greeting («Hi <company> team,»);
    2) one paragraph with what we saw about them (facts from the notes) and why it matters;
    3) one paragraph: I'm Javier Vallejo, founder of Pime, a custom software studio in Panama (same time zone as the U.S. East Coast, billing in USD); the related case in one sentence; «I've attached a short proposal: <the phases in one sentence>»; each piece is approved separately and the code belongs to them;
    4) close: «Would a 20-minute call this week or next work for you? If it's not a fit, no worries.».
  At most 140 words, all in English. No sign-off or signature (the mailbox signature is added), no postal address or unsubscribe link (added automatically), no prices. Paragraphs separated by a blank line.`,
};

export class PropuestaError extends Error {}

export async function redactarPropuesta(p: {
  empresa: string;
  idioma: "es" | "en";
  notas: string;
  asunto: string;
  cuerpo: string;
  supabaseUid: string;
}): Promise<{ propuesta: PropuestaProspecto; costUSD: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new PropuestaError("Falta OPENAI_API_KEY en el servidor.");

  const system = brandSystemPrompt(
    `Redactas la propuesta corta en PDF que acompaña el primer correo de Pime a un prospecto que todavía no conoce a Pime. El agente de prospección ya investigó la empresa desde afuera (sitio, redes): sus notas son tu única fuente sobre ella.

Reglas no negociables:
- Todo lo que digas de la empresa sale de las notas. Si algo no está en las notas, no lo afirmes. Lo que no se sabe de su operación interna se plantea como hipótesis («suele pasar»), nunca como diagnóstico.
- Sin precios ni montos de Pime: cada fase se cotiza con precio cerrado después de la reunión.
- Las fases son independientes: la primera es el punto de partida; las demás son opcionales y se aprueban por separado. Plazos siempre en rangos de semanas.
- El caso relacionado solo puede ser uno de esta lista o uno que las notas del agente mencionen. Si ninguno aplica, "caso": null. Nunca inventes clientes.
${casosNombrables()}
- Escribe en ${p.idioma === "en" ? "inglés (EE. UU.), tratando al lector de «you»" : "español neutro panameño, tratando al lector de «ustedes»"}.
- ${REGLAS_CORREO[p.idioma]}
- Breve: cada texto entra en una tarjeta de una página carta. Nada de relleno.
- ${CANTIDADES[p.idioma]}

Responde ÚNICAMENTE con un JSON con exactamente esta forma:
${p.idioma === "en" ? FORMA_EN : FORMA_ES}`,
    p.idioma,
  );

  const user = `Empresa: ${p.empresa}

Notas del agente de prospección:
${p.notas.slice(0, 6000)}

Borrador de correo que dejó el agente (úsalo de base para "correo"; ya no ofrezcas «enviar un resumen»: la propuesta va adjunta):
Asunto: ${p.asunto}
${p.cuerpo.slice(0, 3000)}`;

  const openai = new OpenAI({ apiKey });
  let costUSD = 0;
  // Un segundo intento si la forma no cuadra: el modelo a veces recorta una lista.
  for (let intento = 1; ; intento++) {
    const r = await pedir(openai, system, user, p.supabaseUid);
    costUSD += r.costUSD;
    if (r.propuesta) return { propuesta: r.propuesta, costUSD };
    if (intento >= 2) throw new PropuestaError(r.error);
  }
}

async function pedir(openai: OpenAI, system: string, user: string, supabaseUid: string): Promise<{ propuesta: PropuestaProspecto | null; error: string; costUSD: number }> {
  const inicio = Date.now();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.5,
    max_tokens: 2200,
    response_format: { type: "json_object" },
  });

  const entrada = resp.usage?.prompt_tokens ?? 0;
  const salida = resp.usage?.completion_tokens ?? 0;
  await prisma.aiUsageLog
    .create({ data: { supabaseUid, operation: "lead-propuesta-prospecto", model: "gpt-4o", inputTokens: entrada, outputTokens: salida, durationMs: Date.now() - inicio } })
    .catch(() => null);

  const costUSD = calcGptCost(entrada, salida);
  let json: unknown;
  try {
    json = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
  } catch {
    return { propuesta: null, error: "La IA devolvió algo que no se pudo leer. Vuelve a intentarlo.", costUSD };
  }
  const r = propuestaProspectoSchema.safeParse(json);
  if (!r.success) {
    console.error("[propuesta-prospecto] forma inválida", r.error.issues);
    return { propuesta: null, error: "La IA dejó la propuesta incompleta. Vuelve a intentarlo.", costUSD };
  }
  return { propuesta: r.data, error: "", costUSD };
}
