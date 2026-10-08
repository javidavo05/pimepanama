"use client";
// Parallax de planos: pone --px/--py (−1…1) según el cursor. Solo con puntero fino; en toque no hace nada.
import { useEffect, useRef } from "react";

export function Parallax({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!matchMedia("(pointer: fine)").matches) return;
    let raf = 0, px = 0, py = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.setProperty("--px", px.toFixed(3)); el.style.setProperty("--py", py.toFixed(3)); });
    };
    const leave = () => { el.style.setProperty("--px", "0"); el.style.setProperty("--py", "0"); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className={className} data-motion="parallax">{children}</div>;
}
