"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ComplexityTier, LocalizedProject } from "@/lib/portfolio/localize";
import { complexityHint, complexityLabel } from "@/lib/portfolio/localize";
import type { Locale } from "@/lib/i18n";
import type { EngineUi } from "./i18n";
import { Kicker, Reveal } from "./ui";

const TIERS: ComplexityTier[] = [1, 2, 3, 4, 5];

/**
 * Escalera de complejidad: cinco peldaños que suben; tocar uno resalta los
 * sistemas de ese nivel y muestra qué implica técnicamente.
 */
export function ComplexityLadder({ projects, ui, locale }: { projects: LocalizedProject[]; ui: EngineUi; locale: Locale }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<ComplexityTier>(4);
  const byTier = TIERS.map((t) => ({ tier: t, items: projects.filter((p) => p.complexity === t) }));
  const current = byTier[active - 1];

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 sm:px-8 sm:py-32" aria-labelledby="pf-range-title">
      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <Kicker accent>{ui.range.kicker}</Kicker>
          <h2 id="pf-range-title" className="pf-display mt-5 text-[clamp(2.4rem,5vw,4.5rem)]">{ui.range.title}</h2>
          <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: "var(--pf-ink-2)" }}>{ui.range.body}</p>
          <p className="mt-6 text-xs" style={{ color: "var(--pf-ink-3)" }}>{ui.range.hover}</p>
        </Reveal>

        <div className="lg:col-span-7">
          <div className="grid grid-cols-5 items-end gap-2 sm:gap-3" role="tablist" aria-label={ui.range.kicker}>
            {byTier.map(({ tier, items }, i) => {
              const on = tier === active;
              return (
                <motion.button
                  key={tier}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(tier)}
                  onMouseEnter={() => setActive(tier)}
                  data-cursor="grow"
                  initial={reduce ? false : { opacity: 0, scaleY: 0 }}
                  whileInView={{ opacity: 1, scaleY: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-md p-3 text-left transition-colors duration-300"
                  style={{
                    height: 120 + i * 44,
                    transformOrigin: "bottom",
                    background: on ? "var(--pf-accent)" : "rgba(242,243,245,0.04)",
                    border: `1px solid ${on ? "var(--pf-accent)" : "var(--pf-line)"}`,
                    color: on ? "var(--pf-accent-ink)" : "var(--pf-ink)",
                  }}
                >
                  <span className="pf-mono" style={{ opacity: 0.7 }}>0{tier}</span>
                  <span>
                    <span className="pf-display block text-2xl sm:text-4xl" style={{ letterSpacing: "-0.02em" }}>{items.length}</span>
                    <span className="mt-1 hidden text-[0.68rem] font-medium leading-tight sm:block" style={{ opacity: 0.85 }}>{complexityLabel(tier, locale)}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl p-5 sm:p-6" style={{ background: "rgba(242,243,245,0.03)", border: "1px solid var(--pf-line)" }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold tracking-tight">
                    <span className="pf-mono mr-3" style={{ color: "var(--pf-accent)" }}>0{active}</span>
                    {complexityLabel(active, locale)}
                  </h3>
                  <span className="text-xs" style={{ color: "var(--pf-ink-3)" }}>{ui.range.projects(current.items.length)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--pf-ink-2)" }}>{complexityHint(active, locale)}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {current.items.map((p, i) => (
                    <motion.li key={p.slug} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03, duration: 0.3 }}>
                      <Link
                        href={p.href}
                        data-cursor="grow"
                        className="inline-flex min-h-[36px] items-center gap-2 rounded-full pl-2 pr-3 text-xs font-medium transition hover:bg-white/10"
                        style={{ background: "rgba(242,243,245,0.05)", border: "1px solid var(--pf-line)" }}
                      >
                        <span className="h-4 w-4 rounded-[3px]" style={{ background: `linear-gradient(135deg, ${p.brand.primary}, ${p.brand.secondary})` }} />
                        {p.name}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
