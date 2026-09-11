import {
  bumpAttempts,
  deleteMeeting,
  deleteSegment,
  getMeeting,
  listSegments,
  patchMeeting,
  type OfflineMeetingDraft,
  type OfflineSegment,
} from "./offline-store";
import { PROCESS_STAGES } from "./process-stages";
import type { MeetingSegment } from "./types";

/**
 * Subida de las grabaciones guardadas en el equipo.
 *
 * Distingue tres clases de fallo, porque cada una pide algo distinto:
 * - `NetworkError`: no hay conexión. No es un error del usuario ni del audio;
 *   la grabación queda pendiente y se reintenta sola.
 * - `AuthError`: la sesión se cerró. Hay que volver a entrar; el audio espera.
 * - `Error` a secas: el servidor rechazó algo (un tramo que no se pudo
 *   transcribir). Se reintenta un par de veces y después se reporta.
 */

export class NetworkError extends Error {
  constructor() {
    super("Sin conexión");
    this.name = "NetworkError";
  }
}

export class AuthError extends Error {
  constructor() {
    super("Tu sesión se cerró. Inicia sesión y la grabación se sube desde Reuniones.");
    this.name = "AuthError";
  }
}

/** El audio ya está en el servidor, pero el análisis falló: se retoma desde el detalle. */
export class ProcessingError extends Error {
  constructor(
    message: string,
    readonly serverId: string
  ) {
    super(message);
    this.name = "ProcessingError";
  }
}

/** Un fallo que no es culpa del audio: la grabación espera y se reintenta sola. */
export function isTransient(err: unknown): boolean {
  return err instanceof NetworkError || err instanceof AuthError;
}

async function send(input: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new NetworkError();
  }
  // Sin sesión, el middleware redirige al login y `fetch` sigue la redirección:
  // llega un 200 con el HTML del login en vez de un error.
  if (res.status === 401 || res.status === 403 || (res.redirected && res.url.includes("/login"))) {
    throw new AuthError();
  }
  return res;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data?.error === "string" ? data.error : fallback;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function createServerMeeting(draft: OfflineMeetingDraft): Promise<string> {
  const res = await send("/api/empresa/meetings", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      ...draft,
      projectId: draft.projectId || undefined,
      clientId: draft.clientId || undefined,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "No se pudo crear la reunión"));
  const meeting = await res.json();
  return meeting.id as string;
}

/**
 * Sube un tramo y devuelve lo que Whisper transcribió de él. El nombre de la voz
 * se pasa aparte y no se guarda con el tramo: si se renombra un canal a mitad de
 * la reunión, los tramos que esperaban en el equipo salen con el nombre nuevo.
 */
export async function uploadSegment(
  serverId: string,
  segment: Pick<OfflineSegment, "blob" | "channel" | "index" | "offsetMs"> & { speaker?: string }
): Promise<MeetingSegment[]> {
  const form = new FormData();
  form.append("audio", segment.blob, `${segment.channel.toLowerCase()}-${segment.index}.webm`);
  form.append("index", String(segment.index));
  form.append("offsetMs", String(segment.offsetMs));
  form.append("channel", segment.channel);
  if (segment.speaker) form.append("speaker", segment.speaker);

  const res = await send(`/api/empresa/meetings/${serverId}/audio`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await readError(res, "No se pudo transcribir un tramo"));
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.segments) ? (data.segments as MeetingSegment[]) : [];
}

/** Corre el análisis completo, etapa por etapa. */
export async function runProcessing(serverId: string, onStage?: (index: number) => void): Promise<void> {
  for (let i = 0; i < PROCESS_STAGES.length; i++) {
    onStage?.(i);
    let res: Response;
    try {
      res = await send(`/api/empresa/meetings/${serverId}/process`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ stage: PROCESS_STAGES[i].key }),
      });
    } catch (err) {
      const message =
        err instanceof NetworkError ? "Se cortó la conexión durante el análisis" : (err as Error).message;
      throw new ProcessingError(message, serverId);
    }
    if (!res.ok) throw new ProcessingError(await readError(res, "Error procesando"), serverId);
  }
}

// ─── Candados entre pestañas ─────────────────────────────────────────────────

/**
 * Una misma grabación no se puede subir desde dos pestañas a la vez: se
 * duplicarían los tramos. Mientras el grabador la tiene, nadie más la toca.
 */
function lockName(localId: string): string {
  return `pime-meeting-${localId}`;
}

function lockManager(): LockManager | null {
  return typeof navigator !== "undefined" && "locks" in navigator ? navigator.locks : null;
}

/**
 * Toma el candado y lo retiene hasta que se llame a la función devuelta.
 *
 * Soltar un candado es asíncrono: el navegador lo libera recién cuando termina
 * el pedido que lo tenía. Por eso soltar devuelve una promesa que resuelve cuando
 * el candado ya está libre de verdad. Sin esperarla, quien lo pidiera justo
 * después con `ifAvailable` lo encontraba ocupado y creía que otra pestaña estaba
 * subiendo la grabación.
 */
export async function holdMeetingLock(localId: string): Promise<() => Promise<void>> {
  const locks = lockManager();
  if (!locks) return async () => undefined;
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let request: Promise<unknown> = Promise.resolve();
  await new Promise<void>((acquired) => {
    request = locks.request(lockName(localId), () => {
      acquired();
      return held;
    });
  });
  return async () => {
    release();
    await request.catch(() => undefined);
  };
}

/** ¿La está usando otra pestaña (grabando o subiendo) ahora mismo? */
export async function isMeetingBusy(localId: string): Promise<boolean> {
  const locks = lockManager();
  if (!locks) return false;
  const state = await locks.query();
  return (state.held ?? []).some((lock) => lock.name === lockName(localId));
}

// ─── La subida completa ──────────────────────────────────────────────────────

/** Intentos antes de dar por perdido un tramo que el servidor no puede transcribir. */
const MAX_ATTEMPTS = 3;

export interface SyncProgress {
  step: "upload" | "process";
  uploaded: number;
  total: number;
  /** Etapa del análisis en curso; -1 mientras se sube */
  stageIndex: number;
}

export interface SyncResult {
  serverId: string;
  /** Tramos que el servidor rechazó tres veces y se descartaron */
  droppedSegments: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sube una grabación guardada en el equipo y la deja analizada.
 *
 * Orden: crear la reunión si todavía no existe, subir los tramos en orden,
 * reetiquetar las voces, fijar la duración, borrar la copia local y recién ahí
 * analizar. La copia local se borra antes del análisis a propósito: en ese punto
 * el audio ya está a salvo en el servidor, y un análisis que falla se retoma
 * desde el detalle de la reunión, no desde aquí.
 *
 * Devuelve null si otra pestaña la está usando.
 */
export async function syncOfflineMeeting(
  localId: string,
  options: { onProgress?: (p: SyncProgress) => void; process?: boolean } = {}
): Promise<SyncResult | null> {
  const { onProgress, process = true } = options;
  const locks = lockManager();

  const run = async (): Promise<SyncResult | null> => {
    const meeting = await getMeeting(localId);
    if (!meeting) return null;
    await patchMeeting(localId, { state: "syncing", lastError: undefined });

    try {
      let serverId = meeting.serverId;
      if (!serverId) {
        serverId = await createServerMeeting(meeting.draft);
        await patchMeeting(localId, { serverId });
      }

      const segments = await listSegments(localId);
      let uploaded = 0;
      let dropped = 0;
      onProgress?.({ step: "upload", uploaded, total: segments.length, stageIndex: -1 });

      for (const segment of segments) {
        for (;;) {
          try {
            await uploadSegment(serverId, {
              ...segment,
              speaker: meeting.lockSpeakers ? meeting.channelSpeakers[segment.channel] || undefined : undefined,
            });
            await deleteSegment(segment.id as number);
            break;
          } catch (err) {
            if (isTransient(err)) throw err;
            const attempts = await bumpAttempts(segment.id as number);
            if (attempts >= MAX_ATTEMPTS) {
              await deleteSegment(segment.id as number);
              dropped++;
              break;
            }
            await wait(1500 * attempts);
          }
        }
        uploaded++;
        onProgress?.({ step: "upload", uploaded, total: segments.length, stageIndex: -1 });
      }

      // Con voces separadas por canal, el nombre final de cada canal corrige
      // también lo que se transcribió antes de asignarlo.
      const named = Object.entries(meeting.channelSpeakers).filter(([, name]) => name);
      if (meeting.lockSpeakers && named.length > 0) {
        await send(`/api/empresa/meetings/${serverId}/speakers`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ channels: named.map(([channel, speaker]) => ({ channel, speaker })) }),
        });
      }

      if (meeting.durationMs > 0) {
        await send(`/api/empresa/meetings/${serverId}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ durationMs: meeting.durationMs }),
        });
      }

      await deleteMeeting(localId);

      if (process) {
        await runProcessing(serverId, (stageIndex) =>
          onProgress?.({ step: "process", uploaded, total: segments.length, stageIndex })
        );
      }
      return { serverId, droppedSegments: dropped };
    } catch (err) {
      // Si la copia local ya se borró, el fallo es del análisis y se ve en el detalle.
      if (await getMeeting(localId)) {
        await patchMeeting(localId, {
          state: isTransient(err) ? "pending" : "error",
          lastError: err instanceof NetworkError ? undefined : (err as Error).message,
        });
      }
      throw err;
    }
  };

  if (!locks) return run();
  return locks.request(lockName(localId), { ifAvailable: true }, (lock) => (lock ? run() : null));
}
