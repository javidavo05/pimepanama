/**
 * Enlace de la encuesta: `<id>.<firma>`, con la firma HMAC del id (igual que la marca de src/lib/auth/mfa.ts).
 * El token no se guarda: se vuelve a calcular para comprobarlo. Quien no tenga la clave no puede fabricar uno.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.PIME_ENCUESTA_SECRET || process.env.PIME_MFA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta PIME_ENCUESTA_SECRET (o PIME_MFA_SECRET / SUPABASE_SERVICE_ROLE_KEY) para firmar las encuestas");
  return s;
}

const firma = (id: string) => createHmac("sha256", secret()).update(`enc1:${id}`).digest("base64url");

export function tokenDeEncuesta(id: string): string {
  return `${id}.${firma(id)}`;
}

/** El id de la encuesta si el token es auténtico; null si no. */
export function idDeToken(token: string | null | undefined): string | null {
  if (!token || token.length > 200) return null;
  let t: string;
  try { t = decodeURIComponent(token); } catch { return null; }
  const i = t.lastIndexOf(".");
  if (i < 1) return null;
  const id = t.slice(0, i);
  if (!/^[a-z0-9]{8,40}$/i.test(id)) return null;
  const a = Buffer.from(t.slice(i + 1)), b = Buffer.from(firma(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/** Puntaje válido de la encuesta (0 a 10, entero) o null. */
export function puntajeValido(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : null;
}
