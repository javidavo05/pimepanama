import type OpenAI from "openai";

/**
 * El único modelo de texto de OpenAI en toda Pime Suite (2026-11-23): gpt-5-mini, el más barato que
 * razona y usa herramientas bien. Se puede cambiar sin tocar código con OPENAI_MODELO en Vercel.
 * La transcripción de voz no pasa por aquí: sigue en whisper-1.
 */
export const MODELO_OPENAI = process.env.OPENAI_MODELO?.trim() || "gpt-5-mini";

/** El razonamiento cuenta como salida: se suma a lo que pide cada llamada para que no se corte. */
export const MARGEN_RAZONAMIENTO = 4000;

type Pedido = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

/**
 * Adapta cualquier pedido al modelo único: fija el modelo, pasa `max_tokens` a `max_completion_tokens`
 * con margen para el razonamiento y quita los parámetros de muestreo que gpt-5-mini no acepta.
 */
export function alModeloOpenAI<P extends Pedido>(p: P): P {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { temperature, top_p, presence_penalty, frequency_penalty, max_tokens, logprobs, top_logprobs, ...resto } = p;
  const salida = p.max_completion_tokens ?? max_tokens;
  return {
    ...resto,
    model: MODELO_OPENAI,
    reasoning_effort: p.reasoning_effort ?? "low",
    ...(salida ? { max_completion_tokens: salida + MARGEN_RAZONAMIENTO } : {}),
  } as P;
}
