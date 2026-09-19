/**
 * Reparto del tope de tokens por minuto (TPM) de la cuenta de OpenAI.
 *
 * La cuenta está en el nivel más bajo: 30k tokens por minuto por modelo. Una
 * reunión larga necesita bastante más que eso por etapa, y además `gpt-4o` lo
 * comparten los correos, los leads y las propuestas. Lanzar las llamadas en
 * paralelo y esperar al 429 hacía que OpenAI rechazara pedidos a mitad de la
 * etapa hasta que se rendía.
 *
 * Así que las llamadas de reuniones se administran de nuestro lado:
 * - **Dos carriles.** El tope es por modelo, y `gpt-4.1` tiene el suyo propio,
 *   así que las reuniones usan `gpt-4.1` primero y desbordan a `gpt-4o`. Es el
 *   doble de capacidad sin bajar de calidad (4.1 es igual o mejor y más barato).
 * - **Presupuesto por ventana.** Antes de cada llamada se estima lo que va a
 *   consumir (OpenAI cuenta la entrada más el `max_tokens` pedido) y se espera
 *   hasta que quepa en el último minuto, en vez de mandarla y comerse el 429.
 * - **Tope aprendido.** El límite real se lee de las cabeceras de cada
 *   respuesta: si la cuenta sube de nivel, el reparto se ajusta solo.
 *
 * El estado vive en memoria de la instancia. Con Fluid Compute las etapas que
 * corren a la vez suelen compartir instancia; si no, el 429 residual lo absorben
 * los reintentos del SDK.
 */

export const LANES = ["gpt-4.1", "gpt-4o"] as const;
export type Lane = (typeof LANES)[number];

const WINDOW_MS = 60_000;
/** Tope de la cuenta hasta que la primera respuesta diga el real. */
const DEFAULT_LIMIT = 30_000;
/** Margen para lo que gastan otras partes del sistema con el mismo modelo. */
const HEADROOM = 0.85;
/** Salida mínima que se le deja a una llamada al recortarle el `max_tokens`. */
const MIN_OUTPUT = 1_500;

interface Reservation {
  at: number;
  tokens: number;
}

interface LaneState {
  limit: number;
  used: Reservation[];
  /** El modelo no está habilitado para la cuenta: no se vuelve a intentar. */
  disabled: boolean;
}

const lanes = new Map<Lane, LaneState>(
  LANES.map((m) => [m, { limit: DEFAULT_LIMIT, used: [], disabled: false }])
);

function budget(state: LaneState): number {
  return Math.floor(state.limit * HEADROOM);
}

function inWindow(state: LaneState, now: number): number {
  state.used = state.used.filter((r) => now - r.at < WINDOW_MS);
  return state.used.reduce((n, r) => n + r.tokens, 0);
}

/**
 * Tokens de entrada aproximados. Español y JSON rondan 3–3,5 caracteres por
 * token; se redondea hacia arriba para no quedarse corto.
 */
export function estimateInputTokens(...texts: string[]): number {
  return Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 3) + 50;
}

export interface Slot {
  model: Lane;
  /** `max_tokens` a pedir: el solicitado, o menos si no cabía en el tope. */
  maxTokens: number;
  reservation: Reservation;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Espera hasta que algún carril tenga lugar para la llamada y lo reserva.
 * Prefiere el primer carril; si ninguno tiene lugar, duerme lo justo hasta que
 * venza la reserva más vieja.
 */
export async function acquireSlot(inputTokens: number, maxTokens: number): Promise<Slot> {
  for (;;) {
    const now = Date.now();
    let soonest = Infinity;

    for (const model of LANES) {
      const state = lanes.get(model)!;
      if (state.disabled) continue;

      const cap = budget(state);
      // Una llamada que sola no cabe en el tope nunca pasaría: se le recorta la
      // salida pedida, que casi nunca se usa entera.
      const output = Math.max(MIN_OUTPUT, Math.min(maxTokens, cap - inputTokens));
      const need = inputTokens + output;
      const used = inWindow(state, now);

      if (used === 0 || used + need <= cap) {
        const reservation = { at: now, tokens: need };
        state.used.push(reservation);
        return { model, maxTokens: output, reservation };
      }
      if (state.used.length > 0) soonest = Math.min(soonest, state.used[0].at + WINDOW_MS - now);
    }

    if (!Number.isFinite(soonest)) {
      throw new Error("Ningún modelo de OpenAI está disponible para esta cuenta.");
    }
    await sleep(Math.max(250, soonest + 100));
  }
}

/** Ajusta la reserva al consumo real y aprende el tope de la cuenta. */
export function settleSlot(slot: Slot, actualTokens: number | undefined, headers?: Headers): void {
  if (actualTokens && actualTokens > 0) slot.reservation.tokens = actualTokens;

  const limit = Number(headers?.get("x-ratelimit-limit-tokens"));
  if (Number.isFinite(limit) && limit > 0) lanes.get(slot.model)!.limit = limit;
}

/** Libera la reserva de una llamada que no llegó a consumir (falló antes). */
export function releaseSlot(slot: Slot): void {
  slot.reservation.tokens = 0;
}

/** El modelo no existe para la cuenta: se saca del reparto. */
export function disableLane(model: Lane): void {
  lanes.get(model)!.disabled = true;
}
