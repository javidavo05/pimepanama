"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ProjectBrand, ScreenKind } from "@/lib/portfolio/types";
import type { Shot } from "@/lib/portfolio/shots";
import { ScreenMock } from "./screen-mock";

/**
 * Ventana de navegador. Recibe el proyecto (marca + pantalla) y una ruta; al
 * cambiar la ruta escribe la URL letra a letra y cambia la pantalla con un
 * fundido. `live` enciende la animación interna (cursor, gráficas, bloques).
 */
export function SiteWindow({
  brand,
  screen,
  path,
  host,
  live,
  className = "",
  showCursor = true,
  radius = 14,
  image,
  priority = false,
  sampleLabel,
  sampleNote,
}: {
  brand: ProjectBrand;
  screen: ScreenKind;
  path: string;
  host: string;
  live: boolean;
  className?: string;
  showCursor?: boolean;
  radius?: number;
  /** Captura real de esa ruta; si falta se dibuja la pantalla sintética. */
  image?: Shot;
  priority?: boolean;
  /** Texto de la bandera cuando la captura lleva datos de muestra. */
  sampleLabel?: string;
  sampleNote?: string;
}) {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(path);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setTyped(path);
      return;
    }
    if (timer.current) window.clearInterval(timer.current);
    let i = 0;
    setTyped("");
    timer.current = window.setInterval(() => {
      i += 1;
      setTyped(path.slice(0, i));
      if (i >= path.length && timer.current) window.clearInterval(timer.current);
    }, 28);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [path, reduce]);

  const dark = brand.scheme === "dark";
  const chromeBg = dark ? "#171b22" : "#e9ebef";
  const chromeInk = dark ? "rgba(242,243,245,0.6)" : "rgba(20,24,32,0.6)";
  const urlBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  return (
    <div
      className={`relative flex flex-col overflow-hidden ${live ? "pf-live" : ""} ${className}`}
      style={{
        borderRadius: radius,
        background: chromeBg,
        boxShadow: live
          ? `0 30px 80px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px -20px ${brand.primary}66`
          : "0 24px 60px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
        transition: "box-shadow 0.5s var(--pf-ease)",
      }}
    >
      <div className="flex h-8 shrink-0 items-center gap-2 px-3">
        <div className="flex gap-1.5">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, opacity: live ? 1 : 0.55 }} />
          ))}
        </div>
        <div className="ml-2 flex h-5 min-w-0 flex-1 items-center gap-1.5 rounded-md px-2" style={{ background: urlBg }}>
          <span className="h-2 w-2 rounded-full" style={{ background: live ? "#28c840" : chromeInk, opacity: live ? 1 : 0.4 }} />
          <span className="pf-mono truncate" style={{ color: chromeInk, fontSize: "0.65rem" }}>
            <span style={{ opacity: 0.55 }}>{host}</span>
            <span style={{ color: dark ? "#f2f3f5" : "#141820" }}>{typed}</span>
            {typed.length < path.length ? <span className="animate-pulse">▍</span> : null}
          </span>
        </div>
        {image?.kind === "sample" && sampleLabel ? (
          <span
            className="flex h-5 shrink-0 items-center gap-1.5 rounded-md px-2 text-[0.625rem] font-semibold"
            style={{ background: "rgba(220,170,74,0.16)", border: "1px solid rgba(220,170,74,0.45)", color: dark ? "#f0cf8a" : "#7a5510" }}
            title={sampleNote}
            aria-label={sampleNote}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#dcaa4a" }} aria-hidden />
            {sampleLabel}
          </span>
        ) : null}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={image ? image.src : screen}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 1.02, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.985, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {image ? (
              <div className="pf-shot relative h-full w-full" style={{ background: brand.surface }}>
                <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 860px, 100vw" priority={priority} className="object-cover object-top" />
                {image.kind === "demo" ? (
                  <span className="pf-mono absolute bottom-2 right-2 rounded-md px-1.5 py-0.5" style={{ background: "rgba(12,15,20,0.75)", color: "#f2f3f5", fontSize: "0.6rem", letterSpacing: "0.12em" }}>DEMO</span>
                ) : null}
              </div>
            ) : (
              <ScreenMock kind={screen} brand={brand} />
            )}
          </motion.div>
        </AnimatePresence>

        {showCursor && live && !reduce ? (
          <div className="pf-window-cursor pointer-events-none absolute left-0 top-0 h-full w-full" aria-hidden>
            <span
              className="block h-3.5 w-3.5"
              style={{
                clipPath: "polygon(0 0, 100% 45%, 55% 55%, 45% 100%)",
                background: brand.scheme === "dark" ? "#fff" : "#111",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
