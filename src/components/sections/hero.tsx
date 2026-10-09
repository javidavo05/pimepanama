// Hero. Concepto: la pantalla es el producto. Titular editorial a todo el ancho (portada de la
// propuesta llevada a escala de póster) y debajo un panel funcional de un sistema de Pime construido
// en HTML/CSS/SVG: se arma al cargar y después solo se mueve cuando la persona lo usa.
// Todo el texto se pinta en el primer frame; el titular se revela por línea con CSS puro (≤ 600 ms).
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { Eyebrow, Lines } from "@/components/ui/primitives";
import { HeroWindow } from "./hero-window";
import { HOME } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./hero.css";

export function Hero({ lang }: { lang: Lang }) {
  const h = HOME[lang].hero;
  return (
    <section className="hero" id="inicio" data-motion="hero" aria-labelledby="hero-title">
      <div className="hero-bar" aria-hidden="true" />
      <div className="wrap hero-top">
        <div className="hero-row1">
          <Eyebrow eager>{h.eyebrow}</Eyebrow>
          <span className="hero-index caps eager-slide" style={{ "--delay": "120ms" } as React.CSSProperties}>01 / {lang === "es" ? "Portada" : "Cover"}</span>
        </div>
        <Lines eager as="h1" className="t-hero" lines={h.titulo} />
        <span id="hero-title" className="sr-only">{h.titulo.join(" ")}</span>
        <div className="hero-row3">
          <div className="hero-copy">
            <p className="lead eager-slide" style={{ "--delay": "240ms" } as React.CSSProperties}>{h.bajada}</p>
            <div className="hero-actions eager-rise" style={{ "--delay": "420ms" } as React.CSSProperties}>
              <Button href={h.cta.href} arrow>{h.cta.label}</Button>
              <TextLink href={h.secundario.href} className="tap">{h.secundario.label}</TextLink>
            </div>
          </div>
          <dl className="hero-meta">
            {h.metadatos.map((m, i) => (
              <div key={m.k} className="eager-rise" style={{ "--delay": `${480 + i * 80}ms` } as React.CSSProperties}>
                <dt className="caps">{m.k}</dt><dd>{m.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="hero-stage-outer">
        <div className="wrap">
          <div className="hero-stage">
            <HeroWindow lang={lang} />
          </div>
        </div>
      </div>
    </section>
  );
}
