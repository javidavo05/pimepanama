/**
 * Enlace «Darme de baja» de las campañas: el token es `base64url(userId:email).firma`, con la firma HMAC-SHA256
 * del mismo secreto que firma la doble verificación (src/lib/auth/mfa.ts). Así la página pública /baja sabe de
 * qué empresa y de qué correo es sin guardar nada antes, y nadie puede dar de baja a otro cambiando el enlace.
 * Solo servidor (usa node:crypto).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function secretoBaja(): string {
  const s = process.env.PIME_MFA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta PIME_MFA_SECRET o SUPABASE_SERVICE_ROLE_KEY para firmar los enlaces de baja");
  return s;
}

const normal = (email: string) => email.trim().toLowerCase();
const firma = (carga: string, secreto: string) => createHmac("sha256", secreto).update(`baja1:${carga}`).digest("base64url");

export function tokenBaja(userId: string, email: string, secreto: string = secretoBaja()): string {
  const carga = Buffer.from(`${userId}:${normal(email)}`).toString("base64url");
  return `${carga}.${firma(carga, secreto)}`;
}

/** Devuelve de quién es el token, o null si está alterado o mal formado. */
export function leerTokenBaja(token: string, secreto: string = secretoBaja()): { userId: string; email: string } | null {
  const i = token.indexOf(".");
  if (i < 1) return null;
  const carga = token.slice(0, i);
  const a = Buffer.from(token.slice(i + 1)), b = Buffer.from(firma(carga, secreto));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const texto = Buffer.from(carga, "base64url").toString("utf8");
  const j = texto.indexOf(":");
  if (j < 1) return null;
  const userId = texto.slice(0, j), email = texto.slice(j + 1);
  if (!email.includes("@")) return null;
  return { userId, email };
}
