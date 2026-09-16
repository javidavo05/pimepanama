"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { LandingFooter } from "@/components/landing/footer";
import { projects } from "@/lib/portfolio/catalog";
import { localizeProject } from "@/lib/portfolio/localize";
import type { Locale } from "@/lib/i18n";
import { localizedPath } from "@/lib/seo-urls";
import "./engine.css";
import { ArchiveGrid } from "./archive-grid";
import { ComplexityLadder } from "./complexity-ladder";
import { EngineCursor } from "./cursor";
import { EngineAnalytics } from "./engine-analytics";
import { engineUi } from "./i18n";
import { IndexOverlay } from "./index-overlay";
import { Showreel } from "./showreel";
import { StackStrip } from "./stack-strip";
import { Kicker, Reveal } from "./ui";

export function navItemsFor(locale: Locale) {
  const ui = engineUi(locale);
  const home = localizedPath("/", locale);
  return [
    { label: ui.nav.services, href: `${home === "/" ? "" : home}/#services` },
    { label: ui.nav.portfolio, href: localizedPath("/portfolio", locale) },
    { label: ui.nav.contact, href: `${home === "/" ? "" : home}/#contact` },
  ];
}

export function PortfolioEnginePage({ locale }: { locale: Locale }) {
  const ui = engineUi(locale);
  const all = useMemo(() => projects.map((p) => localizeProject(p, locale)), [locale]);
  const featured = useMemo(() => all.filter((p) => p.featured), [all]);
  const [indexOpen, setIndexOpen] = useState(false);
  const contact = `${localizedPath("/", locale) === "/" ? "" : localizedPath("/", locale)}/#contact`;

  return (
    <>
      <NavigationBar locale={locale} items={navItemsFor(locale)} />
      <div className="pf-root">
        <EngineCursor />
        <main>
          <Showreel projects={featured} ui={ui} onOpenIndex={() => setIndexOpen(true)} />

          <Reveal className="mx-auto max-w-7xl px-6 pb-8 pt-24 sm:px-8">
            <p className="max-w-3xl text-[clamp(1.25rem,2.4vw,1.9rem)] font-medium leading-snug tracking-tight" style={{ color: "var(--pf-ink)" }}>
              {ui.hero.subtitle}
            </p>
          </Reveal>

          <StackStrip ui={ui} />
          <ComplexityLadder projects={all} ui={ui} locale={locale} />
          <ArchiveGrid projects={all} ui={ui} locale={locale} />
          <EngineAnalytics projects={all} ui={ui} locale={locale} />

          <section className="relative mx-auto max-w-7xl px-6 py-28 sm:px-8" aria-labelledby="pf-cta-title">
            <Reveal className="flex flex-col items-start gap-6">
              <Kicker accent>{ui.cta.kicker}</Kicker>
              <h2 id="pf-cta-title" className="pf-display max-w-4xl text-[clamp(2rem,7vw,6.5rem)]">{ui.cta.title}</h2>
              <p className="max-w-lg text-base leading-relaxed" style={{ color: "var(--pf-ink-2)" }}>{ui.cta.body}</p>
              <Link href={contact} data-cursor="grow" className="inline-flex min-h-[52px] items-center gap-3 rounded-full px-7 text-sm font-semibold uppercase tracking-[0.18em] transition hover:brightness-110" style={{ background: "var(--pf-accent)", color: "var(--pf-accent-ink)" }}>
                {ui.cta.button}
                <Icon icon="ph:arrow-right" className="h-4 w-4" />
              </Link>
            </Reveal>
          </section>
        </main>
        <IndexOverlay open={indexOpen} onClose={() => setIndexOpen(false)} projects={all} ui={ui} />
      </div>
      <LandingFooter locale={locale} />
    </>
  );
}
