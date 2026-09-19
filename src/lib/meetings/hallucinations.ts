/**
 * Frases que Whisper inventa cuando el tramo es silencio o ruido.
 *
 * Whisper se entrenó con videos subtitulados, y el final de esos videos suele ser
 * silencio con un crédito encima: «Subtítulos realizados por la comunidad de
 * Amara.org», «Gracias por ver el video», «Suscríbete». Así que cuando le llega un
 * tramo sin voz (una pausa, alguien en mute, el micrófono abierto en una sala
 * callada) no devuelve nada: devuelve eso. En una reunión grabada en tramos de
 * pocos segundos pasa todo el tiempo y ensucia la transcripción y la minuta.
 *
 * Se filtra por dos lados:
 * - **El texto**: los créditos conocidos, que nadie dice en una reunión.
 * - **La confianza**: la misma regla que usa Whisper internamente para decidir
 *   que un tramo es silencio (probabilidad de no-voz alta y texto poco probable).
 */

/** Marcas inequívocas: si aparecen en cualquier parte del segmento, es inventado. */
const MARKERS = [
  "amara.org",
  "amara org",
  "subtitulos realizados por",
  "subtitulos por la comunidad",
  "subtitulado por la comunidad",
  "subtitles by the amara",
  "subtitulos creados por",
];

/**
 * Frases genéricas que solo se descartan si son el segmento entero: «gracias por
 * ver» dentro de una frase real de la reunión se queda.
 */
const WHOLE_PHRASES = [
  "gracias por ver",
  "gracias por ver el video",
  "gracias por ver el video hasta el final",
  "muchas gracias por ver el video",
  "gracias por su atencion y hasta la proxima",
  "suscribete",
  "suscribete al canal",
  "no olvides suscribirte",
  "no olvides suscribirte al canal",
  "thanks for watching",
  "thank you for watching",
  "please subscribe",
  "like and subscribe",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Umbrales de Whisper para declarar un tramo como silencio. */
const NO_SPEECH_PROB = 0.6;
const LOW_LOGPROB = -1;

export interface WhisperSignals {
  no_speech_prob?: number;
  avg_logprob?: number;
}

/** `true` si el segmento es un invento de Whisper y no algo que se dijo. */
export function isHallucination(text: string, signals?: WhisperSignals): boolean {
  const norm = normalize(text);
  if (!norm) return true;
  if (MARKERS.some((m) => norm.includes(m))) return true;
  const bare = norm.replace(/\./g, "").trim();
  if (WHOLE_PHRASES.includes(bare)) return true;

  const noSpeech = Number(signals?.no_speech_prob);
  const logprob = Number(signals?.avg_logprob);
  if (Number.isFinite(noSpeech) && Number.isFinite(logprob)) {
    if (noSpeech > NO_SPEECH_PROB && logprob < LOW_LOGPROB) return true;
  }
  return false;
}

/** Quita los créditos inventados de un texto plano (sin segmentos ni señales). */
export function stripHallucinations(text: string): string {
  return text
    .split(/(?<=[.!?¡¿])\s+/)
    .filter((sentence) => !isHallucination(sentence))
    .join(" ")
    .trim();
}
