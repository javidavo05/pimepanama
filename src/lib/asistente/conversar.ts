/** Una vuelta de conversación con el asistente: el modelo usa herramientas hasta poder responder. */
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { HERRAMIENTAS, ejecutarHerramienta, type Propuesta } from "./herramientas";

export type Mensaje = { rol: "usuario" | "asistente"; texto: string };

const MODELOS = ["gpt-4.1", "gpt-4o"];

function sistema(nombre: string | null) {
  const hoy = new Date().toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Panama" });
  const iso = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  return `Eres el asistente de Pime Suite, el sistema con el que Pime Panamá (empresa de software a medida) opera. Hablas con ${nombre ?? "el dueño"}, en español de Panamá, corto y directo.
Hoy es ${hoy} (${iso}), hora de Panamá.

Reglas:
- Para actuar sobre un cliente o proyecto nombrado, búscalo primero (buscar_cliente / buscar_proyecto). Los nombres llegan aproximados o dictados por voz: «Holo Realtor» es HOLO REAL ESTATE. Si hay más de un candidato razonable, pregunta cuál en una línea.
- Nunca escribes directo: usas las herramientas proponer_* y la persona confirma en pantalla. Después de proponer, di en una línea qué propusiste y que toque Confirmar. Nunca digas que ya está hecho.
- Facturas: si piden una factura y el cliente tiene proyectos activos, y no dijeron si es de un proyecto o aparte, pregunta en una línea «¿Es del proyecto X o aparte?». Si dicen «aparte», «no es de un proyecto» o dan un concepto que no es un proyecto, propón sin proyectoId. Montos en USD.
- Fechas relativas («el viernes», «mañana») conviértelas a YYYY-MM-DD respecto de hoy.
- Pagos: si no dicen el método, pregunta; si no dicen la fecha, usa hoy.
- Nunca envías correos ni mensajes a clientes: los envíos a clientes están apagados. Si te lo piden, dilo y deja el documento listo.
- Para preguntas de dinero o del día, usa dinero_y_agenda o resumen_cliente y responde con los números. Vencido es lo que preocupa.
- Si el mensaje trae varios pedidos (por ejemplo, una nota de voz larga después de una llamada), propone cada acción por separado en la misma vuelta y al final resume en una lista corta qué propusiste.
- No inventes datos: si una herramienta no lo trae, dilo.`;
}

export async function conversar(user: { id: string; supabaseUid: string; fullName: string | null }, historial: Mensaje[]): Promise<{ respuesta: string; propuestas: Propuesta[] }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pedido = [...historial].reverse().find((m) => m.rol === "usuario")?.texto ?? "";
  const mensajes: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: sistema(user.fullName?.split(" ")[0] ?? null) },
    ...historial.slice(-16).map((m) => ({ role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const), content: m.texto.slice(0, 4000) })),
  ];
  const propuestas: Propuesta[] = [];
  let modelo = MODELOS[0];
  let entrada = 0, salida = 0;
  const t0 = Date.now();

  for (let vuelta = 0; vuelta < 6; vuelta++) {
    let r: OpenAI.Chat.Completions.ChatCompletion;
    try {
      r = await openai.chat.completions.create({ model: modelo, messages: mensajes, tools: HERRAMIENTAS, tool_choice: "auto", temperature: 0.2 });
    } catch (e) {
      // Si la cuenta no tiene el modelo, se usa el siguiente.
      if (modelo !== MODELOS[MODELOS.length - 1] && /model|not found|does not exist|access/i.test(String(e))) { modelo = MODELOS[MODELOS.indexOf(modelo) + 1]; vuelta--; continue; }
      throw e;
    }
    entrada += r.usage?.prompt_tokens ?? 0; salida += r.usage?.completion_tokens ?? 0;
    const m = r.choices[0]?.message;
    if (!m) break;
    mensajes.push(m);
    if (!m.tool_calls?.length) {
      await prisma.aiUsageLog.create({ data: { supabaseUid: user.supabaseUid, operation: "asistente", model: modelo, inputTokens: entrada, outputTokens: salida, durationMs: Date.now() - t0 } }).catch(() => {});
      return { respuesta: m.content?.trim() || (propuestas.length ? "Revisa la propuesta y toca Confirmar." : "Listo."), propuestas };
    }
    for (const call of m.tool_calls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* argumentos vacíos */ }
      let resultado: unknown;
      try { resultado = await ejecutarHerramienta(user.id, call.function.name, args, pedido, propuestas); } catch (e) { resultado = { error: e instanceof Error ? e.message : "Falló la herramienta." }; }
      mensajes.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(resultado).slice(0, 12000) });
    }
  }
  await prisma.aiUsageLog.create({ data: { supabaseUid: user.supabaseUid, operation: "asistente", model: modelo, inputTokens: entrada, outputTokens: salida, durationMs: Date.now() - t0 } }).catch(() => {});
  return { respuesta: propuestas.length ? "Revisa la propuesta y toca Confirmar." : "No pude terminar eso. ¿Me lo dices de otra forma?", propuestas };
}
