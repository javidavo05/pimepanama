"use client";

import Link from "next/link";
import Image from "next/image";
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

export function HeroSection({
  hero,
  navigation,
}: {
  hero: HeroContent;
  navigation: { label: string; href: string }[];
}) {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden border-b border-white/10 bg-[#050505] text-white"
    >
      <div className="absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(80,80,80,0.25),_transparent_55%)]" />
        {hero.backgroundImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-screen"
            style={{ backgroundImage: `url(${hero.backgroundImageUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/60 to-[#090909]" />
      </div>
      <div className="relative z-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 lg:flex-row lg:items-center lg:gap-24 lg:pt-32">
          <div className="flex-1 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-6"
            >
              <p className="text-xs uppercase tracking-[0.6em] text-white/40">PIME Panama</p>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
                {hero.headline}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-white/60 md:text-lg">{hero.subheadline}</p>
            </motion.div>
            {hero.highlight ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 backdrop-blur">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  {hero.highlight}
                </div>
              </motion.div>
            ) : null}
            <motion.div
              className="flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
            >
              {hero.primaryCta.label && hero.primaryCta.href ? (
                <Link
                  href={hero.primaryCta.href}
                  className="group inline-flex items-center justify-center rounded-full border border-white/20 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:bg-white/80"
                >
                  {hero.primaryCta.label}
                </Link>
              ) : null}
              {hero.secondaryCta.label && hero.secondaryCta.href ? (
                <Link
                  href={hero.secondaryCta.href}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/50"
                >
                  {hero.secondaryCta.label}
                </Link>
              ) : null}
            </motion.div>
          </div>
          <motion.div
            className="flex min-h-[320px] flex-1 items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.35 }}
          >
            <div className="relative h-full w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_65%)]" />
              <div className="relative z-10 flex h-full flex-col items-center justify-center space-y-8">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{
                    duration: 1.2,
                    ease: "easeOut",
                    delay: 0.5,
                  }}
                  className="relative"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0],
                    }}
                    transition={{
                      duration: 6,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                  >
                    <Image
                      src="/pime-icon.svg"
                      alt="PIME Logo"
                      width={180}
                      height={180}
                      className="drop-shadow-2xl"
                      priority
                    />
                  </motion.div>
                  <div className="absolute -inset-4 -z-10 animate-pulse rounded-full bg-gradient-to-br from-[#0586FE]/20 to-[#552EFF]/20 blur-2xl" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="space-y-4 text-center"
                >
                  <div className="grid gap-3 text-sm text-white/60">
                    <p>Turnkey engineering for high-stakes industrial programs.</p>
                    <p>Lifecycle integration from strategic advisory to predictive maintenance.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.3em] text-white/30">
                    {navigation.slice(0, 4).map((item) => (
                      <Link key={item.href} href={item.href} className="hover:text-white/70">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

