"use client";

import { Icon } from "@iconify/react";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { LandingFooter } from "@/components/landing/footer";
import { projects } from "@/lib/portfolio/catalog";
import { localizeProject } from "@/lib/portfolio/localize";
import type { Locale } from "@/lib/i18n";
import { localizedPath } from "@/lib/seo-urls";
import "./engine.css";
import { EngineCursor } from "./cursor";
import { engineUi } from "./i18n";
import { navItemsFor } from "./portfolio-page";
import { ProjectDossier } from "./project-dossier";
import { Kicker, LevelMeter, PressLink, Reveal, RingButton, StatusDot, projectYears } from "./ui";

export function ProjectEnginePage({ slug, locale }: { slug: string; locale: Locale }) {
  const ui = engineUi(locale);
  const idx = projects.findIndex((p) => p.slug === slug);
  const project = localizeProject(projects[idx], locale);
  const next = localizeProject(projects[(idx + 1) % projects.length], locale);
  const prev = localizeProject(projects[(idx - 1 + projects.length) % projects.length], locale);
  const siblings = projects
    .map((p) => localizeProject(p, locale))
    .filter((p) => p.complexity === project.complexity && p.slug !== project.slug)
    .slice(0, 4);
  const ghost = project.name.split(" ")[0];

  return (
    <>
      <NavigationBar locale={locale} items={navItemsFor(locale)} />
      <div className="pf-root">
        <EngineCursor />
        <main className="relative overflow-hidden">
          <div className="pf-ghost absolute -right-[6vw] top-[4vw] text-[24vw]" aria-hidden>{ghost}</div>

          <header className="relative mx-auto max-w-7xl px-6 pb-12 pt-10 sm:px-8">
            <PressLink href={localizedPath("/portfolio", locale)} className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:text-white" style={{ color: "var(--pf-ink-2)" }}>
              <Icon icon="ph:arrow-left" className="h-4 w-4" />
              {ui.project.back}
            </PressLink>
            <Reveal className="mt-10 flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="pf-mono tabular-nums" style={{ color: "var(--pf-ink-3)" }}>{String(idx + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span>
                <Kicker accent>{project.categoryLabel} · {project.industry}</Kicker>
              </div>
              <h1 className="pf-display text-[clamp(3rem,10vw,9rem)]">{project.name}</h1>
              <p className="max-w-2xl text-[clamp(1.1rem,2vw,1.5rem)] font-medium leading-snug tracking-tight" style={{ color: "var(--pf-ink-2)" }}>{project.tagline}</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: "var(--pf-ink-2)" }}>
                <StatusDot status={project.status} label={project.statusLabel} />
                <span className="inline-flex items-center gap-2"><LevelMeter level={project.complexity} label={project.complexityLabel} /> {project.complexityLabel}</span>
                <span className="tabular-nums">{projectYears(project)}</span>
                {project.client ? <span>{project.client}</span> : null}
              </div>
            </Reveal>
          </header>

          <section className="relative mx-auto max-w-7xl px-6 pb-24 sm:px-8">
            <ProjectDossier project={project} ui={ui} locale={locale} />
          </section>

          {siblings.length ? (
            <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8">
              <p className="pf-kicker">{ui.project.sameLevel}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <PressLink href={s.href} className="inline-flex min-h-[40px] items-center gap-2 rounded-full pl-2 pr-4 text-sm transition-colors hover:bg-white/10" style={{ background: "rgba(242,243,245,0.05)", border: "1px solid var(--pf-line)" }}>
                      <span className="h-5 w-5 rounded-[4px]" style={{ background: `linear-gradient(135deg, ${s.brand.primary}, ${s.brand.secondary})` }} />
                      {s.name}
                    </PressLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 pb-24 sm:px-8" style={{ borderTop: "1px solid var(--pf-line)" }} aria-label={`${ui.project.prev} / ${ui.project.next}`}>
            <PressLink href={prev.href} className="group flex min-h-[44px] flex-col gap-1 pt-8">
              <span className="pf-kicker">{ui.project.prev}</span>
              <span className="pf-display text-2xl transition-transform duration-500 group-hover:-translate-x-1 sm:text-4xl" style={{ letterSpacing: "-0.02em" }}>{prev.name}</span>
            </PressLink>
            <div className="hidden pt-8 sm:block">
              <RingButton text={ui.hero.next} href={next.href} ariaLabel={ui.project.next}>
                <Icon icon="ph:skip-forward-fill" className="h-5 w-5" />
              </RingButton>
            </div>
            <PressLink href={next.href} className="group flex min-h-[44px] flex-col items-end gap-1 pt-8 text-right">
              <span className="pf-kicker">{ui.project.next}</span>
              <span className="pf-display text-2xl transition-transform duration-500 group-hover:translate-x-1 sm:text-4xl" style={{ letterSpacing: "-0.02em" }}>{next.name}</span>
            </PressLink>
          </nav>
        </main>
      </div>
      <LandingFooter locale={locale} />
    </>
  );
}
