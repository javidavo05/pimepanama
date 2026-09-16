"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@iconify/react";
import type { ComplexityTier, LocalizedProject } from "@/lib/portfolio/localize";
import { categoryLabel, complexityLabel, shotFor, statusLabel } from "@/lib/portfolio/localize";
import { buildSeries } from "@/lib/portfolio/mock-metrics";
import type { Locale } from "@/lib/i18n";
import type { ProjectCategory, ProjectStatus } from "@/lib/portfolio/types";
import type { EngineUi } from "./i18n";
import { MiniChart } from "./mini-chart";
import { ProjectDossier } from "./project-dossier";
import { heroRoute } from "./showreel";
import { SiteWindow } from "./site-window";
import { Chip, Kicker, LevelMeter, PressButton, Reveal, StatusDot, hostOf, projectYears } from "./ui";

const CATEGORIES: ProjectCategory[] = ["saas", "plataforma", "ecommerce", "sitio", "herramienta", "juego", "legacy", "propuesta"];
const STATUSES: ProjectStatus[] = ["produccion", "beta", "construccion", "prototipo", "interno", "legacy", "propuesta"];
const TIERS: ComplexityTier[] = [1, 2, 3, 4, 5];
const RECENT_KEY = "pf-recent-searches";
const SUGGESTIONS = ["Supabase", "Yappy", "Next.js", "Apps Script", "multi-tenant", "PWA", "/dashboard", "Electron"];

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matches(p: LocalizedProject, q: string): boolean {
  if (!q) return true;
  const hay = normalize([p.name, p.client ?? "", p.industry, p.tagline, p.categoryLabel, p.statusLabel, ...p.stack, ...p.routes.map((r) => `${r.path} ${r.label}`), ...p.features].join(" "));
  return q.split(/\s+/).every((w) => hay.includes(normalize(w)));
}

/**
 * Archivo: buscador con sugerencias, filtros por tipo, estado y nivel, y
 * tarjetas cuya ventana despierta al pasar el cursor. Cada tarjeta abre su
 * dossier en su lugar, ocupando todo el ancho.
 */
export function ArchiveGrid({ projects, ui, locale }: { projects: LocalizedProject[]; ui: EngineUi; locale: Locale }) {
  const reduce = useReducedMotion();
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [cat, setCat] = useState<ProjectCategory | "all">("all");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [tier, setTier] = useState<ComplexityTier | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [focus, setFocus] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* sin storage */
    }
  }, []);

  const commit = (term: string) => {
    setQ(term);
    setFocus(false);
    if (!term.trim()) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* sin storage */
    }
  };

  const filtered = useMemo(
    () => projects.filter((p) => (cat === "all" || p.category === cat) && (status === "all" || p.status === status) && (tier === "all" || p.complexity === tier) && matches(p, dq)),
    [projects, cat, status, tier, dq],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of projects) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [projects]);

  const dirty = q || cat !== "all" || status !== "all" || tier !== "all";
  const clear = () => {
    setQ("");
    setCat("all");
    setStatus("all");
    setTier("all");
  };

  return (
    <section id="archivo" className="mx-auto max-w-7xl px-6 py-24 sm:px-8" aria-labelledby="pf-archive-title">
      <Reveal>
        <Kicker accent>{ui.archive.kicker}</Kicker>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h2 id="pf-archive-title" className="pf-display text-[clamp(2.4rem,5vw,4.5rem)]">{ui.archive.title}</h2>
          <p className="pf-mono tabular-nums" style={{ color: "var(--pf-ink-3)" }} aria-live="polite">{ui.archive.results(filtered.length)}</p>
        </div>
      </Reveal>

      {/* Consola de filtros */}
      <div className="mt-10 flex flex-col gap-4">
        <div className="relative">
          <div className="flex min-h-[52px] items-center gap-3 rounded-xl px-4" style={{ background: "rgba(242,243,245,0.04)", border: `1px solid ${focus ? "var(--pf-accent)" : "var(--pf-line-2)"}`, transition: "border-color 0.3s" }}>
            <Icon icon="ph:magnifying-glass" className="h-4 w-4 shrink-0" style={{ color: "var(--pf-ink-3)" }} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setTimeout(() => setFocus(false), 120)}
              onKeyDown={(e) => e.key === "Enter" && commit(q)}
              placeholder={ui.archive.search}
              aria-label={ui.archive.search}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[rgba(242,243,245,0.4)]"
            />
            {q ? (
              <PressButton onClick={() => setQ("")} aria-label={ui.archive.clear} strength="firm" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
                <Icon icon="ph:x" className="h-3.5 w-3.5" />
              </PressButton>
            ) : null}
          </div>
          <AnimatePresence>
            {focus && !q ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl p-4"
                style={{ background: "#151a22", border: "1px solid var(--pf-line-2)", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.8)" }}
              >
                {recent.length ? (
                  <div className="mb-3">
                    <p className="pf-kicker mb-2" style={{ letterSpacing: "0.14em" }}>{ui.archive.recent}</p>
                    <div className="flex flex-wrap gap-2">{recent.map((r) => <Chip key={r} onClick={() => commit(r)}>{r}</Chip>)}</div>
                  </div>
                ) : null}
                <p className="pf-kicker mb-2" style={{ letterSpacing: "0.14em" }}>{ui.archive.suggestions}</p>
                <div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <Chip key={s} onClick={() => commit(s)}>{s}</Chip>)}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="pf-kicker mr-1 w-14" style={{ letterSpacing: "0.14em" }}>{ui.archive.category}</span>
          <Chip active={cat === "all"} onClick={() => setCat("all")}>{ui.archive.all} <span className="opacity-60">{projects.length}</span></Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? "all" : c)}>
              {categoryLabel(c, locale)} <span className="opacity-60">{counts[c] ?? 0}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pf-kicker mr-1 w-14" style={{ letterSpacing: "0.14em" }}>{ui.archive.status}</span>
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(status === s ? "all" : s)}>{statusLabel(s, locale)}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pf-kicker mr-1 w-14" style={{ letterSpacing: "0.14em" }}>{ui.archive.complexity}</span>
          {TIERS.map((t) => (
            <Chip key={t} active={tier === t} onClick={() => setTier(tier === t ? "all" : t)} title={complexityLabel(t, locale)}>
              <LevelMeter level={t} size={9} /> 0{t}
            </Chip>
          ))}
          {dirty ? (
            <PressButton onClick={clear} className="ml-auto inline-flex min-h-[32px] items-center gap-1 text-xs underline-offset-4 hover:underline" style={{ color: "var(--pf-accent)" }}>
              <Icon icon="ph:arrow-counter-clockwise" className="h-3.5 w-3.5" />
              {ui.archive.clear}
            </PressButton>
          ) : null}
        </div>
      </div>

      {/* Grilla */}
      <LayoutGroup>
        <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((p, i) => (
              <Tile key={p.slug} project={p} index={i} ui={ui} locale={locale} open={open === p.slug} onToggle={() => setOpen(open === p.slug ? null : p.slug)} />
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-xl p-10 text-center" style={{ border: "1px dashed var(--pf-line-2)" }}>
          <p className="text-lg font-semibold">{ui.archive.empty}</p>
          <p className="mt-2 text-sm" style={{ color: "var(--pf-ink-2)" }}>{ui.archive.emptyHint}</p>
          <PressButton onClick={clear} strength="firm" className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ background: "var(--pf-accent)", color: "var(--pf-accent-ink)" }}>
            {ui.archive.clear}
          </PressButton>
        </div>
      ) : null}
    </section>
  );
}

function Tile({ project: p, index, ui, locale, open, onToggle }: { project: LocalizedProject; index: number; ui: EngineUi; locale: Locale; open: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [route, setRoute] = useState(heroRoute(p));
  const spark = useMemo(() => buildSeries(p.slug, p.metrics[0]), [p.slug, p.metrics]);
  const live = hover || open;

  return (
    <motion.article
      layout
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl ${open ? "sm:col-span-2 lg:col-span-3" : ""}`}
      style={{ background: "rgba(242,243,245,0.03)", border: `1px solid ${live ? "var(--pf-line-2)" : "var(--pf-line)"}`, transition: "border-color 0.3s" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <motion.div layout="position" className="flex flex-col">
        <motion.button type="button" onClick={onToggle} aria-expanded={open} className="text-left" data-cursor="grow" whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: "spring", stiffness: 520, damping: 28 }}>
          <div className={`relative overflow-hidden p-3 pb-0 ${open ? "hidden" : "aspect-[16/10]"}`}>
            <motion.div animate={{ scale: live ? 1.015 : 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="h-full">
              <SiteWindow brand={p.brand} screen={route.screen} path={route.path} host={hostOf(p)} live={live} showCursor={!open} className="h-full w-full" radius={10} image={shotFor(p, route.path)} />
            </motion.div>
            <span className="pf-mono absolute right-5 top-5 rounded-md px-1.5 py-0.5 tabular-nums" style={{ background: "rgba(12,15,20,0.7)", color: "var(--pf-ink-2)", backdropFilter: "blur(6px)" }}>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="flex flex-col gap-2 p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="pf-display text-2xl" style={{ letterSpacing: "-0.02em" }}>{p.name}</h3>
              <LevelMeter level={p.complexity} label={p.complexityLabel} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--pf-ink-2)" }}>{p.tagline}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--pf-ink-3)" }}>
              <StatusDot status={p.status} label={p.statusLabel} />
              <span>{p.categoryLabel}</span>
              <span>{p.industry}</span>
              <span className="tabular-nums">{projectYears(p)}</span>
            </div>
          </div>
        </motion.button>

        {!open ? (
          <div className="flex flex-col gap-3 px-5 pb-5">
            <div className="flex flex-wrap gap-1.5" onMouseLeave={() => setRoute(heroRoute(p))}>
              {[...p.routes].sort((a, b) => Number(Boolean(p.shots[b.path])) - Number(Boolean(p.shots[a.path]))).slice(0, 4).map((r) => (
                <PressButton key={r.path} onMouseEnter={() => setRoute(r)} onFocus={() => setRoute(r)} onClick={() => setRoute(r)} aria-pressed={route.path === r.path} className="pf-mono rounded-md px-2 py-1 transition-colors" style={{ background: route.path === r.path ? `${p.brand.primary}22` : "rgba(242,243,245,0.04)", border: `1px solid ${route.path === r.path ? p.brand.primary : "var(--pf-line)"}`, color: "var(--pf-ink-2)" }}>
                  {r.path}
                </PressButton>
              ))}
              {p.routes.length > 4 ? <span className="pf-mono self-center" style={{ color: "var(--pf-ink-3)" }}>+{p.routes.length - 4}</span> : null}
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="pf-kicker truncate" style={{ letterSpacing: "0.12em" }}>{spark.spec.label}</p>
                <div className="mt-1 h-9"><MiniChart series={spark} index={0} height={36} compact /></div>
              </div>
              <PressButton onClick={onToggle} strength="firm" aria-expanded={open} className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full px-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-white/10" style={{ border: "1px solid var(--pf-line-2)" }}>
                {ui.archive.expand}
                <Icon icon="ph:arrows-out-simple" className="h-3.5 w-3.5" />
              </PressButton>
            </div>
          </div>
        ) : null}
      </motion.div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="dossier"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 pt-2 sm:px-6">
              <ProjectDossier project={p} ui={ui} locale={locale} compact />
              <div className="mt-8 flex justify-end">
                <PressButton onClick={onToggle} strength="firm" aria-expanded={open} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-white/10" style={{ border: "1px solid var(--pf-line-2)" }}>
                  {ui.archive.collapse}
                  <Icon icon="ph:arrows-in-simple" className="h-3.5 w-3.5" />
                </PressButton>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}
