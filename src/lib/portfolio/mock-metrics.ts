import type { MetricSpec } from "./types";

/**
 * Series ilustrativas para las gráficas del portfolio.
 *
 * No son datos reales de ningún cliente: se generan de forma determinista a
 * partir del slug para que servidor y cliente dibujen exactamente lo mismo y
 * el número no cambie entre visitas. La UI las etiqueta como simuladas.
 */

export const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MetricPoint = { label: string; value: number };

export type MetricSeries = {
  spec: MetricSpec;
  points: MetricPoint[];
  /** Último valor de la serie. */
  current: number;
  /** Variación del último mes frente al anterior, en fracción. */
  delta: number;
};

export function buildSeries(slug: string, spec: MetricSpec): MetricSeries {
  const rand = mulberry32(hash(`${slug}:${spec.key}`));
  const points: MetricPoint[] = [];
  let value = spec.base * (0.55 + rand() * 0.15);
  for (let i = 0; i < 12; i++) {
    const noise = (rand() - 0.5) * 0.18;
    value = value * (1 + spec.growth + noise);
    points.push({ label: MONTHS[i], value: Math.max(0, Math.round(value)) });
  }
  const last = points[11].value;
  const prev = points[10].value || 1;
  return { spec, points, current: last, delta: (last - prev) / prev };
}

export function buildAllSeries(slug: string, specs: MetricSpec[]): MetricSeries[] {
  return specs.map((spec) => buildSeries(slug, spec));
}

export function formatMetric(value: number, unit: string): string {
  if (unit === "USD") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)} M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)} k`;
    return `$${value}`;
  }
  if (unit === "%") return `${value} %`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(0)} k`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return `${value}`;
}
