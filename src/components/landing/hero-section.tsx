"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";

type HeroCTA = {
  label: string | null;
  href: string | null;
};

type HeroContent = {
  locale: Locale;
  headline: string;
  subheadline: string;
  highlight?: string | null;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  primaryCta: HeroCTA;
  secondaryCta: HeroCTA;
};

const PREVIEW_CARDS = [
  { label: "Tickex", metric: "$84K", sub: "en ventas en 48 h", color: "#0c1530" },
  { label: "Academyx CRM", metric: "+1,200 h/mes", sub: "ahorradas en gestión", color: "#080e20" },
  { label: "B&B Real Estate", metric: "3.2× reservas", sub: "tras el lanzamiento", color: "#050a17" },
] as const;

const EYEBROW: Record<Locale, string> = {
  es: "Ciudad de Panamá · Empresa de Desarrollo de Software",
  en: "Panama City · Software Development Company",
};

const TRUST_LABEL: Record<Locale, string> = {
  es: "Sistemas activos para:",
  en: "Active systems for:",
};

function WordReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className="inline" aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.055,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroSection({
  hero,
  navigation: _navigation,
}: {
  hero: HeroContent;
  navigation: { label: string; href: string }[];
}) {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#030a18] via-[#04040a] to-[#020206] text-white"
    >
      {/* Animated background glows */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 12% -10%, rgba(37,99,235,0.30), transparent 55%), radial-gradient(circle at 80% 0%, rgba(124,58,237,0.28), transparent 60%), radial-gradient(circle at bottom, rgba(8,145,178,0.18), transparent 65%)",
              "radial-gradient(circle at 20% -5%, rgba(37,99,235,0.35), transparent 55%), radial-gradient(circle at 75% 5%, rgba(124,58,237,0.22), transparent 60%), radial-gradient(circle at bottom, rgba(8,145,178,0.22), transparent 65%)",
              "radial-gradient(circle at 12% -10%, rgba(37,99,235,0.30), transparent 55%), radial-gradient(circle at 80% 0%, rgba(124,58,237,0.28), transparent 60%), radial-gradient(circle at bottom, rgba(8,145,178,0.18), transparent 65%)",
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{ opacity: 0.75 }}
        />
        {hero.backgroundImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-soft-light"
            style={{ backgroundImage: `url(${hero.backgroundImageUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-br from-[#02040a]/90 via-[#030510]/85 to-[#010208]/95" />
      </div>

      <div className="relative z-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 lg:flex-row lg:items-center lg:gap-24 lg:pt-32">

          {/* Left: Text content */}
          <div className="flex-1 space-y-10">
            <div className="space-y-6">
              <motion.p
                className="text-[0.6rem] uppercase leading-relaxed tracking-[0.3em] text-[#60A5FA] sm:text-xs sm:tracking-[0.5em]"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {EYEBROW[hero.locale]}
              </motion.p>

              <h1
                className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <WordReveal text={hero.headline} delay={0.1} />
              </h1>

              <motion.p
                className="max-w-2xl text-base leading-relaxed text-white/70 md:text-lg"
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {hero.subheadline}
              </motion.p>
            </div>

            {hero.highlight ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/30 bg-[#0e1a2f]/80 px-4 py-2 text-sm text-white/70 backdrop-blur">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#38BDF8]" aria-hidden="true" />
                  {hero.highlight}
                </div>
              </motion.div>
            ) : null}

            <motion.div
              className="flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {hero.primaryCta.label && hero.primaryCta.href ? (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href={hero.primaryCta.href}
                    className="group inline-flex items-center justify-center rounded-full border-0 bg-gradient-to-r from-[#4F46E5] via-[#2563EB] to-[#0EA5E9] px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-[0_18px_35px_-20px_rgba(37,99,235,0.75)] transition-shadow hover:shadow-[0_18px_40px_-15px_rgba(37,99,235,0.9)]"
                  >
                    {hero.primaryCta.label}
                  </Link>
                </motion.div>
              ) : null}
              {hero.secondaryCta.label && hero.secondaryCta.href ? (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href={hero.secondaryCta.href}
                    className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/4 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.25em] text-white/80 transition hover:border-white/25 hover:text-white"
                  >
                    {hero.secondaryCta.label}
                  </Link>
                </motion.div>
              ) : null}
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.75, ease: "easeOut" }}
              className="space-y-2 pt-2"
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/35">
                {TRUST_LABEL[hero.locale]}
              </p>
              <p className="text-sm text-white/40">
                Academyx · Sembradores · Visita7 · B&amp;B Real Estate · Tickex · y más
              </p>
            </motion.div>
          </div>

          {/* Right: Dashboard preview cards */}
          <motion.div
            className="flex min-h-[340px] flex-1 items-center justify-center"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          >
            <div className="relative h-[340px] w-full max-w-sm">
              {PREVIEW_CARDS.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 30, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    delay: 0.55 + i * 0.13,
                  }}
                  className="absolute rounded-xl p-5"
                  style={{
                    top: `${i * 82}px`,
                    left: `${i * 20}px`,
                    right: `${(2 - i) * 10}px`,
                    zIndex: 10 - i,
                    background: card.color,
                    border: "1px solid rgba(37,99,235,0.2)",
                    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-[#60A5FA]/70">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">{card.metric}</p>
                  <p className="mt-0.5 text-xs text-white/40">{card.sub}</p>
                  {/* Inner blue glow */}
                  <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 hover:opacity-100"
                    style={{ background: "radial-gradient(circle at 30% 30%, rgba(37,99,235,0.12), transparent 70%)" }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
