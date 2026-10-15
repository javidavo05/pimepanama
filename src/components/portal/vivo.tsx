"use client";

/**
 * Isla única de movimiento de la cuenta del cliente (sin dependencias, solo atributos y variables CSS):
 * - Lo que queda debajo del pliegue espera oculto ([data-espera]) y entra cuando aparece en pantalla.
 *   Lo visible al cargar nunca se oculta: entra con la animación CSS del primer pintado.
 * - Luz que sigue al cursor en tarjetas y bloques oscuros (--mx, --my, --spot).
 * - Imán en los botones principales (solo mouse, nunca en el dedo).
 * Todo se apaga con prefers-reduced-motion.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const quieto = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PortalVivo() {
  const ruta = usePathname();

  useEffect(() => {
    if (quieto()) return;
    const io = new IntersectionObserver((entradas) => {
      let k = 0;
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.style.setProperty("--i", String(k++));
        el.removeAttribute("data-espera");
        io.unobserve(el);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    const armar = () => {
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>(".p-in:not([data-armado])").forEach((el) => {
        el.setAttribute("data-armado", "");
        if (el.getBoundingClientRect().top > vh * 0.95) { el.setAttribute("data-espera", ""); io.observe(el); }
      });
    };
    armar();
    const mo = new MutationObserver(armar);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io.disconnect(); };
  }, [ruta]);

  useEffect(() => {
    if (quieto()) return;
    let imanActual: HTMLElement | null = null;
    const soltar = () => { if (imanActual) { imanActual.style.transform = ""; imanActual = null; } };
    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = e.target as Element | null;
      const luz = t?.closest<HTMLElement>(".p-card, .p-ink");
      if (luz) {
        const r = luz.getBoundingClientRect();
        luz.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        luz.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
        luz.style.setProperty("--spot", "1");
      }
      const iman = t?.closest<HTMLElement>(".p-btn-1, .a-btn-1");
      if (iman !== imanActual) soltar();
      if (iman && !iman.hasAttribute("disabled")) {
        const r = iman.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.18;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
        iman.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        imanActual = iman;
      }
    };
    const salir = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const luz = t?.closest<HTMLElement>(".p-card");
      const hacia = e.relatedTarget as Element | null;
      if (luz && !luz.contains(hacia)) luz.style.setProperty("--spot", "0");
      if (imanActual && !imanActual.contains(hacia)) soltar();
    };
    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerout", salir, { passive: true });
    return () => { document.removeEventListener("pointermove", mover); document.removeEventListener("pointerout", salir); soltar(); };
  }, []);

  return null;
}
