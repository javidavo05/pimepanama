/**
 * Imágenes y archivos de tickets. Se suben uno por uno (cada pedido queda bajo el límite de 4.5 MB
 * de Vercel; el navegador achica las fotos grandes antes) a R2 bajo portal/<clientId>/…, y el ticket
 * solo acepta llaves de esa carpeta: un cliente no puede adjuntar archivos de otro.
 */
import { randomUUID } from "node:crypto";

export const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "application/pdf"] as const;
export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_ADJUNTOS = 6;

export const carpetaCliente = (clientId: string) => `portal/${clientId}/`;
export function llaveNueva(clientId: string, nombre: string): string {
  const limpio = nombre.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(-80) || "archivo";
  return `${carpetaCliente(clientId)}${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${limpio}`;
}
export const llaveDelCliente = (clientId: string, key: string) => key.startsWith(carpetaCliente(clientId)) && !key.includes("..");

export type AdjuntoSubido = { key: string; fileName: string; contentType: string; sizeBytes: number };
export function adjuntosValidos(clientId: string, crudo: unknown): AdjuntoSubido[] {
  if (!Array.isArray(crudo)) return [];
  return crudo
    .filter((a): a is AdjuntoSubido => !!a && typeof a.key === "string" && typeof a.fileName === "string" && typeof a.contentType === "string" && Number.isFinite(a.sizeBytes))
    .filter((a) => llaveDelCliente(clientId, a.key) && (TIPOS_PERMITIDOS as readonly string[]).includes(a.contentType) && a.sizeBytes > 0 && a.sizeBytes <= MAX_BYTES)
    .slice(0, MAX_ADJUNTOS)
    .map((a) => ({ key: a.key, fileName: a.fileName.slice(0, 200), contentType: a.contentType, sizeBytes: Math.round(a.sizeBytes) }));
}
