"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion, type HTMLMotionProps, type Transition } from "framer-motion";
import type { LocalizedProject } from "@/lib/portfolio/localize";
import type { ProjectStatus } from "@/lib/portfolio/types";

export function hostOf(p: { liveUrl: string | null; slug: string }): string {
  if (p.liveUrl) {
    try {
      return new URL(p.liveUrl).host;
    } catch {
      /* cae al slug */
    }
  }
  return `${p.slug}.local`;
}

/* ── Respuesta al accionar ──────────────────────────────────────────────
   Todo control del portafolio responde igual: crece apenas al posar el
   cursor, se hunde al presionar y vuelve con resorte. Con reduced-motion
   no se mueve nada. */
export const PRESS_SPRING: Transition = { type: "spring", stiffness: 520, damping: 28, mass: 0.6 };

export function usePress(strength: "soft" | "firm" = "soft") {
  const reduce = useReducedMotion();
  if (reduce) return {};
  const hover = strength === "firm" ? 1.05 : 1.03;
  const tap = strength === "firm" ? 0.92 : 0.96;
  return { whileHover: { scale: hover }, whileTap: { scale: tap }, transition: PRESS_SPRING } as const;
}

export const MotionLink = motion.create(Link);

/** Botón con respuesta táctil. Mismo API que `<button>`. */
export function PressButton({ strength = "soft", children, ...rest }: HTMLMotionProps<"button"> & { strength?: "soft" | "firm" }) {
  const press = usePress(strength);
  return (
    <motion.button type="button" data-cursor="grow" {...press} {...rest}>
      {children}
    </motion.button>
  );
}

/** Enlace interno con respuesta táctil. Mismo API que `<Link>`. */
export function PressLink({ strength = "soft", children, ...rest }: React.ComponentProps<typeof MotionLink> & { strength?: "soft" | "firm" }) {
  const press = usePress(strength);
  return (
    <MotionLink data-cursor="grow" {...press} {...rest}>
      {children}
    </MotionLink>
  );
}

export const STATUS_COLOR: Record<ProjectStatus, string> = {
  produccion: "#6cc4a3",
  interno: "#6cc4a3",
  beta: "#7fb0e6",
  construccion: "#dcaa4a",
  prototipo: "#dcaa4a",
  propuesta: "#c9b7e8",
  legacy: "#9aa3b2",
};

export function StatusDot({ status, label }: { status: ProjectStatus; label: string }) {
  const c = STATUS_COLOR[status];
  const pulse = status === "produccion" || status === "interno";
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium" style={{ color: "var(--pf-ink-2)" }}>
      <span className="relative flex h-2 w-2">
        {pulse ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: c }} /> : null}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: c }} />
      </span>
      {label}
    </span>
  );
}

/** Cinco barras crecientes: el nivel de complejidad. */
export function LevelMeter({ level, label, size = 10 }: { level: number; label?: string; size?: number }) {
  return (
    <span className="inline-flex items-end gap-[3px]" title={label} aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px]"
          style={{ height: size * (0.4 + i * 0.15), background: i <= level ? "var(--pf-accent)" : "var(--pf-line-2)" }}
        />
      ))}
    </span>
  );
}

export function Kicker({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <p className="pf-kicker flex items-center gap-2" style={accent ? { color: "var(--pf-accent)" } : undefined}>
      <span className="inline-block h-1.5 w-1.5" style={{ background: accent ? "var(--pf-accent)" : "currentColor" }} />
      {children}
    </p>
  );
}

/** Botón circular con texto que gira alrededor, como en la referencia. */
export function RingButton({
  text,
  onClick,
  href,
  ariaLabel,
  progress,
  size = 132,
  children,
  fast = false,
}: {
  text: string;
  onClick?: () => void;
  href?: string;
  ariaLabel: string;
  progress?: number;
  size?: number;
  children: React.ReactNode;
  fast?: boolean;
}) {
  const id = useId();
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const inner = (
    <>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`absolute inset-0 ${fast ? "pf-ring pf-ring-fast" : "pf-ring"}`} aria-hidden>
        <defs>
          <path id={id} d={`M ${size / 2},${size / 2} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`} />
        </defs>
        <text fill="var(--pf-accent)" fontSize="10.5" fontWeight="700" letterSpacing="0.28em" style={{ textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
          <textPath href={`#${id}`} startOffset="0" textLength={circ} lengthAdjust="spacing">{`${text} • `}</textPath>
        </text>
      </svg>
      {typeof progress === "number" ? (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r - 18} fill="none" stroke="var(--pf-line-2)" strokeWidth="1" />
          <circle cx={size / 2} cy={size / 2} r={r - 18} fill="none" stroke="var(--pf-accent)" strokeWidth="1.5" strokeDasharray={2 * Math.PI * (r - 18)} strokeDashoffset={2 * Math.PI * (r - 18) * (1 - progress)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.25s linear" }} />
        </svg>
      ) : null}
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110" style={{ background: "rgba(242,243,245,0.06)", border: "1px solid var(--pf-line-2)" }}>
        {children}
      </span>
      <span className="sr-only">{ariaLabel}</span>
    </>
  );
  const cls = "group relative inline-flex shrink-0 items-center justify-center";
  if (href) {
    return (
      <PressLink href={href} strength="firm" className={cls} style={{ width: size, height: size }} aria-label={ariaLabel}>
        {inner}
      </PressLink>
    );
  }
  return (
    <PressButton onClick={onClick} strength="firm" className={cls} style={{ width: size, height: size }} aria-label={ariaLabel}>
      {inner}
    </PressButton>
  );
}

/** Número que cuenta hasta su valor al entrar en pantalla. */
export function CountUp({ value, suffix = "", duration = 1.4 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 4);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  );
}

/** Aparece desde abajo con un desenfoque que se resuelve. */
export function Reveal({ children, delay = 0, className = "", once = true, y = 28 }: { children: React.ReactNode; delay?: number; className?: string; once?: boolean; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Chip({ children, active = false, onClick, title }: { children: React.ReactNode; active?: boolean; onClick?: () => void; title?: string }) {
  const cls = "inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[0.72rem] font-medium transition-colors duration-300";
  const style = {
    background: active ? "var(--pf-accent)" : "rgba(242,243,245,0.05)",
    color: active ? "var(--pf-accent-ink)" : "var(--pf-ink-2)",
    border: `1px solid ${active ? "var(--pf-accent)" : "var(--pf-line)"}`,
  };
  if (!onClick) {
    return (
      <span title={title} className={cls} style={style}>
        {children}
      </span>
    );
  }
  return (
    <PressButton onClick={onClick} title={title} aria-pressed={active} className={cls} style={style}>
      {children}
    </PressButton>
  );
}

export function projectYears(p: LocalizedProject): string {
  const [a, b] = p.years;
  return b && b !== a ? `${a}–${b}` : `${a}`;
}
