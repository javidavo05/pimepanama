"use client";
// Botón de demo: vuelve a disparar la animación de entrada de su contenedor.
import { useRef } from "react";
import { observeAll } from "./reveal";

export function Replay({ children, label = "Reproducir" }: { children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const replay = () => {
    const root = ref.current;
    if (!root) return;
    root.setAttribute("data-reset", "");
    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => el.removeAttribute("data-inview"));
    void root.offsetHeight;
    requestAnimationFrame(() => { root.removeAttribute("data-reset"); requestAnimationFrame(() => observeAll(root)); });
  };
  return (
    <div ref={ref} className="demo" data-motion="replay">
      <div className="demo-stage">{children}</div>
      <button type="button" className="btn secondary sm" onClick={replay}>{label}</button>
    </div>
  );
}
