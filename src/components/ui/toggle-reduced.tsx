"use client";
// Simula prefers-reduced-motion para revisar los fundidos cortos sin cambiar el sistema.
import { useEffect, useState } from "react";

export function ToggleReduced() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-reduced-motion", on);
  }, [on]);
  return (
    <button type="button" className="choice" aria-pressed={on} data-motion="press" onClick={() => setOn((v) => !v)}>
      {on ? "Movimiento reducido: activo" : "Simular movimiento reducido"}
    </button>
  );
}
