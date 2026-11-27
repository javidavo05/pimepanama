/**
 * ETag de los PDF que se arman al pedirlos. El PDF es función de sus datos, del código que lo arma (plantillas,
 * fuentes, logos: cambian con cada deploy) y del día (algunas plantillas imprimen la fecha de hoy). Si el navegador
 * ya tiene esa versión, la ruta responde 304 sin volver a renderizar. El PDF que sale es el mismo de siempre.
 */
import { createHash } from "crypto";

export const CACHE_PDF = "private, max-age=0, must-revalidate";

// En desarrollo las plantillas cambian sin reiniciar el proceso: ahí nunca se responde 304.
const VERSION =
  process.env.NODE_ENV === "development"
    ? null
    : (process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? `arranque-${Date.now()}`);

function dias(ahora = new Date()) {
  // El servidor formatea fechas en su zona (UTC en Vercel); se suma el día de Panamá por si alguna usa esa.
  return `${ahora.toISOString().slice(0, 10)}|${ahora.toLocaleDateString("en-CA", { timeZone: "America/Panama" })}`;
}

/** ETag fuerte de todo lo que entra al PDF. `null` en desarrollo. */
export function etagPdf(...entradas: unknown[]): string | null {
  if (!VERSION) return null;
  const json = JSON.stringify(entradas, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  const hash = createHash("sha256").update(VERSION).update("\n").update(dias()).update("\n").update(json).digest("base64url");
  return `"pdf-${hash.slice(0, 40)}"`;
}

/** El navegador ya tiene esta versión (If-None-Match). */
export function yaLoTiene(request: Request, etag: string | null): etag is string {
  if (!etag) return false;
  const pedido = request.headers.get("if-none-match");
  if (!pedido) return false;
  return pedido.split(",").some((t) => {
    const v = t.trim().replace(/^W\//, "");
    return v === "*" || v === etag;
  });
}

export function noModificado(etag: string): Response {
  return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE_PDF } });
}

/** Encabezados de caché para la respuesta 200. */
export function cabecerasCache(etag: string | null): Record<string, string> {
  return etag ? { ETag: etag, "Cache-Control": CACHE_PDF } : { "Cache-Control": CACHE_PDF };
}
