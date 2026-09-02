import type { MeetingSegment } from "./types";

/**
 * Descarta el eco entre canales.
 *
 * Grabando con dos fuentes y **sin audífonos**, la voz del cliente sale por los
 * altavoces y tu micrófono la capta: la misma frase entra por el canal remoto
 * (limpia) y por el local (como fuga). Sin filtrar, la minuta la registra dos
 * veces y encima le atribuye a ti lo que dijo el cliente.
 *
 * El canal remoto es la copia buena: ahí solo suena lo que reproduce la
 * computadora. Así que se marca como eco el segmento local cuyas palabras ya
 * aparecen en un segmento remoto de ese mismo momento.
 *
 * Es deliberadamente conservador. Perder una frase real de la reunión es mucho
 * peor que dejar pasar una repetida, así que ante la duda no se marca nada: hace
 * falta solapamiento en el tiempo y que casi todas las palabras coincidan.
 */

/** Desfase entre lo que suena por el altavoz y lo que el micrófono capta y transcribe. */
const WINDOW_MS = 2_500;
/** Por debajo de esto ("sí", "ajá", "ok") no hay evidencia suficiente: puede ser tuyo. */
const MIN_WORDS = 3;
/** Fracción de palabras del segmento local que deben estar en el remoto. */
const MIN_COVERAGE = 0.6;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Marca, por índice, qué segmentos son eco de otro canal. Devuelve un arreglo
 * paralelo al de entrada para no tener que reordenar ni copiar nada.
 */
export function findEchoes(segments: MeetingSegment[]): boolean[] {
  const echoes = new Array<boolean>(segments.length).fill(false);

  const remote = segments.filter((s) => s.channel === "REMOTE");
  // Un solo canal —micrófono ambiente, nota de voz, archivo importado— no puede
  // tener eco cruzado: no hay con qué comparar.
  if (remote.length === 0) return echoes;

  const remoteWords = new Map<MeetingSegment, Set<string>>();
  for (const seg of remote) remoteWords.set(seg, new Set(words(seg.text)));

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.channel !== "LOCAL") continue;

    const local = words(seg.text);
    if (local.length < MIN_WORDS) continue;

    // Todo lo que sonó por el altavoz alrededor de este momento.
    const nearby = new Set<string>();
    for (const other of remote) {
      if (other.end < seg.start - WINDOW_MS || other.start > seg.end + WINDOW_MS) continue;
      for (const w of remoteWords.get(other) ?? []) nearby.add(w);
    }
    if (nearby.size === 0) continue;

    const matched = local.filter((w) => nearby.has(w)).length;
    if (matched / local.length >= MIN_COVERAGE) echoes[i] = true;
  }

  return echoes;
}

/** La transcripción sin el eco: es lo que se analiza y lo que ve el cliente. */
export function withoutEchoes(segments: MeetingSegment[]): MeetingSegment[] {
  const echoes = findEchoes(segments);
  return segments.filter((_, i) => !echoes[i]);
}
