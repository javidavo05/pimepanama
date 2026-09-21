"use client";

import { useEffect, useState } from "react";

export interface ProgressStep {
  key: string;
  label: string;
}

interface StageProgressProps {
  steps: readonly ProgressStep[];
  /** Índice de la etapa en curso (o de la que falló). */
  current: number;
  /** Cuándo arrancó el análisis, para el cronómetro. */
  startedAt: number;
  failed?: boolean;
}

function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Avance del análisis de una reunión, etapa por etapa.
 *
 * Cada etapa es un pedido al servidor que no informa su porcentaje, así que la
 * barra no inventa uno: las etapas terminadas se llenan, la que está corriendo
 * lleva un tramo en movimiento y el cronómetro confirma que sigue viva. Una
 * minuta de una reunión larga puede tardar minutos esperando turno en OpenAI.
 */
export function StageProgress({ steps, current, startedAt, failed = false }: StageProgressProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (failed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [failed]);

  const step = steps[current];

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={steps.length}
      aria-valuenow={current}
      aria-valuetext={`${failed ? "Falló" : "Paso"} ${current + 1} de ${steps.length}: ${step?.label ?? ""}`}
      className="w-full"
    >
      <div className="flex items-baseline justify-between gap-4 mb-2 text-xs">
        <span className={failed ? "text-danger" : "text-fg-soft"}>
          <span className="text-fg-ghost">
            Paso {current + 1} de {steps.length} ·{" "}
          </span>
          {failed ? `Falló: ${step?.label.toLowerCase()}` : `${step?.label}…`}
        </span>
        {!failed && <span className="text-fg-ghost tabular-nums shrink-0">{elapsed(now - startedAt)}</span>}
      </div>

      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s.key} className="relative h-2 flex-1 overflow-hidden rounded-full bg-fill">
            {i < current && <div className="absolute inset-0 bg-brand" />}
            {i === current && failed && <div className="absolute inset-0 bg-danger" />}
            {i === current && !failed && (
              <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-brand motion-safe:animate-progress-sweep motion-reduce:w-full motion-reduce:bg-brand/40" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
