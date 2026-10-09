// Proceso. Origen: "Cómo comenzamos" (pasos en círculos) y la tarjeta de fase de la propuesta. Una línea
// vertical se dibuja con el scroll (stroke-dashoffset ligado a scroll-timeline) y cada paso se enciende al
// cruzarla; sin soporte de scroll-timeline la línea aparece dibujada y los pasos entran con el revelado común.
import { Eyebrow, Lines, NumChip, Pill } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PROCESO } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./process.css";

export function Process({ lang }: { lang: Lang }) {
  const p = PROCESO[lang];
  return (
    <section className="pr" id="proceso" data-motion="draw-path" aria-labelledby="pr-title">
      <div className="wrap pr-in">
        <header className="pr-head">
          <Eyebrow>{p.eyebrow}</Eyebrow>
          <Lines as="h2" className="t-1" lines={p.titulo} />
          <span id="pr-title" className="sr-only">{p.titulo.join(" ")}</span>
          <p className="lead" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{p.bajada}</p>
        </header>
        <ol className="pr-steps">
          <svg className="pr-line" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="1" y1="0" x2="1" y2="100" className="pr-line-bg" />
            <line x1="1" y1="0" x2="1" y2="100" className="pr-line-fg" pathLength={1} />
          </svg>
          {p.pasos.map((s, i) => (
            <li key={s.titulo} className="pr-step" data-reveal="rise" style={{ "--delay": `${i * 70}ms` } as React.CSSProperties}>
              <span className="pr-dot" aria-hidden="true" />
              <div className="pr-chip"><NumChip n={i + 1} /></div>
              <div className="pr-body">
                <h3 className="pr-t">{s.titulo}</h3>
                <p className="pr-x">{s.texto}</p>
                <Pill variant="ghost">{s.marca}</Pill>
              </div>
            </li>
          ))}
        </ol>
        <div className="pr-close" data-theme="ink">
          {p.cierre.map((c, i) => (
            <article key={c.titulo} className="pr-card" data-reveal="rise" style={{ "--delay": `${i * 90}ms` } as React.CSSProperties}>
              <h3 className="t-2">{c.titulo}</h3>
              <p className="pr-card-x">{c.texto}</p>
              <ul className="pr-pills">{c.pills.map((x) => <li key={x}><Pill variant="soft">{x}</Pill></li>)}</ul>
            </article>
          ))}
          <div className="pr-cta" data-reveal="rise" style={{ "--delay": "180ms" } as React.CSSProperties}>
            <Button href={p.cta.href} variant="accent" arrow>{p.cta.label}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
