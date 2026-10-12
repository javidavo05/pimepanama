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

export async function fetchLargo(path: string, init: RequestInit = {}): Promise<Response> {
  if (!reenviado()) return fetch(path, init);
  const p = await permisoVigente();
  // Sin permiso se intenta por el camino normal: funciona si la llamada dura menos de 120 s.
  if (!p) return fetch(path, init);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${p.token}`);
  return fetch(`${p.origin}${path}`, { ...init, headers, credentials: "omit", mode: "cors" });
}
