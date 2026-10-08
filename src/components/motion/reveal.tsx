"use client";
// Un solo IntersectionObserver compartido para todos los [data-reveal].
// Reglas: sin JS nada se oculta; lo que ya está en pantalla al hidratar nunca se oculta
// (el elemento LCP no espera a nada); solo lo que está por debajo del pliegue entra animado.
import { useEffect } from "react";

let io: IntersectionObserver | null = null;

function hydrated(el: Element) {
  for (const k in el) if (k.startsWith("__reactFiber")) return true;
  return false;
}

function observer() {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute("data-inview", "true");
          io?.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
  );
  return io;
}

export function observeAll(root: ParentNode = document) {
  const o = observer();
  root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-inview])").forEach((el) => o.observe(el));
}

/** Marca lo visible, activa los estados iniciales y observa el resto. Espera a que React haya hidratado. */
function arm(tries = 0) {
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  const pending = all.filter((el) => !hydrated(el));
  if (pending.length && tries < 600) { requestAnimationFrame(() => arm(tries + 1)); return; }
  const vh = window.innerHeight;
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) el.setAttribute("data-inview", "true");
  }
  document.documentElement.setAttribute("data-reveal-ready", "true");
  observeAll();
}

export function Reveal() {
  useEffect(() => {
    arm();
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return null;
}
