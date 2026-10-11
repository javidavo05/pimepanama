/**
 * Doble verificación del equipo (decisión del 2026-10-11: obligatoria para el equipo Pime,
 * opcional para clientes).
 *
 * Una sesión del equipo cuenta como verificada si:
 *   - Supabase la subió a aal2 (código TOTP de una app como Google Authenticator), o
 *   - entró con huella o llave de acceso (WebAuthn con verificación del usuario). En ese caso
 *     el servidor deja una marca firmada atada a esa sesión, porque Supabase no sabe de passkeys.
 *
 * Interruptor de emergencia: PIME_STAFF_MFA=off desactiva la exigencia sin desplegar código.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const MFA_COOKIE = "pime_mf";
const MAX_AGE_S = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.PIME_MFA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta PIME_MFA_SECRET o SUPABASE_SERVICE_ROLE_KEY para firmar la doble verificación");
  return s;
}

function firma(uid: string, sessionId: string): string {
  return createHmac("sha256", secret()).update(`mf1:${uid}:${sessionId}`).digest("base64url");
}

/** Valor de la cookie que marca la sesión como verificada por huella o llave. */
export function marcaVerificada(uid: string, sessionId: string): string {
  return `${sessionId}.${firma(uid, sessionId)}`;
}

export function marcaValida(valor: string | undefined | null, uid: string, sessionId: string | undefined | null): boolean {
  if (!valor || !sessionId) return false;
  const i = valor.lastIndexOf(".");
  if (i < 1 || valor.slice(0, i) !== sessionId) return false;
  const a = Buffer.from(valor.slice(i + 1)), b = Buffer.from(firma(uid, sessionId));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const cookieMarca = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: MAX_AGE_S };

export function exigeMfaEquipo(): boolean {
  return (process.env.PIME_STAFF_MFA ?? "on").toLowerCase() !== "off";
}

type Claims = { sub?: string; aal?: string; session_id?: string } | null | undefined;

/** ¿Esta sesión del equipo ya pasó la doble verificación? */
export function sesionVerificada(claims: Claims, cookie: string | undefined | null): boolean {
  if (!exigeMfaEquipo()) return true;
  if (!claims?.sub) return false;
  if (claims.aal === "aal2") return true;
  return marcaValida(cookie, claims.sub, claims.session_id);
}
