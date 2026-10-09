"use client";
// Marquee infinito: avanza solo, se pausa al pasar el cursor y acelera con la velocidad del scroll.
// Solo transform en rAF; con movimiento reducido queda quieto y envuelve.
import { useEffect, useRef } from "react";

export function Marquee({ children, speed = 40, className = "" }: { children: React.ReactNode; speed?: number; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current; if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-reduced-motion")) return;
    let x = 0, last = performance.now(), lastY = window.scrollY, boost = 0, paused = false, raf = 0;
    const half = () => el.scrollWidth / 2;
    const onScroll = () => { const y = window.scrollY; boost = Math.min(Math.abs(y - lastY) * 6, 600); lastY = y; };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      boost *= 0.9;
      if (!paused) x -= (speed + boost) * dt;
      const h = half(); if (h > 0 && -x >= h) x += h;
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    const enter = () => { paused = true; }, leave = () => { paused = false; };
    el.parentElement?.addEventListener("pointerenter", enter); el.parentElement?.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); el.parentElement?.removeEventListener("pointerenter", enter); el.parentElement?.removeEventListener("pointerleave", leave); };
  }, [speed]);
  return (
    <div className={`marquee ${className}`.trim()} data-motion="marquee">
      <div className="marquee-track" ref={track}>{children}{children}</div>
    </div>
  );
}
