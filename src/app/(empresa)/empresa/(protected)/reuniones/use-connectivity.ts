"use client";

import { useEffect, useState } from "react";

/**
 * Si hay internet de verdad.
 *
 * `navigator.onLine` solo sabe si hay red, no si hay salida: con un wifi sin
 * internet dice que sí. Por eso el estado también lo baja quien ve fallar un
 * pedido (`setOnline(false)`), y mientras se crea que no hay conexión se prueba
 * cada tanto con un pedido mínimo en vez de esperar un evento que puede no llegar.
 */
export function useConnectivity(probeEveryMs = 20_000) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    if (online) return;
    const timer = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        // El service worker no intercepta este archivo: la respuesta viene de la red.
        const res = await fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store" });
        if (res.ok) setOnline(true);
      } catch {
        // Sigue sin salida; se vuelve a probar en el próximo ciclo.
      }
    }, probeEveryMs);
    return () => clearInterval(timer);
  }, [online, probeEveryMs]);

  return [online, setOnline] as const;
}
