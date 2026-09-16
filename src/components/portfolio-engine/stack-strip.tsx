"use client";

import { useMemo } from "react";
import { topStack } from "@/lib/portfolio/catalog";
import type { EngineUi } from "./i18n";

/** Cinta con las tecnologías más repetidas; se pausa al posar el cursor. */
export function StackStrip({ ui }: { ui: EngineUi }) {
  const items = useMemo(() => topStack(16), []);
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden py-8" style={{ borderTop: "1px solid var(--pf-line)", borderBottom: "1px solid var(--pf-line)" }} aria-label={ui.stackStrip.kicker}>
      <div className="pf-marquee gap-10" style={{ ["--pf-marquee-duration" as string]: "48s" }}>
        {row.map((s, i) => (
          <span key={`${s.name}-${i}`} className="flex shrink-0 items-center gap-4" aria-hidden={i >= items.length}>
            <span className="pf-display text-3xl sm:text-4xl" style={{ color: i % 2 ? "var(--pf-ink)" : "transparent", WebkitTextStroke: i % 2 ? "0" : "1px rgba(242,243,245,0.5)", letterSpacing: "-0.02em" }}>{s.name}</span>
            <span className="pf-mono tabular-nums" style={{ color: "var(--pf-accent)" }}>×{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
