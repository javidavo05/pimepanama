/** Una vuelta de conversación con el asistente: el modelo usa herramientas hasta poder responder. */
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { HERRAMIENTAS, ejecutarHerramienta, type Accion } from "./herramientas";
import type { U } from "./operaciones";
import { UMBRAL_USD } from "./reglas";

export type Mensaje = { rol: "usuario" | "asistente"; texto: string };
export type { Accion };

const MODELOS = ["gpt-4.1", "gpt-4o"];
/** Vueltas del modelo por pedido. Un «haz todo esto» largo cabe holgado; el tope evita que se quede dando vueltas. */
const MAX_VUELTAS = 16;

function sistema(nombre: string | null) {
  const ahora = new Date();
  const hoy = ahora.toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Panama" });
  const iso = new Date(ahora.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
  const anio = iso.slice(0, 4);
  return `Eres el asistente de Pime Suite, el sistema con el que opera Pime Panamá (software a medida). Hablas con ${nombre ?? "el dueño"} en español de Panamá, con tuteo, corto y directo.
Hoy es ${hoy} (${iso}), hora de Panamá.

Cómo trabajas:
- Haces los cambios tú mismo con las herramientas. Lo que está claro, hazlo sin preguntar ni pedir permiso. El sistema decide solo qué queda para que la persona confirme (borrar o anular, facturas ya emitidas, planes con pagos, más de 10 registros, o USD ${UMBRAL_USD.toLocaleString("en-US")} o más en una sola acción): tú llama la herramienta igual y cuenta lo que pasó.
- Pregunta solo si hay una duda real: dos clientes o proyectos posibles, falta un monto, no sabes de qué fase es. Una sola pregunta, en una línea.
- Antes de actuar consigue los ids: buscar_cliente, buscar_proyecto, ver_fases, ver_entregables, ver_pagos, ver_facturas, ver_tareas, ver_tickets, ver_gastos, ver_reuniones, ver_plataformas, ver_citas. Los nombres llegan aproximados o dictados por voz («Holo Realtor» es HOLO REAL ESTATE); si el mejor candidato es claro, úsalo.
- Pedidos con varias cosas («haz todo esto», una nota de voz larga): haz todas en esta misma vuelta. Llama varias herramientas a la vez cuando no dependen una de otra. Si una falla, sigue con las demás.

Fechas y dinero:
- Fechas en YYYY-MM-DD. Sin año («el 28 de agosto») son de ${anio}, salvo que eso las deje en el futuro: entonces son del año anterior. Las relativas («el viernes», «mañana») cuentan desde hoy. Un pago sin fecha es de hoy.
- Montos en USD. ITBMS solo si el cliente ya tuvo facturas con ITBMS (algunaFacturaConItbms en resumen_cliente).

Pagos y facturas:
- Método de pago: no lo preguntes; si no lo dicen, usa «otro».
- Si dicen de qué fase es el pago («fase 3»), busca la fase con ver_fases y usa pago_registrar con su faseId. Si no dicen fase pero el cliente tiene un solo proyecto activo, usa su proyectoId.
- Todo pago queda con su factura emitida en la cuenta del cliente, lista para descargar: la de la fase, una abierta del proyecto o una nueva por el monto. No preguntes si facturar. En la respuesta di qué factura quedó (número).
- pago_registrar no repite un pago igual (mismo cliente, fecha y monto). Si te dice que ya existe, no insistas: dilo.
- Tú no envías correos, invitaciones ni mensajes a clientes: no tienes herramienta para eso. Si te lo piden, dilo y deja todo listo en su cuenta; la invitación se manda desde la ficha del cliente.

Fases y proyectos:
- Las fases van fuera del contrato salvo que digan lo contrario. «Crea la fase 4 de 800 en curso» → fase_crear con nombre «Fase 4», precio 800, estado en_curso. Usa el nombre que diga la persona («Fase 3 · Escuelas»).
- «Inició» o «empezó» = en_curso; «la entregamos» = hecha; «en revisión» = en_revision.
- Si el cliente no tiene el proyecto, créalo con proyecto_crear antes. El proyecto es el producto o el contrato (contrato «Fase 2 Genius» → proyecto «Genius»), nunca el tema de la fase.
- Una fase que inició ya se debe aunque no tenga factura: cuenta en «por cobrar».
- Pime cobra casi siempre 50 % al firmar y 50 % a la entrega. Un plan nuevo es así salvo que pidan cuotas (mensuales, quincenales). No conviertas un plan 50/50 en cuotas si no lo piden.
- Canje: la parte de un proyecto que el cliente paga en especie (estadías, servicios) va en el plan con plan_definir (canje y canjeDescripcion). No es deuda en efectivo ni un pago: no lo registres como pago ni como cuota. Al cambiar un plan manda solo lo que cambia; plan_definir conserva lo demás (hitos 50/50, canje).
- Un proyecto con plan de pagos (50 % al firmar y 50 % a la entrega, cuotas…) y fases sin precio se cobra por el plan: lo que el plan cobra en dinero (total menos canje) y todavía no tiene factura ya cuenta en «por cobrar» y el cliente lo ve en su cuenta (planDePagosSinFactura). Las fases no necesitan precio; no propongas ponérselo ni facturar antes del pago.

Lo que no puedes hacer:
- No tienes forma de avisarle al equipo ni a quien mantiene Pime Suite, ni de reportar una falla del sistema. nota_crear guarda un recordatorio en Notas de la ficha del cliente, nada más: no la uses como reporte ni digas que «el equipo lo va a revisar». Si algo del sistema parece mal (un número que no cuadra, algo que no carga), dilo claro, di qué viste y que hay que pedir el arreglo a quien mantiene el sistema.
- No expliques dónde está o cómo se ve algo en pantalla si no lo sabes por una herramienta. No inventes causas: si no sabes por qué algo no carga, dilo.

Nunca digas «listo» ni que hiciste un cambio si ninguna herramienta lo hizo de verdad. Si una herramienta devolvió error, o la tarjeta no muestra el cambio pedido, dilo tal cual y di qué falta. Si te piden algo que ninguna herramienta puede hacer, dilo en vez de hacer otra cosa parecida.
Al terminar, cada acción ya aparece en pantalla como tarjeta (hecha, por confirmar o fallida) con su detalle. No la repitas: responde en una o dos líneas con lo que la tarjeta no dice. Por ejemplo, cuánto queda por cobrar, qué falta para confirmar o por qué algo no se pudo. Si todo salió bien y no hay nada que agregar, basta «Listo.».
En la respuesta escribe las fechas como «28 ago» y los montos como «USD 300.00». Omite las secciones vacías. Si solo era una pregunta, responde con los números. No inventes: si una herramienta no trae el dato, dilo. Para deshacer algo, usa ver_acciones y deshacer_accion.`;
}

export async function conversar(user: U & { supabaseUid: string }, historial: Mensaje[]): Promise<{ respuesta: string; acciones: Accion[] }> {
  // Proveedor del cerebro: OpenAI por defecto. Con ASISTENTE_IA=claude (y ANTHROPIC_API_KEY) usa Claude.
  if (process.env.ASISTENTE_IA === "claude" && process.env.ANTHROPIC_API_KEY) {
    const { conversarConClaude } = await import("./conversar-claude");
    return conversarConClaude(user, historial, sistema(user.fullName?.split(" ")[0] ?? null));
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pedido = [...historial].reverse().find((m) => m.rol === "usuario")?.texto ?? "";
  const mensajes: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: sistema(user.fullName?.split(" ")[0] ?? null) },
    ...historial.slice(-16).map((m) => ({ role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const), content: m.texto.slice(0, 4000) })),
  ];
  // Lo último que hizo o propuso, con sus ids: así «borra la fase 4» o «deshaz eso» encuentra de qué se habla.
  const recientes = await prisma.assistantAction.findMany({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3 * 3600_000) } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, kind: true, summary: true, status: true, resultId: true, payload: true } });
  if (recientes.length) {
    const ids = (p: unknown) => Object.fromEntries(Object.entries((p ?? {}) as Record<string, unknown>).filter(([k, v]) => /Id$/.test(k) && typeof v === "string"));
    mensajes.splice(1, 0, { role: "system", content: `Lo último que hiciste o propusiste (de lo más nuevo a lo más viejo):\n${recientes.map((a) => `- ${a.status} · ${a.kind} · ${a.summary} · accionId ${a.id}${a.resultId ? ` · resultado ${a.resultId}` : ""} · ${JSON.stringify(ids(a.payload))}`).join("\n")}` });
  }
  const acciones: Accion[] = [];
  const traza = process.env.ASISTENTE_TRAZA === "1";
  let modelo = MODELOS[0];
  let entrada = 0, salida = 0;
  const t0 = Date.now();
  const anotarUso = () => prisma.aiUsageLog.create({ data: { supabaseUid: user.supabaseUid, operation: "asistente", model: modelo, inputTokens: entrada, outputTokens: salida, durationMs: Date.now() - t0 } }).catch(() => {});

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
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
      await anotarUso();
      return { respuesta: m.content?.trim() || "Listo.", acciones };
    }
    // En orden: una herramienta puede depender de lo que hizo la anterior. Si una falla, las demás siguen.
    for (const call of m.tool_calls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* argumentos vacíos */ }
      let resultado: unknown;
      try { resultado = await ejecutarHerramienta(user, call.function.name, args, pedido, acciones); } catch (e) { resultado = { error: e instanceof Error ? e.message : "Falló la herramienta." }; }
      if (traza) console.log(`  · ${call.function.name}(${call.function.arguments}) → ${JSON.stringify(resultado).slice(0, 300)}`);
      mensajes.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(resultado ?? null).slice(0, 12000) });
    }
  }
  await anotarUso();
  return { respuesta: resumenDe(acciones) || "No pude terminar eso. ¿Me lo dices de otra forma?", acciones };
}

/** Respuesta de respaldo armada con lo que se hizo, por si el modelo no alcanzó a escribirla. */
export function resumenDe(acciones: Accion[]): string {
  const grupo = (t: string, xs: Accion[]) => (xs.length ? `${t}\n${xs.map((x) => `- ${x.summary}${x.error ? ` (${x.error})` : ""}`).join("\n")}` : "");
  return [grupo("Hecho:", acciones.filter((a) => a.estado === "hecha")), grupo("Por confirmar:", acciones.filter((a) => a.estado === "propuesta")), grupo("No se pudo:", acciones.filter((a) => a.estado === "error"))].filter(Boolean).join("\n\n");
}
