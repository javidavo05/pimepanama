/**
 * Firma del Pulso, igual que el control plane de God Mode:
 *   X-Pime-System:    key del sistema
 *   X-Pime-Timestamp: Unix en MILISEGUNDOS
 *   X-Pime-Signature: hex(HMAC-SHA256(secreto, `${timestamp}.${cuerpo}`))
 * El secreto de cada sistema no se guarda: se deriva de PIME_PULSO_SECRET, la key y su versión.
 * Rotar = subir secretVersion (la firma vieja deja de valer al instante).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const MARGEN_RELOJ_MS = 5 * 60 * 1000;

export function secretoDe(maestro: string, key: string, version: number): string {
  return createHmac("sha256", maestro).update(`pulso:${key}:v${version}`).digest("hex");
}

export function firmar(secreto: string, timestamp: string, cuerpo: string): string {
  return createHmac("sha256", secreto).update(`${timestamp}.${cuerpo}`, "utf8").digest("hex");
}

export type ResultadoFirma = "ok" | "firma" | "reloj";

export function verificarFirma(p: { secreto: string; timestamp: string | null; cuerpo: string; firma: string | null; ahora?: number }): ResultadoFirma {
  const ts = Number(p.timestamp);
  if (!p.timestamp || !Number.isFinite(ts) || ts < 1e12) return "reloj";
  if (Math.abs((p.ahora ?? Date.now()) - ts) > MARGEN_RELOJ_MS) return "reloj";
  const dada = (p.firma ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(dada)) return "firma";
  const esperada = Buffer.from(firmar(p.secreto, p.timestamp, p.cuerpo), "hex");
  return timingSafeEqual(esperada, Buffer.from(dada, "hex")) ? "ok" : "firma";
}
