"use client";

import { useEffect } from "react";

/**
 * El alcance es "/empresa" sin barra final, igual que en el manifest: con
 * "/empresa/" el dashboard (/empresa) quedaba fuera y la app instalada lo abría
 * con la barra del navegador arriba.
 */
const SCOPE = "/empresa";
const OLD_SCOPE = "/empresa/";

function activeWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve();
  const worker = registration.installing ?? registration.waiting;
  return new Promise((resolve) => {
    worker?.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve();
    });
  });
}

/**
 * El registro viejo ("/empresa/") queda vivo al lado del nuevo y es el que
 * atiende las subpáginas, porque gana el alcance más largo. Antes de darlo de
 * baja se pasa su suscripción de avisos al registro nuevo: sin esto, cada
 * equipo dejaba de recibir notificaciones hasta volver a activarlas a mano.
 */
async function retireOldRegistration(current: ServiceWorkerRegistration) {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const old = registrations.find((r) => new URL(r.scope).pathname === OLD_SCOPE);
  if (!old) return;

  const oldSubscription = await old.pushManager.getSubscription().catch(() => null);
  const key = oldSubscription?.options.applicationServerKey;
  if (oldSubscription && key && "Notification" in window && Notification.permission === "granted") {
    try {
      await activeWorker(current);
      const subscription = await current.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const res = await fetch("/api/empresa/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      // Sin la suscripción nueva guardada, el registro viejo se queda: es el
      // único que todavía recibe avisos. Se reintenta en la próxima carga.
      if (!res.ok) return;
    } catch {
      return;
    }
  }
  await old.unregister();
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // En desarrollo el worker no guarda nada (ver DEV en sw-empresa.js).
    const script = process.env.NODE_ENV === "production" ? "/sw-empresa.js" : "/sw-empresa.js?dev=1";
    navigator.serviceWorker
      .register(script, { scope: SCOPE })
      .then(retireOldRegistration)
      .catch(() => {});
    // Con conexión se le pide al service worker que deje listo el grabador para
    // abrir sin internet. Él decide si hace falta: lo renueva cada pocas horas.
    if (!navigator.onLine) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: "WARM_OFFLINE" }))
      .catch(() => {});
  }, []);

  return null;
}
