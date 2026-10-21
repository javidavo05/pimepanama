/** La misma vuelta del asistente, con Claude como cerebro (ASISTENTE_IA=claude). Mismas herramientas, mismas reglas. */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { HERRAMIENTAS, ejecutarHerramienta, type Accion } from "./herramientas";
import type { U } from "./operaciones";
import { resumenDe, type Mensaje } from "./conversar";

const MODELO = process.env.ASISTENTE_MODELO_CLAUDE || "claude-opus-5-5";
const MAX_VUELTAS = 16;

/** Las definiciones de herramientas están en formato de OpenAI; Claude recibe nombre, descripción y el mismo esquema. */
const HERRAMIENTAS_CLAUDE: Anthropic.Beta.BetaTool[] = HERRAMIENTAS.flatMap((h) =>
  h.type === "function" ? [{ name: h.function.name, description: h.function.description ?? "", input_schema: (h.function.parameters ?? { type: "object", properties: {} }) as Anthropic.Beta.BetaTool.InputSchema }] : [],
);

export async function conversarConClaude(user: U & { supabaseUid: string }, historial: Mensaje[], sistema: string): Promise<{ respuesta: string; acciones: Accion[] }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const pedido = [...historial].reverse().find((m) => m.rol === "usuario")?.texto ?? "";
  const recientes = await prisma.assistantAction.findMany({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3 * 3600_000) } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, kind: true, summary: true, status: true, resultId: true, payload: true } });
  const ids = (p: unknown) => Object.fromEntries(Object.entries((p ?? {}) as Record<string, unknown>).filter(([k, v]) => /Id$/.test(k) && typeof v === "string"));
  const contexto = recientes.length ? `\n\nLo último que hiciste o propusiste (de lo más nuevo a lo más viejo):\n${recientes.map((a) => `- ${a.status} · ${a.kind} · ${a.summary} · accionId ${a.id}${a.resultId ? ` · resultado ${a.resultId}` : ""} · ${JSON.stringify(ids(a.payload))}`).join("\n")}` : "";

  const mensajes: Anthropic.Beta.BetaMessageParam[] = historial.slice(-16).map((m) => ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto.slice(0, 4000) }));
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  const acciones: Accion[] = [];
  let entrada = 0, salida = 0;
  const t0 = Date.now();
  const anotarUso = () => prisma.aiUsageLog.create({ data: { supabaseUid: user.supabaseUid, operation: "asistente", model: MODELO, inputTokens: entrada, outputTokens: salida, durationMs: Date.now() - t0 } }).catch(() => {});

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    // Si Claude declina por seguridad, el servidor reintenta solo con el modelo de respaldo que corresponda.
    const r = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: [{ type: "text", text: sistema + contexto }],
      tools: HERRAMIENTAS_CLAUDE,
      tool_choice: { type: "auto" },
      messages: mensajes,
    });
    entrada += r.usage.input_tokens; salida += r.usage.output_tokens;
    mensajes.push({ role: "assistant", content: r.content });
    if (r.stop_reason === "refusal") { await anotarUso(); return { respuesta: resumenDe(acciones) || "No puedo ayudar con eso.", acciones }; }
    const usos = r.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (r.stop_reason !== "tool_use" || !usos.length) {
      await anotarUso();
      const texto = r.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      return { respuesta: texto || resumenDe(acciones) || "Listo.", acciones };
    }
    // En orden: una herramienta puede depender de lo que hizo la anterior. Todos los resultados van en un solo mensaje.
    const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const u of usos) {
      let resultado: unknown, error = false;
      try { resultado = await ejecutarHerramienta(user, u.name, (u.input ?? {}) as Record<string, unknown>, pedido, acciones); } catch (e) { resultado = { error: e instanceof Error ? e.message : "Falló la herramienta." }; error = true; }
      resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(resultado ?? null).slice(0, 12000), is_error: error || undefined });
    }
    mensajes.push({ role: "user", content: resultados });
  }
  await anotarUso();
  return { respuesta: resumenDe(acciones) || "No pude terminar eso. ¿Me lo dices de otra forma?", acciones };
}
