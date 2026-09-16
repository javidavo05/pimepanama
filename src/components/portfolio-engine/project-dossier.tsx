"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import type { LocalizedProject } from "@/lib/portfolio/localize";
import { routeGroupLabel, shotFor, shotRoutes } from "@/lib/portfolio/localize";
import { buildAllSeries } from "@/lib/portfolio/mock-metrics";
import type { Locale } from "@/lib/i18n";
import type { RouteGroup } from "@/lib/portfolio/types";
import type { EngineUi } from "./i18n";
import { MiniChart } from "./mini-chart";
import { heroRoute } from "./showreel";
import { SiteWindow } from "./site-window";
import { LevelMeter, PressButton, PressLink, StatusDot, hostOf, projectYears, useCycle, usePress } from "./ui";

const GROUP_ORDER: RouteGroup[] = ["publico", "panel", "operacion", "movil", "api"];

/**
 * Dossier de un sistema: ventana con rutas interactivas, qué hace, stack,
 * actividad simulada y accesos. Se usa expandido en el archivo y como cuerpo
 * de la ficha completa.
 */
export function ProjectDossier({ project, ui, locale, compact = false }: { project: LocalizedProject; ui: EngineUi; locale: Locale; compact?: boolean }) {
  const pressFirm = usePress("firm");
  const [route, setRoute] = useState(heroRoute(project));
  const screens = useMemo(() => shotRoutes(project), [project]);
  // Recorre sus pantallas sola hasta que la persona elige una; desde ahí manda la persona.
  const [touched, setTouched] = useState(false);
  const [auto] = useCycle(screens.length, 3200, !touched);
  useEffect(() => {
    if (!touched && screens[auto]) setRoute(screens[auto]);
  }, [auto, touched, screens]);
  const pick = (r: (typeof screens)[number]) => {
    setTouched(true);
    setRoute(r);
  };
  const series = useMemo(() => buildAllSeries(project.slug, project.metrics), [project.slug, project.metrics]);
  const groups = GROUP_ORDER.map((g) => ({ g, routes: project.routes.filter((r) => r.group === g) })).filter((x) => x.routes.length);

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Ventana + rutas */}
      <div className="lg:col-span-7">
        <div className="aspect-[16/10]">
          <SiteWindow brand={project.brand} screen={route.screen} path={route.path} host={hostOf(project)} live className="h-full w-full" radius={14} image={shotFor(project, route.path)} sampleLabel={ui.window.sample} sampleNote={ui.window.sampleNote} />
        </div>

        {screens.length > 1 ? (
          <div className="pf-scroll-hidden mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={ui.hero.screens(screens.length)}>
            {screens.map((r, k) => {
              const on = r.path === route.path;
              return (
                <button
                  key={r.path}
                  type="button"
                  onClick={() => pick(r)}
                  onFocus={() => pick(r)}
                  aria-label={ui.hero.screen(k + 1, screens.length, r.label)}
                  aria-pressed={on}
                  className="relative aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-md transition-opacity duration-300 hover:opacity-100 sm:w-32"
                  style={{
                    outline: on ? `2px solid ${project.brand.primary}` : "1px solid var(--pf-line)",
                    outlineOffset: on ? 2 : 0,
                    opacity: on ? 1 : 0.72,
                    background: project.brand.surface,
                  }}
                >
                  <Image src={project.shots[r.path].src} alt="" fill sizes="128px" className="object-cover object-top" />
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-semibold">{ui.dossier.routes}</h3>
            <p className="hidden text-xs sm:block" style={{ color: "var(--pf-ink-3)" }}>{ui.dossier.routesHint}</p>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {groups.map(({ g, routes }) => (
              <div key={g} className="flex flex-wrap items-center gap-2">
                <span className="pf-kicker w-20 shrink-0" style={{ letterSpacing: "0.14em" }}>{routeGroupLabel(g, locale)}</span>
                {routes.map((r) => {
                  const on = r.path === route.path;
                  const shot = project.shots[r.path];
                  if (!shot) {
                    return (
                      <span
                        key={r.path}
                        className="inline-flex min-h-[34px] items-center gap-2 rounded-md px-2.5"
                        style={{ border: "1px dashed var(--pf-line)", color: "var(--pf-ink-3)" }}
                      >
                        <code className="pf-mono">{r.path}</code>
                        <span className="text-xs">{r.label}</span>
                      </span>
                    );
                  }
                  return (
                    <PressButton
                      key={r.path}
                      onMouseEnter={() => pick(r)}
                      onFocus={() => pick(r)}
                      onClick={() => pick(r)}
                      aria-pressed={on}
                      className="inline-flex min-h-[34px] items-center gap-2 rounded-md px-2.5 transition-colors duration-300"
                      style={{
                        background: on ? `${project.brand.primary}22` : "rgba(242,243,245,0.04)",
                        border: `1px solid ${on ? project.brand.primary : "var(--pf-line)"}`,
                        color: on ? "var(--pf-ink)" : "var(--pf-ink-2)",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: shot.kind === "live" ? "#6cc4a3" : "#dcaa4a" }} aria-hidden />
                      <code className="pf-mono" style={{ color: on ? project.brand.primary : "var(--pf-ink-3)" }}>{r.path}</code>
                      <span className="text-xs">{r.label}</span>
                    </PressButton>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Texto */}
      <div className="flex flex-col gap-7 lg:col-span-5">
        {!compact ? (
          <p className="text-base leading-relaxed" style={{ color: "var(--pf-ink-2)" }}>{project.description}</p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt className="pf-kicker" style={{ letterSpacing: "0.14em" }}>{ui.dossier.client}</dt><dd className="mt-1">{project.client ?? "Pime Panamá"}</dd></div>
          <div><dt className="pf-kicker" style={{ letterSpacing: "0.14em" }}>{ui.dossier.industry}</dt><dd className="mt-1">{project.industry}</dd></div>
          <div><dt className="pf-kicker" style={{ letterSpacing: "0.14em" }}>{ui.dossier.years}</dt><dd className="mt-1 tabular-nums">{projectYears(project)}</dd></div>
          <div><dt className="pf-kicker" style={{ letterSpacing: "0.14em" }}>{ui.dossier.status}</dt><dd className="mt-1"><StatusDot status={project.status} label={project.statusLabel} /></dd></div>
          <div className="col-span-2"><dt className="pf-kicker" style={{ letterSpacing: "0.14em" }}>{ui.dossier.level}</dt><dd className="mt-1 flex items-center gap-2"><LevelMeter level={project.complexity} label={project.complexityLabel} /> {project.complexityLabel} <span style={{ color: "var(--pf-ink-3)" }}>· {project.complexityHint}</span></dd></div>
        </dl>

        <div>
          <h3 className="text-sm font-semibold">{ui.dossier.features}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {project.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--pf-ink-2)" }}>
                <span className="mt-[9px] h-1 w-3 shrink-0 rounded-full" style={{ background: project.brand.primary }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{ui.dossier.stack}</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <li key={s} className="pf-mono rounded-md px-2 py-1" style={{ background: "rgba(242,243,245,0.05)", border: "1px solid var(--pf-line)", color: "var(--pf-ink-2)" }}>{s}</li>
            ))}
          </ul>
          {project.variants?.length ? (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--pf-ink-3)" }}>
              {ui.dossier.variants}: {project.variants.join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {project.liveUrl ? (
            <motion.a href={project.liveUrl} target="_blank" rel="noopener noreferrer" {...pressFirm} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.18em] transition hover:brightness-110" style={{ background: "var(--pf-accent)", color: "var(--pf-accent-ink)" }}>
              {ui.dossier.live}
              <Icon icon="ph:arrow-up-right" className="h-3.5 w-3.5" />
            </motion.a>
          ) : null}
          {project.demoUrl ? (
            <PressLink href={project.demoUrl} strength="firm" className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-white/10" style={{ border: "1px solid var(--pf-line-2)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#6cc4a3" }} />
              {ui.dossier.demo}
            </PressLink>
          ) : null}
          {compact ? (
            <PressLink href={project.href} strength="firm" className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-white/10" style={{ border: "1px solid var(--pf-line-2)" }}>
              {ui.dossier.detail}
              <Icon icon="ph:arrow-right" className="h-3.5 w-3.5" />
            </PressLink>
          ) : null}
        </div>
      </div>

      {/* Actividad */}
      <div className="lg:col-span-12">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-semibold">{ui.dossier.metrics}</h3>
          <p className="text-xs" style={{ color: "var(--pf-ink-3)" }}>{ui.dossier.metricsNote}</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {series.map((s, i) => (
            <div key={s.spec.key} className="rounded-xl p-5" style={{ background: "rgba(242,243,245,0.03)", border: "1px solid var(--pf-line)" }}>
              <MiniChart series={s} index={i} height={96} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
