"use client";

import { useId, useRef, useState } from "react";
import { useInView } from "framer-motion";
import type { MetricSeries } from "@/lib/portfolio/mock-metrics";
import { formatMetric } from "@/lib/portfolio/mock-metrics";

/**
 * Gráfica SVG mínima: área o barras, trazo que se dibuja al entrar en vista,
 * tooltip por punto. Los colores son los del método de dataviz para fondo
 * oscuro: azul de serie 1 (#3987e5) y ámbar de serie 4 (#c98500).
 */
const SERIES_COLORS = ["#3987e5", "#c98500", "#199e70", "#d95926"];

export function MiniChart({
  series,
  index = 0,
  height = 88,
  compact = false,
}: {
  series: MetricSeries;
  index?: number;
  height?: number;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();
  const color = SERIES_COLORS[index % SERIES_COLORS.length];

  const values = series.points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const W = 240;
  const H = 100;
  const padY = 8;
  const y = (v: number) => H - padY - ((v - min) / (max - min || 1)) * (H - padY * 2);
  const x = (i: number) => (i / (values.length - 1)) * W;

  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const active = hover ?? values.length - 1;
  const delta = series.delta;

  return (
    <div ref={ref} className={`group/chart ${inView ? "pf-live" : ""}`}>
      {!compact ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="pf-kicker truncate" style={{ letterSpacing: "0.14em" }}>{series.spec.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {formatMetric(series.points[active].value, series.spec.unit)}
              <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--pf-ink-3)" }}>{series.spec.unit !== "USD" && series.spec.unit !== "%" ? series.spec.unit : ""}</span>
            </p>
          </div>
          <p className="pf-mono shrink-0 tabular-nums" style={{ color: delta >= 0 ? "#6cc4a3" : "#e08a7f" }}>
            {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)} %
          </p>
        </div>
      ) : null}
      <div
        className="relative"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - rect.left) / rect.width) * (values.length - 1));
          setHover(Math.max(0, Math.min(values.length - 1, i)));
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label={`${series.spec.label}: ${series.points.map((p) => `${p.label} ${p.value}`).join(", ")}`}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {series.spec.form === "area" ? (
            <>
              <path d={areaPath} fill={`url(#${gradId})`} className="pf-block" />
              <path d={linePath} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pathLength={1} className="pf-draw" />
            </>
          ) : (
            values.map((v, i) => {
              const bw = (W / values.length) * 0.62;
              const bx = x(i) - bw / 2;
              const by = y(v);
              return (
                <rect key={i} x={Math.max(0, Math.min(W - bw, bx))} y={by} width={bw} height={H - by} rx={2} fill={i === active ? color : `${color}88`} className="pf-grow" style={{ animationDelay: `${i * 45}ms` }} />
              );
            })
          )}
          {series.spec.form === "area" ? (
            <g style={{ opacity: inView ? 1 : 0, transition: "opacity 0.4s 1.2s" }}>
              <line x1={x(active)} x2={x(active)} y1={0} y2={H} stroke="rgba(242,243,245,0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <circle cx={x(active)} cy={y(values[active])} r={4} fill={color} stroke="var(--pf-bg)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </g>
          ) : null}
        </svg>
        <div
          className="pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2 py-1 text-[0.7rem] tabular-nums transition-opacity"
          style={{
            left: `${(active / (values.length - 1)) * 100}%`,
            background: "#1a1f28",
            border: "1px solid var(--pf-line-2)",
            color: "var(--pf-ink)",
            opacity: hover === null ? 0 : 1,
          }}
        >
          <span style={{ color: "var(--pf-ink-3)" }}>{series.points[active].label}</span> {formatMetric(series.points[active].value, series.spec.unit)}
        </div>
      </div>
      {!compact ? (
        <div className="mt-1 flex justify-between pf-mono" style={{ color: "var(--pf-ink-3)", fontSize: "0.6rem" }}>
          <span>{series.points[0].label}</span>
          <span>{series.points[6].label}</span>
          <span>{series.points[11].label}</span>
        </div>
      ) : null}
    </div>
  );
}
