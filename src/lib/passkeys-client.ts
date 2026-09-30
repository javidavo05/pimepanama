"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";

/**
 * Llaves de acceso desde el navegador. Cada función devuelve `{ error }` con un
 * texto listo para mostrar, o `{ error: null }` si el usuario canceló el
 * diálogo del sistema (no es un error que haya que anunciar).
 */

export type PasskeyResult<T = object> = ({ ok: true } & T) | { ok: false; error: string | null };

export interface PasskeySummary {
  id: string;
  name: string;
  vaultAccess: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

/** Nombre del lector biométrico de este dispositivo, para el copy de los botones. */
export function biometricLabel(): string {
  if (typeof navigator === "undefined") return "huella";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "Face ID";
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "Face ID";
  if (/Macintosh/.test(ua)) return "Touch ID";
  return "huella";
}

function isCancel(err: unknown): boolean {
  if (err instanceof WebAuthnError && err.code === "ERROR_CEREMONY_ABORTED") return true;
  const name = (err as { name?: string } | null)?.name;
  return name === "NotAllowedError" || name === "AbortError";
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

let listCache: Promise<PasskeySummary[] | null> | null = null;

/** Llaves del usuario; se comparte entre componentes hasta que cambie algo. */
export function listPasskeys(force = false): Promise<PasskeySummary[] | null> {
  if (!listCache || force) {
    listCache = fetch("/api/empresa/passkeys")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? (d.passkeys as PasskeySummary[]) : null))
      .catch(() => null);
  }
  return listCache;
}

function invalidateList() {
  listCache = null;
}

async function authenticate(purpose: "login" | "vault") {
  const options = await postJson<Record<string, unknown>>("/api/empresa/passkeys/auth/options", { purpose });
  if (!options.ok) throw new Error(options.data.error ?? "No se pudo preparar la huella.");
  return startAuthentication({ optionsJSON: options.data as never });
}

/** Entrar a la suite con la huella. La sesión queda en cookies. */
export async function loginWithPasskey(): Promise<PasskeyResult> {
  try {
    const response = await authenticate("login");
    const { ok, data } = await postJson("/api/empresa/passkeys/login/verify", { response });
    if (!ok) return { ok: false, error: data.error ?? "No se pudo entrar." };
    return { ok: true };
  } catch (err) {
    if (isCancel(err)) return { ok: false, error: null };
    return { ok: false, error: "No se pudo usar la huella en este dispositivo." };
  }
}

/** Abrir la bóveda con la huella; devuelve el permiso de 15 minutos. */
export async function unlockVaultWithPasskey(): Promise<PasskeyResult<{ vaultToken: string }>> {
  try {
    const response = await authenticate("vault");
    const { ok, data } = await postJson<{ vaultToken: string }>("/api/empresa/passkeys/vault/verify", { response });
    if (!ok) return { ok: false, error: data.error ?? "No se pudo verificar la huella." };
    return { ok: true, vaultToken: data.vaultToken };
  } catch (err) {
    if (isCancel(err)) return { ok: false, error: null };
    return { ok: false, error: "No se pudo usar la huella en este dispositivo." };
  }
}

/**
 * Registra la huella de este dispositivo. Con `vaultToken` (bóveda recién
 * abierta con la contraseña madre) la llave también abre la bóveda; si este
 * dispositivo ya tenía una llave solo para entrar, se vincula a la bóveda.
 */
export async function registerPasskey(vaultToken?: string): Promise<PasskeyResult> {
  try {
    const options = await postJson<Record<string, unknown>>("/api/empresa/passkeys/register/options", {});
    if (!options.ok) return { ok: false, error: options.data.error ?? "No se pudo preparar la huella." };

    let response;
    try {
      response = await startRegistration({ optionsJSON: options.data as never });
    } catch (err) {
      if (err instanceof WebAuthnError && err.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
        if (!vaultToken) return { ok: false, error: "Este dispositivo ya está activado." };
        const assertion = await authenticate("vault");
        const linked = await postJson("/api/empresa/passkeys/vault/verify", {
          response: assertion,
          enableWith: vaultToken,
        });
        invalidateList();
        return linked.ok ? { ok: true } : { ok: false, error: linked.data.error ?? "No se pudo activar." };
      }
      throw err;
    }

    const { ok, data } = await postJson("/api/empresa/passkeys/register/verify", { response, vaultToken });
    invalidateList();
    if (!ok) return { ok: false, error: data.error ?? "No se pudo activar la huella." };
    return { ok: true };
  } catch (err) {
    if (isCancel(err)) return { ok: false, error: null };
    return { ok: false, error: "No se pudo usar la huella en este dispositivo." };
  }
}

export async function removePasskey(id: string): Promise<boolean> {
  const res = await fetch(`/api/empresa/passkeys/${id}`, { method: "DELETE" });
  invalidateList();
  return res.ok;
}
