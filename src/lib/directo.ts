import { createHmac, timingSafeEqual } from "crypto";

/**
 * Acceso directo para llamadas largas.
 *
 * pimepanama.com lo sirve pime-v2 y reenvía /empresa y /api a este proyecto, pero
 * Vercel corta todo reenvío a los 120 s. Las rutas que pueden tardar más (procesar
 * una reunión, transcribir audio) se llaman directo al dominio del proyecto con
 * este permiso firmado de 10 minutos, porque las cookies de sesión son de
 * pimepanama.com y no viajan a otro dominio.
 */

export const ORIGEN_PROYECTO = "https://pimepanama-wt62.vercel.app";

/** Desde dónde se pueden hacer estas llamadas (CORS). */
export const ORIGENES_PERMITIDOS = ["https://pimepanama.com", "https://www.pimepanama.com"];

const TTL_MS = 10 * 60 * 1000;
const PREFIJO = "directo.";

function secret(): string {
  const s = process.env.PASSKEY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta PASSKEY_SECRET o SUPABASE_SERVICE_ROLE_KEY");
  return s;
}

function firmar(data: string): string {
  return createHmac("sha256", secret()).update(`directo:${data}`).digest("base64url");
}

/** Se emite solo a una sesión que ya pasó login y doble verificación. */
export function emitirPermisoDirecto(supabaseUid: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TTL_MS;
  const data = `${supabaseUid}.${expiresAt}`;
  return { token: `${PREFIJO}${data}.${firmar(data)}`, expiresAt };
}

/** Devuelve el supabaseUid del permiso, o null si no es válido o venció. */
export function leerPermisoDirecto(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith(`Bearer ${PREFIJO}`)) return null;
  const parts = auth.slice(`Bearer ${PREFIJO}`.length).split(".");
  if (parts.length !== 3) return null;
  const [uid, exp, mac] = parts;
  if (!uid || Number(exp) < Date.now()) return null;
  const esperado = Buffer.from(firmar(`${uid}.${exp}`));
  const recibido = Buffer.from(mac);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido) ? uid : null;
}
