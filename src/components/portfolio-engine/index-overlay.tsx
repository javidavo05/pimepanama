"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { Icon } from "@iconify/react";
import type { LocalizedProject } from "@/lib/portfolio/localize";
import type { EngineUi } from "./i18n";
import { heroRoute } from "./showreel";
import { SiteWindow } from "./site-window";
import { LevelMeter, StatusDot, hostOf } from "./ui";

/**
 * Índice completo: se revela con un recorte circular desde el transporte y
 * lista todos los sistemas. La ventana del proyecto sigue al cursor.
 */
export function IndexOverlay({
  open,
  onClose,
  projects,
  ui,
}: {
  open: boolean;
  onClose: () => void;
  projects: LocalizedProject[];
  ui: EngineUi;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<LocalizedProject | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 24 });
  const sy = useSpring(y, { stiffness: 180, damping: 24 });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={ui.index.title}
          className="fixed inset-0 z-[80] overflow-y-auto"
          style={{ background: "var(--pf-bg-2)" }}
          initial={reduce ? { opacity: 0 } : { clipPath: "circle(0% at 50% 100%)" }}
          animate={reduce ? { opacity: 1 } : { clipPath: "circle(150% at 50% 100%)" }}
          exit={reduce ? { opacity: 0 } : { clipPath: "circle(0% at 50% 100%)" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={(e) => {
            x.set(e.clientX);
            y.set(e.clientY);
          }}
        >
          <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="pf-kicker" style={{ color: "var(--pf-accent)" }}>{ui.index.title}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--pf-ink-3)" }}>{ui.index.count(projects.length)} · {ui.index.hint}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={ui.index.close} data-cursor="grow" className="flex h-12 w-12 items-center justify-center rounded-full transition hover:bg-white/5" style={{ border: "1px solid var(--pf-line-2)" }}>
                <Icon icon="ph:x" className="h-5 w-5" />
              </button>
            </div>

            <ol className="mt-10 divide-y" style={{ borderColor: "var(--pf-line)" }}>
              {projects.map((p, i) => (
                <motion.li
                  key={p.slug}
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.025, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ borderColor: "var(--pf-line)" }}
                >
                  <Link
                    href={p.href}
                    onMouseEnter={() => setHover(p)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(p)}
                    onBlur={() => setHover(null)}
                    className="group grid min-h-[56px] grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-3 sm:grid-cols-[2.5rem_1fr_9rem_8rem_auto]"
                  >
                    <span className="pf-mono tabular-nums" style={{ color: "var(--pf-ink-3)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className="pf-display block truncate text-xl transition-transform duration-500 group-hover:translate-x-2 sm:text-2xl" style={{ letterSpacing: "-0.02em" }}>{p.name}</span>
                      <span className="block truncate text-xs" style={{ color: "var(--pf-ink-3)" }}>{p.industry}</span>
                    </span>
                    <span className="hidden text-xs sm:block" style={{ color: "var(--pf-ink-2)" }}>{p.categoryLabel}</span>
                    <span className="hidden sm:block"><StatusDot status={p.status} label={p.statusLabel} /></span>
                    <span className="flex items-center gap-3">
                      <LevelMeter level={p.complexity} label={p.complexityLabel} />
                      <Icon icon="ph:arrow-up-right" className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: "var(--pf-accent)" }} />
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* Ventana flotante que sigue al cursor */}
          <AnimatePresence>
            {hover && !reduce ? (
              <motion.div
                key={hover.slug}
                className="pointer-events-none fixed left-0 top-0 z-10 hidden w-[320px] lg:block"
                style={{ x: sx, y: sy, translateX: "24px", translateY: "-50%" }}
                initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: -2 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="aspect-[16/10]">
                  <SiteWindow brand={hover.brand} screen={heroRoute(hover).screen} path={heroRoute(hover).path} host={hostOf(hover)} live showCursor={false} className="h-full w-full" radius={10} image={hover.shots[heroRoute(hover).path]} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
