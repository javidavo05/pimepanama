"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Cursor propio: un punto que sigue al puntero y un anillo que lo persigue
 * con resorte. Sobre elementos con `data-cursor="grow"` el anillo crece.
 * Solo en dispositivos con puntero fino; en táctil no se monta.
 */
export function EngineCursor() {
  const [enabled, setEnabled] = useState(false);
  const [grow, setGrow] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.querySelector(".pf-root")?.classList.add("pf-has-cursor");
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = (e.target as HTMLElement | null)?.closest("[data-cursor], a, button");
      setGrow(Boolean(target));
    };
    const pd = () => setDown(true);
    const pu = () => setDown(false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", pd);
    window.addEventListener("pointerup", pu);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointerup", pu);
      document.querySelector(".pf-root")?.classList.remove("pf-has-cursor");
    };
  }, [x, y]);

  if (!enabled) return null;
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ x, y, background: "var(--pf-accent)", mixBlendMode: "difference" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ x: rx, y: ry, border: "1.5px solid var(--pf-accent)" }}
        animate={{ width: grow ? 44 : 28, height: grow ? 44 : 28, opacity: down ? 0.5 : grow ? 0.9 : 0.6, scale: down ? 0.8 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
    </>
  );
}
