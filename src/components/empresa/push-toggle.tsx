"use client";

import { useCallback, useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "unsupported"; reason: string }
  | { kind: "not-configured" }
  | { kind: "off" }
  | { kind: "on" }
  | { kind: "blocked" }
  | { kind: "error"; message: string };

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * `serviceWorker.ready` no resuelve nunca si el registro falló (modo incógnito,
 * service workers deshabilitados). Sin este tope, el panel se quedaba en
 * "Revisando…" para siempre en vez de decir qué pasa.
 */
function swReady(): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("El service worker no arrancó en este navegador.")), 5000)
    ),
  ]);
}

/**
 * Activa los avisos push en ESTE dispositivo. Es por dispositivo a propósito:
 * el permiso lo da el navegador, no la cuenta, así que el iPhone y la Mac se
 * suscriben por separado.
 */
export function PushToggle() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState({
        kind: "unsupported",
        reason: isIos()
          ? "En iPhone hay que instalar Pime Suite en la pantalla de inicio (Compartir → Añadir a inicio) para recibir avisos."
          : "Este navegador no soporta notificaciones push.",
      });
      return;
    }

    try {
      const registration = await swReady();
      const existing = await registration.pushManager.getSubscription();

      const res = await fetch(
        `/api/empresa/push/subscribe${existing ? `?endpoint=${encodeURIComponent(existing.endpoint)}` : ""}`
      );
      if (!res.ok) throw new Error("No se pudo leer el estado de los avisos.");
      const data = (await res.json()) as { publicKey: string | null; subscribed: boolean };

      if (!data.publicKey) {
        setState({ kind: "not-configured" });
        return;
      }
      if (Notification.permission === "denied") {
        setState({ kind: "blocked" });
        return;
      }
      setState({ kind: existing && data.subscribed ? "on" : "off" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Error inesperado." });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState({ kind: permission === "denied" ? "blocked" : "off" });
        return;
      }

      const keyRes = await fetch("/api/empresa/push/subscribe");
      const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
      if (!publicKey) {
        setState({ kind: "not-configured" });
        return;
      }

      const registration = await swReady();
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      const res = await fetch("/api/empresa/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error("No se pudo guardar la suscripción.");

      setState({ kind: "on" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "No se pudo activar." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await swReady();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/empresa/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState({ kind: "off" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "No se pudo desactivar." });
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "loading") {
    return <p className="px-4 py-3 text-white/40 text-[11px]">Revisando avisos de este dispositivo…</p>;
  }

  if (state.kind === "unsupported") {
    return <p className="px-4 py-3 text-white/50 text-[11px] leading-snug">{state.reason}</p>;
  }

  if (state.kind === "not-configured") {
    return (
      <p className="px-4 py-3 text-white/50 text-[11px] leading-snug">
        Falta configurar las llaves VAPID en el servidor para activar los avisos push.
      </p>
    );
  }

  if (state.kind === "blocked") {
    return (
      <p className="px-4 py-3 text-amber-300/80 text-[11px] leading-snug">
        Este navegador tiene los avisos bloqueados. Habilítalos en los ajustes del sitio y vuelve a intentar.
      </p>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white/70 text-[11px] font-medium">Avisos en este dispositivo</p>
          <p className="text-white/45 text-[10px] leading-snug">
            {state.kind === "on"
              ? "Recibes un aviso al llegar un lead nuevo, aunque el panel esté cerrado."
              : "Te avisamos aquí cuando entre un lead nuevo, aunque el panel esté cerrado."}
          </p>
        </div>
        <button
          type="button"
          onClick={state.kind === "on" ? disable : enable}
          disabled={busy}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            state.kind === "on"
              ? "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white/80"
              : "bg-[#1AA7F0] text-white hover:bg-[#0E87C8]"
          }`}
        >
          {busy ? "…" : state.kind === "on" ? "Desactivar" : "Activar avisos"}
        </button>
      </div>

      {state.kind === "error" && (
        <p className="text-red-300/80 text-[10px] leading-snug">{state.message}</p>
      )}
    </div>
  );
}
