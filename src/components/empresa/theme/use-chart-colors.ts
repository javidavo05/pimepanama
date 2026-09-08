"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

/**
 * Colores de gráfico resueltos desde los tokens del tema.
 *
 * Recharts pinta con atributos de presentación SVG (`fill`, `stroke`), que no
 * resuelven `var(--…)`. Así que en vez de pasarle una clase le pasamos el valor
 * ya calculado, y lo recalculamos cuando cambia el tema.
 *
 * Antes esto era blanco fijo: perfecto sobre el panel negro e
 * invisible sobre el claro.
 */
export interface ChartColors {
  /** Rejilla de fondo — apenas visible, sólo para guiar el ojo. */
  grid: string;
  /** Etiquetas de los ejes. */
  tick: string;
  /** Etiquetas del eje de valores, un punto más tenues que las del eje X. */
  tickMuted: string;
  /** Relleno de la barra bajo el cursor. */
  cursor: string;
  /** Texto de la leyenda. */
  legend: string;
  /** Serie principal. */
  primary: string;
  /** Serie secundaria. */
  secondary: string;
}

// theme-ok: red de seguridad si las variables no se pueden leer (SSR, pruebas);
// el camino normal las resuelve en resolve(). Ver useChartColors.
const FALLBACK: ChartColors = {
  grid: "rgb(226 230 236 / 0.6)",
  tick: "rgb(97 109 126)",
  tickMuted: "rgb(108 117 132)",
  cursor: "rgb(15 23 42 / 0.04)",
  legend: "rgb(74 85 103)",
  primary: "rgb(15 118 178)",
  secondary: "rgb(19 118 56)",
};

function readVar(name: string, alpha?: number): string | null {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return null;
  return alpha === undefined ? `rgb(${raw})` : `rgb(${raw} / ${alpha})`;
}

function resolve(): ChartColors {
  const grid = readVar("--c-line");
  const tick = readVar("--c-fg-faint");
  const tickMuted = readVar("--c-fg-ghost");
  const cursor = readVar("--c-fg", 0.05);
  const legend = readVar("--c-fg-dim");
  const primary = readVar("--c-brand");
  const secondary = readVar("--c-ok");
  if (!grid || !tick || !tickMuted || !cursor || !legend || !primary || !secondary) return FALLBACK;
  return { grid, tick, tickMuted, cursor, legend, primary, secondary };
}

export function useChartColors(): ChartColors {
  const { resolved } = useTheme();
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  // Depende de `resolved` a propósito: es la señal de que <html data-theme>
  // ya cambió y las variables tienen valores nuevos que leer.
  useEffect(() => {
    setColors(resolve());
  }, [resolved]);

  return colors;
}
