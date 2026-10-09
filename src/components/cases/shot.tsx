"use client";
// Miniatura fiel: el tablero se construye a 1280×800 y se escala al ancho de la tarjeta (solo transform).
import { useEffect, useRef, useState } from "react";

export function Shot({ children, base = 1280, baseH = 800, label }: { children: React.ReactNode; base?: number; baseH?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.34);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setS(e.contentRect.width / base));
    ro.observe(el);
    return () => ro.disconnect();
  }, [base]);
  return (
    <div ref={ref} className="shot" style={{ height: Math.round(baseH * s) }} role="img" aria-label={label} data-motion="shot">
      <div className="shot-in" style={{ width: base, height: baseH, transform: `scale(${s})` }} aria-hidden="true" inert>
        {children}
      </div>
    </div>
  );
}
