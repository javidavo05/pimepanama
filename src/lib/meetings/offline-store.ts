import type { MeetingAttendee, MeetingChannel } from "./types";

/**
 * Almacén local de grabaciones, en IndexedDB.
 *
 * Cada tramo de audio se escribe aquí ANTES de intentar subirlo, y solo se borra
 * cuando el servidor confirmó que lo tiene. Si la red se cae —o nunca hubo—, el
 * audio queda en el equipo y se sube cuando vuelve. Una reunión grabada sin
 * internet tampoco depende de que la pestaña siga abierta: se retoma desde
 * Reuniones.
 *
 * Solo corre en el navegador. Las escrituras resuelven cuando la transacción se
 * confirmó en disco, no cuando se encoló: es audio que no se puede volver a grabar.
 */

const DB_NAME = "pime-meetings-offline";
const DB_VERSION = 1;
const MEETINGS = "meetings";
const SEGMENTS = "segments";

/** Lo necesario para crear la reunión en el servidor cuando haya conexión. */
export interface OfflineMeetingDraft {
  title: string;
  projectId?: string;
  clientId?: string;
  language: "es" | "en";
  spokenLanguages: string[];
  meetingDate: string;
  audioSource: string;
  attendees: MeetingAttendee[];
}

/**
 * - `recording`: la grabación sigue (o se cortó sin que se detuviera: pestaña
 *   cerrada, equipo apagado). Ver `isInterrupted`.
 * - `pending`: terminó y espera conexión para subirse.
 * - `syncing`: se está subiendo ahora mismo.
 * - `error`: la subida falló por algo que no es la red; ver `lastError`.
 */
export type OfflineMeetingState = "recording" | "pending" | "syncing" | "error";

export interface OfflineMeeting {
  localId: string;
  /** Id de la reunión en el servidor; null hasta que se pudo crear */
  serverId: string | null;
  draft: OfflineMeetingDraft;
  createdAt: number;
  /** Último tramo guardado. Una grabación que no avanza hace rato quedó interrumpida */
  updatedAt: number;
  durationMs: number;
  /** Nombre asignado a cada canal de audio, para reetiquetar al subir */
  channelSpeakers: Partial<Record<MeetingChannel, string>>;
  lockSpeakers: boolean;
  state: OfflineMeetingState;
  lastError?: string;
}

export interface OfflineSegment {
  id?: number;
  localId: string;
  channel: MeetingChannel;
  index: number;
  offsetMs: number;
  blob: Blob;
  /** Intentos de subida que el servidor rechazó (los fallos de red no cuentan) */
  attempts: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function isOfflineStoreAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEETINGS)) {
        db.createObjectStore(MEETINGS, { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains(SEGMENTS)) {
        const segments = db.createObjectStore(SEGMENTS, { keyPath: "id", autoIncrement: true });
        segments.createIndex("byMeeting", "localId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

/**
 * Corre `work` dentro de una transacción y resuelve cuando esta se confirma. La
 * transacción y sus pedidos se crean en el mismo tramo síncrono: si se abriera
 * con un `await` de por medio, algunos navegadores ya la dan por terminada.
 */
async function transact<T>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction, done: (value: T) => void) => void
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: T;
    work(tx, (value) => {
      result = value;
    });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transacción abortada"));
  });
}

export function saveMeeting(meeting: OfflineMeeting): Promise<void> {
  return transact<void>([MEETINGS], "readwrite", (tx) => {
    tx.objectStore(MEETINGS).put(meeting);
  });
}

export function getMeeting(localId: string): Promise<OfflineMeeting | undefined> {
  return transact<OfflineMeeting | undefined>([MEETINGS], "readonly", (tx, done) => {
    const req = tx.objectStore(MEETINGS).get(localId);
    req.onsuccess = () => done(req.result as OfflineMeeting | undefined);
  });
}

/** Lee y reescribe en una sola transacción: dos pestañas no se pisan el cambio. */
export function patchMeeting(
  localId: string,
  patch: Partial<Omit<OfflineMeeting, "localId">>
): Promise<OfflineMeeting | undefined> {
  return transact<OfflineMeeting | undefined>([MEETINGS], "readwrite", (tx, done) => {
    const store = tx.objectStore(MEETINGS);
    const req = store.get(localId);
    req.onsuccess = () => {
      const current = req.result as OfflineMeeting | undefined;
      if (!current) {
        done(undefined);
        return;
      }
      const next = { ...current, ...patch };
      store.put(next);
      done(next);
    };
  });
}

export function listMeetings(): Promise<OfflineMeeting[]> {
  return transact<OfflineMeeting[]>([MEETINGS], "readonly", (tx, done) => {
    const req = tx.objectStore(MEETINGS).getAll();
    req.onsuccess = () =>
      done((req.result as OfflineMeeting[]).sort((a, b) => a.createdAt - b.createdAt));
  });
}

/** Borra la reunión y todo su audio local, en la misma transacción. */
export function deleteMeeting(localId: string): Promise<void> {
  return transact<void>([MEETINGS, SEGMENTS], "readwrite", (tx) => {
    tx.objectStore(MEETINGS).delete(localId);
    const req = tx.objectStore(SEGMENTS).index("byMeeting").openKeyCursor(IDBKeyRange.only(localId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      tx.objectStore(SEGMENTS).delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}

export function addSegment(segment: Omit<OfflineSegment, "id">): Promise<number> {
  return transact<number>([SEGMENTS], "readwrite", (tx, done) => {
    const req = tx.objectStore(SEGMENTS).add(segment);
    req.onsuccess = () => done(req.result as number);
  });
}

/** Tramos guardados de una reunión, en orden cronológico. */
export function listSegments(localId: string): Promise<OfflineSegment[]> {
  return transact<OfflineSegment[]>([SEGMENTS], "readonly", (tx, done) => {
    const req = tx.objectStore(SEGMENTS).index("byMeeting").getAll(IDBKeyRange.only(localId));
    req.onsuccess = () =>
      done(
        (req.result as OfflineSegment[]).sort(
          (a, b) => a.offsetMs - b.offsetMs || a.channel.localeCompare(b.channel)
        )
      );
  });
}

export function countSegments(localId: string): Promise<number> {
  return transact<number>([SEGMENTS], "readonly", (tx, done) => {
    const req = tx.objectStore(SEGMENTS).index("byMeeting").count(IDBKeyRange.only(localId));
    req.onsuccess = () => done(req.result);
  });
}

export function deleteSegment(id: number): Promise<void> {
  return transact<void>([SEGMENTS], "readwrite", (tx) => {
    tx.objectStore(SEGMENTS).delete(id);
  });
}

/** Suma un intento rechazado y devuelve cuántos lleva. */
export function bumpAttempts(id: number): Promise<number> {
  return transact<number>([SEGMENTS], "readwrite", (tx, done) => {
    const store = tx.objectStore(SEGMENTS);
    const req = store.get(id);
    req.onsuccess = () => {
      const current = req.result as OfflineSegment | undefined;
      if (!current) {
        done(0);
        return;
      }
      const attempts = (current.attempts ?? 0) + 1;
      store.put({ ...current, attempts });
      done(attempts);
    };
  });
}

/**
 * Pide que el navegador no desaloje este almacén cuando se quede sin espacio.
 * Sin este permiso, una grabación sin subir podría borrarse sola. No es
 * bloqueante: si el navegador lo niega, se sigue grabando igual.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Una grabación en estado `recording` que no guarda un tramo hace rato ya no está
 * grabando: se cerró la pestaña o se apagó el equipo. Lo que alcanzó a guardar se
 * puede subir igual.
 */
export function isInterrupted(meeting: OfflineMeeting, now = Date.now()): boolean {
  return meeting.state === "recording" && now - meeting.updatedAt > 90_000;
}
