"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // En desarrollo el worker no guarda nada (ver DEV en sw-empresa.js).
    const script = process.env.NODE_ENV === "production" ? "/sw-empresa.js" : "/sw-empresa.js?dev=1";
    navigator.serviceWorker.register(script, { scope: "/empresa/" }).catch(() => {});
    // Con conexión se le pide al service worker que deje listo el grabador para
    // abrir sin internet. Él decide si hace falta: lo renueva cada pocas horas.
    if (!navigator.onLine) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: "WARM_OFFLINE" }))
      .catch(() => {});
  }, []);

  return null;
}
