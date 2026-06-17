"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLang } from "../context/ResumeContext";
import { content, type Lang } from "../data/content";

const TECH_ITEMS = [
  "Next.js 15", "React 19", "TypeScript", "Supabase", "Tailwind CSS", "Vercel",
  "PostgreSQL", "Electron", "Turborepo", "AWS S3", "Drizzle ORM", "Stripe",
  "PWA", "Multi-tenant SaaS",
];

const TICKER_ITEMS: Record<Lang, string[]> = {
  en: [...TECH_ITEMS, "5+ Payment Gateways", "$1.1M+ Delivered", "Panama City, Panama"],
  es: [...TECH_ITEMS, "5+ Pasarelas de Pago", "$1.1M+ Entregado", "Ciudad de Panamá, Panamá"],
};

const ease = [0.16, 1, 0.3, 1] as const;

const item = {
  hidden: { opacity: 0, y: 32, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease } },
};

export function HeroSection() {
  const { lang } = useLang();
  const t = content[lang].hero;

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const meshY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={ref}
      data-section="hero"
      data-bg="dark"
      className="relative flex min-h-screen flex-col justify-center overflow-hidden"
      style={{ backgroundColor: "#0A1813", color: "#EEEEE8" }}
    >
      {/* Animated gradient mesh */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ y: meshY }}>
        <motion.div
          className="absolute -left-1/4 top-[-10%] h-[60vh] w-[60vh] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(200,169,110,0.16) 0%, transparent 65%)" }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-15%] right-[-10%] h-[55vh] w-[55vh] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(45,90,70,0.5) 0%, transparent 60%)" }}
          animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-[40vh] w-[40vh] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 60%)" }}
          animate={{ x: [0, -40, 30, 0], y: [0, 30, -20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Grain / noise overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 sm:px-10"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.13 } } }} initial="hidden" animate="show">
          <motion.p variants={item} className="mb-8 text-[10px] font-medium uppercase tracking-[0.6em]" style={{ color: "#C8A96E" }}>
            {t.eyebrow}
          </motion.p>

          <motion.h1
            variants={item}
            className="hero-name mb-4 text-6xl font-extrabold leading-none tracking-tight sm:text-7xl lg:text-[8.5rem]"
            style={{ fontFamily: "var(--font-syne)", color: "#EEEEE8" }}
          >
            {t.name}
          </motion.h1>

          <motion.p
            variants={item}
            className="mb-6 text-lg font-semibold tracking-wide sm:text-xl"
            style={{ fontFamily: "var(--font-syne)", color: "#C8A96E" }}
          >
            {t.title}
          </motion.p>

          <motion.p variants={item} className="mb-12 max-w-xl text-base leading-relaxed" style={{ color: "#9AA89F" }}>
            {t.tagline}
          </motion.p>

          <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row">
            <motion.a
              href="#projects"
              whileHover={{ scale: 1.04, y: -2, boxShadow: "0 12px 40px -8px rgba(200,169,110,0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-[0.3em]"
              style={{ backgroundColor: "#C8A96E", color: "#0D1F18" }}
            >
              {t.ctaView}
            </motion.a>
            <motion.button
              onClick={() => window.print()}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="no-print inline-flex items-center justify-center gap-2 rounded-full border px-8 py-3.5 text-xs font-bold uppercase tracking-[0.3em]"
              style={{ borderColor: "rgba(200,169,110,0.4)", color: "#C8A96E", backgroundColor: "transparent" }}
            >
              {t.ctaDownload}
            </motion.button>
          </motion.div>

          <motion.div variants={item} className="mt-16 flex flex-wrap gap-x-8 gap-y-3">
            {t.stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "#C8A96E" }}>
                  {s.value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#6B7B72" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        className="no-print absolute bottom-24 left-1/2 hidden -translate-x-1/2 sm:block"
        animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex h-9 w-5 items-start justify-center rounded-full border pt-1.5" style={{ borderColor: "rgba(200,169,110,0.4)" }}>
          <div className="h-1.5 w-1 rounded-full" style={{ backgroundColor: "#C8A96E" }} />
        </div>
      </motion.div>

      {/* Ticker strip */}
      <div className="ticker-container absolute bottom-0 left-0 right-0 overflow-hidden border-t py-4" style={{ borderColor: "rgba(200,169,110,0.12)" }}>
        <div className="ticker-track flex gap-12 whitespace-nowrap" style={{ width: "max-content" }}>
          {[...TICKER_ITEMS[lang], ...TICKER_ITEMS[lang]].map((it, i) => (
            <span key={i} className="text-[9px] font-medium uppercase tracking-[0.5em]" style={{ color: "#6B7B72" }}>
              {it}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
