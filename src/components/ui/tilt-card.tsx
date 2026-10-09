"use client";
// Tarjeta con inclinación 3D al cursor y spotlight radial (variables CSS, sin layout).
import type { PointerEvent } from "react";

export function TiltCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget; const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
    const max = parseFloat(getComputedStyle(el).getPropertyValue("--tilt")) || 0;
    el.style.setProperty("--ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--spot", "1");
  };
  const leave = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); el.style.setProperty("--spot", "0");
  };
  return (
    <div className={`card raised ${className}`.trim()} style={style} data-motion="tilt" onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}
