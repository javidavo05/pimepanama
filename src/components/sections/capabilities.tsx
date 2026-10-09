"use client";
// Capacidades. Origen: la página "El sistema en detalle" de la propuesta (tabla de módulos con pills de fase)
// y las tarjetas de arquitectura. Sección sticky: al hacer scroll cambia la capacidad activa y la pantalla
// de la derecha se transforma (cross-fade + cambio de layout). Un solo IntersectionObserver propio.
import { useEffect, useRef, useState } from "react";
import { Eyebrow, Lines, Pill } from "@/components/ui/primitives";
import { EscenaCRM, EscenaERP, EscenaIA, EscenaPortal, EscenaSaaS } from "./capability-scenes";
import { CAPACIDADES } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./capabilities.css";

const ESCENAS = [EscenaERP, EscenaCRM, EscenaSaaS, EscenaPortal, EscenaIA];

export function Capabilities({ lang }: { lang: Lang }) {
  const c = CAPACIDADES[lang];
  const [activa, setActiva] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current; if (!root) return;
    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiva(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <section className="capsec" id="capacidades" data-motion="sticky-morph" aria-labelledby="caps-title">
      <div className="wrap caps-head">
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <Lines as="h2" className="t-1" lines={c.titulo} />
        <span id="caps-title" className="sr-only">{c.titulo.join(" ")}</span>
        <p className="lead" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{c.bajada}</p>
      </div>
      <div className="wrap caps-grid" ref={ref}>
        <ol className="caps-steps">
          {c.items.map((it, i) => (
            <li key={it.id} className="caps-step" data-step={i} aria-current={activa === i ? "step" : undefined}>
              <button type="button" className="caps-step-btn" onClick={() => document.querySelector<HTMLElement>(`[data-step="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                <span className="caps-n num">{it.n}</span>
                <span className="caps-t">{it.titulo}</span>
              </button>
              <p className="caps-apoyo">{it.apoyo}</p>
              <div className="caps-mods">{it.modulos.map((m) => <Pill key={m} variant="ghost">{m}</Pill>)}</div>
              <div className="caps-scene-inline">
                {(() => { const E = ESCENAS[i]; return <E lang={lang} />; })()}
              </div>
            </li>
          ))}
        </ol>
        <div className="caps-sticky">
          <div className="caps-frame">
            <div className="caps-frame-bar">
              <span className="hw-logo" /><span className="caps-frame-t">{c.items[activa].titulo}</span>
              <span className="caps-dots" aria-hidden="true">{c.items.map((_, i) => <i key={i} className={i === activa ? "on" : ""} />)}</span>
            </div>
            <div className="caps-scenes">
              {ESCENAS.map((E, i) => (
                <div className="caps-scene" key={i} data-on={i === activa || undefined} aria-hidden={i !== activa} inert={i !== activa}>
                  <E lang={lang} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
