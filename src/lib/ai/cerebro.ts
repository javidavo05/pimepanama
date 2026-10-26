/**
 * El cerebro de toda la IA de Pime Suite: OpenAI o Claude. Se elige en Jarvis (nodo «Asistente»)
 * y queda guardado en CompanyConfig.cerebroIa, así vale para todo el equipo y todos los dispositivos.
 *
 * `clienteIA()` devuelve un cliente con la misma forma que `openai.chat.completions.create`:
 * con Claude, traduce el pedido y devuelve la respuesta con la forma de OpenAI. Así cada ruta
 * cambia una línea y no su lógica. La transcripción de voz no pasa por aquí: sigue en Whisper.
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export type Cerebro = "openai" | "claude";
export const MODELO_CLAUDE = process.env.ASISTENTE_MODELO_CLAUDE || "claude-sonnet-5-5";
export const NOMBRE_CEREBRO: Record<Cerebro, string> = { openai: "OpenAI", claude: "Claude" };

/** Qué cerebros tienen su llave en el servidor. */
export function cerebrosDisponibles(): Record<Cerebro, boolean> {
  return { openai: !!process.env.OPENAI_API_KEY, claude: !!process.env.ANTHROPIC_API_KEY };
}

/** El pedido si tiene llave; si no, OpenAI, y Claude como último recurso. null si no hay ninguna llave. */
export function elegirCerebro(pedido?: unknown): Cerebro | null {
  const d = cerebrosDisponibles();
  if ((pedido === "openai" || pedido === "claude") && d[pedido]) return pedido;
  return d.openai ? "openai" : d.claude ? "claude" : null;
}

// Una lectura por minuto basta: el cambio desde Jarvis limpia este recuerdo en la misma instancia.
let recuerdo: { valor: string | null; hasta: number } | null = null;

/** Lo guardado en Configuración, sin pasar por las llaves. */
export async function cerebroGuardado(): Promise<string | null> {
  if (recuerdo && recuerdo.hasta > Date.now()) return recuerdo.valor;
  const c = await prisma.companyConfig.findFirst({ select: { cerebroIa: true } }).catch(() => null);
  recuerdo = { valor: c?.cerebroIa ?? null, hasta: Date.now() + 60_000 };
  return recuerdo.valor;
}

/** El cerebro que usa hoy la plataforma: el elegido en Jarvis, si tiene llave. */
export async function cerebroDeLaPlataforma(): Promise<Cerebro | null> {
  return elegirCerebro(await cerebroGuardado());
}

export async function guardarCerebro(configId: string, cerebro: Cerebro) {
  await prisma.companyConfig.update({ where: { id: configId }, data: { cerebroIa: cerebro } });
  recuerdo = { valor: cerebro, hasta: Date.now() + 60_000 };
}

type Pedido = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
export type ClienteIA = {
  cerebro: Cerebro;
  chat: { completions: { create(p: Pedido): Promise<OpenAI.Chat.Completions.ChatCompletion> } };
};

/** Error con la forma que ya esperan las rutas: un Response 503 que devuelven tal cual. */
function sinLlave(): Response {
  return new Response(JSON.stringify({ error: "Falta la llave de IA en el servidor (OpenAI o Claude)." }), { status: 503, headers: { "Content-Type": "application/json" } });
}

export async function clienteIA(opciones: { maxRetries?: number; cerebro?: Cerebro } = {}): Promise<ClienteIA> {
  const cerebro = opciones.cerebro ?? (await cerebroDeLaPlataforma());
  if (!cerebro) throw sinLlave();
  if (cerebro === "openai") {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: opciones.maxRetries });
    return { cerebro, chat: { completions: { create: (p) => openai.chat.completions.create(p) } } };
  }
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: opciones.maxRetries });
  return { cerebro, chat: { completions: { create: (p) => conClaude(claude, p) } } };
}

const textoDe = (c: OpenAI.Chat.Completions.ChatCompletionMessageParam["content"]): string =>
  typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => ("text" in x && typeof x.text === "string" ? x.text : "")).join("\n") : "";

/** Saca el objeto JSON de la respuesta aunque venga con cercas de código o una frase alrededor. */
export function soloJson(t: string): string {
  const s = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

async function conClaude(claude: Anthropic, p: Pedido): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const json = p.response_format?.type === "json_object" || p.response_format?.type === "json_schema";
  const sistema = p.messages.filter((m) => m.role === "system" || m.role === "developer").map((m) => textoDe(m.content)).join("\n\n");
  const mensajes: Anthropic.Beta.BetaMessageParam[] = p.messages
    .filter((m): m is OpenAI.Chat.Completions.ChatCompletionUserMessageParam | OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: textoDe(m.content) || "." }));
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  if (!mensajes.length) mensajes.push({ role: "user", content: "." });

  // Si Claude declina por seguridad, el servidor reintenta solo con el modelo de respaldo que corresponda.
  // El tope de salida es holgado porque el razonamiento también cuenta; el largo lo pide cada prompt.
  const r = await claude.beta.messages.create({
    model: MODELO_CLAUDE,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: p.reasoning_effort === "medium" || p.reasoning_effort === "high" ? p.reasoning_effort : "low" },
    system: json ? `${sistema}\n\nResponde únicamente con un objeto JSON válido, sin texto antes ni después y sin cercas de código.` : sistema,
    messages: mensajes,
  });
  const texto = r.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  if (r.stop_reason === "refusal") throw new Error("Claude no quiso responder ese pedido.");
  return {
    id: r.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: r.model,
    choices: [{ index: 0, logprobs: null, finish_reason: r.stop_reason === "max_tokens" ? "length" : "stop", message: { role: "assistant", content: json ? soloJson(texto) : texto, refusal: null } }],
    usage: { prompt_tokens: r.usage.input_tokens, completion_tokens: r.usage.output_tokens, total_tokens: r.usage.input_tokens + r.usage.output_tokens },
  };
}
