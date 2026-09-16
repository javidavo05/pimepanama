"use client";

import { useMemo, useRef, useState } from "react";
import { useInView } from "framer-motion";
import type { LocalizedProject } from "@/lib/portfolio/localize";
import { complexityLabel } from "@/lib/portfolio/localize";
import { getCatalogStats, projectsByYear, topStack } from "@/lib/portfolio/catalog";
import type { Locale } from "@/lib/i18n";
import type { EngineUi } from "./i18n";
import { CountUp, Kicker, Reveal } from "./ui";

/** Cifras y gráficas derivadas del catálogo real, no simuladas. */
export function EngineAnalytics({ projects, ui, locale }: { projects: LocalizedProject[]; ui: EngineUi; locale: Locale }) {
  const stats = useMemo(() => getCatalogStats(), []);
  const years = useMemo(() => projectsByYear(), []);
  const stack = useMemo(() => topStack(8), []);
  const byLevel = [1, 2, 3, 4, 5].map((t) => ({ t, n: projects.filter((p) => p.complexity === t).length }));
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects) m.set(p.categoryLabel, (m.get(p.categoryLabel) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const tiles = [
    { v: stats.total, l: ui.analytics.total },
    { v: stats.inProduction, l: ui.analytics.production },
    { v: stats.live, l: ui.analytics.live },
    { v: stats.routes, l: ui.analytics.routes },
    { v: stats.industries, l: ui.analytics.industries },
    { v: stats.stacks, l: ui.analytics.stacks },
  ];

  return (
    <section className="relative overflow-hidden py-24 sm:py-32" style={{ background: "var(--pf-bg-2)", borderTop: "1px solid var(--pf-line)", borderBottom: "1px solid var(--pf-line)" }} aria-labelledby="pf-analytics-title">
      <div className="pf-ghost absolute -right-[4vw] -top-[6vw] text-[26vw]" aria-hidden>{String(stats.total)}</div>
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <Reveal>
          <Kicker accent>{ui.analytics.kicker}</Kicker>
          <h2 id="pf-analytics-title" className="pf-display mt-5 text-[clamp(2.4rem,5vw,4.5rem)]">{ui.analytics.title}</h2>
          <p className="mt-3 text-xs" style={{ color: "var(--pf-ink-3)" }}>{ui.analytics.note}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:grid-cols-3 lg:grid-cols-6" style={{ background: "var(--pf-line)", border: "1px solid var(--pf-line)" }}>
          {tiles.map((t, i) => (
            <Reveal key={t.l} delay={i * 0.05} className="flex flex-col gap-2 p-6" >
              <div style={{ background: "var(--pf-bg-2)" }} className="-m-6 p-6">
                <p className="pf-display text-4xl sm:text-5xl" style={{ letterSpacing: "-0.03em" }}><CountUp value={t.v} /></p>
                <p className="mt-2 text-xs" style={{ color: "var(--pf-ink-3)" }}>{t.l}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Panel title={ui.analytics.byYear}>
            <YearBars data={years} />
          </Panel>
          <Panel title={ui.analytics.byStack}>
            <HBars data={stack.map((s) => ({ label: s.name, value: s.count }))} />
          </Panel>
          <Panel title={ui.analytics.byLevel}>
            <HBars data={byLevel.map((b) => ({ label: `0${b.t} · ${complexityLabel(b.t as 1 | 2 | 3 | 4 | 5, locale)}`, value: b.n }))} />
          </Panel>
        </div>

        <Panel title={ui.analytics.byCategory} className="mt-6">
          <Segments data={byCategory} />
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Reveal className={className}>
      <div className="h-full rounded-2xl p-6" style={{ background: "rgba(242,243,245,0.03)", border: "1px solid var(--pf-line)" }}>
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="mt-5">{children}</div>
      </div>
    </Reveal>
  );
}

function useOn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const on = useInView(ref, { once: true, margin: "-40px" });
  return { ref, on };
}

function YearBars({ data }: { data: { year: number; count: number }[] }) {
  const { ref, on } = useOn();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div ref={ref} className="flex h-44 items-end gap-3" role="img" aria-label={data.map((d) => `${d.year}: ${d.count}`).join(", ")}>
      {data.map((d, i) => (
        <div key={d.year} className="flex flex-1 flex-col items-center gap-2" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <span className="pf-mono tabular-nums transition-opacity" style={{ color: "var(--pf-ink)", opacity: hover === i ? 1 : 0.5 }}>{d.count}</span>
          <div
            className="w-full rounded-t-[4px]"
            style={{
              height: `${(d.count / max) * 120}px`,
              background: hover === i ? "#3987e5" : "#256abf",
              transformOrigin: "bottom",
              transform: on ? "scaleY(1)" : "scaleY(0)",
              transition: `transform 0.9s var(--pf-ease) ${i * 0.1}s, background 0.2s`,
            }}
          />
          <span className="pf-mono tabular-nums" style={{ color: "var(--pf-ink-3)" }}>{d.year}</span>
        </div>
      ))}
    </div>
  );
}

function HBars({ data }: { data: { label: string; value: number }[] }) {
  const { ref, on } = useOn<HTMLUListElement>();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul ref={ref} className="flex flex-col gap-2.5" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3 text-xs">
          <span className="truncate" style={{ color: "var(--pf-ink-2)" }}>{d.label}</span>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(242,243,245,0.06)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: "#3987e5",
                transformOrigin: "left",
                transform: on ? "scaleX(1)" : "scaleX(0)",
                transition: `transform 0.9s var(--pf-ease) ${i * 0.06}s`,
              }}
            />
          </div>
          <span className="pf-mono text-right tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Segments({ data }: { data: [string, number][] }) {
  const { ref, on } = useOn();
  const total = data.reduce((n, [, v]) => n + v, 0);
  const steps = ["#0d366b", "#184f95", "#256abf", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef", "#9ec5f4"];
  return (
    <div ref={ref}>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
        {data.map(([label, v], i) => (
          <div
            key={label}
            title={`${label}: ${v}`}
            style={{
              width: `${(v / total) * 100}%`,
              background: steps[i % steps.length],
              transformOrigin: "left",
              transform: on ? "scaleX(1)" : "scaleX(0)",
              transition: `transform 0.8s var(--pf-ease) ${i * 0.05}s`,
            }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {data.map(([label, v], i) => (
          <li key={label} className="flex items-center gap-2" style={{ color: "var(--pf-ink-2)" }}>
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: steps[i % steps.length] }} />
            {label} <span className="pf-mono tabular-nums" style={{ color: "var(--pf-ink-3)" }}>{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
