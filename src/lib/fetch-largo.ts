"use client";

/**
 * fetch para las rutas que pueden tardar más de 120 s. En pimepanama.com la
 * petición va directo al dominio del proyecto con un permiso firmado (ver
 * lib/directo.ts): por el reenvío de pime-v2 Vercel la cortaría a los 120 s.
 * En local o en el dominio del proyecto es un fetch normal.
 */

let permiso: Promise<{ origin: string; token: string; expiresAt: number } | null> | null = null;

function reenviado(): boolean {
  return typeof window !== "undefined" && /(^|\.)pimepanama\.com$/.test(window.location.hostname);
}

async function pedirPermiso() {
  try {
    const res = await fetch("/api/empresa/directo", { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as { origin: string; token: string; expiresAt: number };
  } catch {
    return null;
  }
}

async function permisoVigente() {
  let p = permiso ? await permiso : null;
  // Se renueva con un minuto de margen para que no venza a mitad de la llamada.
  if (!p || p.expiresAt - Date.now() < 60_000) {
    permiso = pedirPermiso();
    p = await permiso;
    if (!p) permiso = null;
  }
  return p;
}

/**
 * Las rutas que el dominio del proyecto deja llamar desde pimepanama.com (CORS en next.config.ts,
 * RUTAS_LARGAS). Cualquier otra que se mande directo la bloquea el navegador y el fetch falla como si no
 * hubiera internet: así una grabación quedó «esperando conexión» con la red funcionando (2026-10-13).
 */
const DIRECTAS = [
  /^\/api\/empresa\/meetings\/[^/]+\/(process|audio|materialize|ask)$/,
  /^\/api\/empresa\/voice-notes(\/.*)?$/,
  /^\/api\/empresa\/ai\/(transcribe|analyze-contract)$/,
  /^\/api\/empresa\/projects\/[^/]+\/repo$/,
  /^\/api\/empresa\/mail\/backfill-sent$/,
  /^\/api\/empresa\/mail\/accounts\/[^/]+\/resync-bodies$/,
  /^\/api\/empresa\/asistente$/,
];

export const esRutaDirecta = (path: string) => DIRECTAS.some((r) => r.test(path.split("?")[0]));

export async function fetchLargo(path: string, init: RequestInit = {}): Promise<Response> {
  if (!reenviado() || !esRutaDirecta(path)) return fetch(path, init);
  const p = await permisoVigente();
  // Sin permiso se intenta por el camino normal: funciona si la llamada dura menos de 120 s.
  if (!p) return fetch(path, init);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${p.token}`);
  try {
    return await fetch(`${p.origin}${path}`, { ...init, headers, credentials: "omit", mode: "cors" });
  } catch (err) {
    // Si el camino directo falla (CORS, dominio caído) y hay internet, se intenta por el normal. Un cuerpo
    // de un solo uso (stream) no se puede reenviar: ahí el error sigue.
    if (typeof navigator !== "undefined" && !navigator.onLine) throw err;
    if (init.body instanceof ReadableStream) throw err;
    return fetch(path, init);
  }
}
