// Hero. Origen: la portada de la propuesta (eyebrow, H1 Manrope 800, línea de acento, bajada y tres
// metadatos) más la UI de producto construida con las piezas del sistema. Todo el texto se pinta en el
// primer frame; el titular se revela por línea con CSS puro desde el primer paint (≤ 600 ms + stagger).
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { AccentRule, Eyebrow, Lines } from "@/components/ui/primitives";
import { Parallax } from "@/components/motion/parallax";
import { HeroUI } from "./hero-ui";
import { HOME } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./hero.css";

export function Hero({ lang }: { lang: Lang }) {
  const h = HOME[lang].hero;
  return (
    <section className="hero" id="inicio" data-motion="hero" aria-labelledby="hero-title">
      <div className="hero-bar" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <Eyebrow eager>{h.eyebrow}</Eyebrow>
          <Lines eager as="h1" className="t-display" lines={h.titulo} />
          <span id="hero-title" className="sr-only">{h.titulo.join(" ")}</span>
          <AccentRule eager delay={420} />
          <p className="lead eager-slide" style={{ "--delay": "240ms" } as React.CSSProperties}>{h.bajada}</p>
          <div className="hero-actions eager-rise" style={{ "--delay": "480ms" } as React.CSSProperties}>
            <Button href={h.cta.href} arrow>{h.cta.label}</Button>
            <TextLink href={h.secundario.href} className="tap">{h.secundario.label}</TextLink>
          </div>
          <dl className="hero-meta eager-rise" style={{ "--delay": "600ms" } as React.CSSProperties}>
            {h.metadatos.map((m) => (
              <div key={m.k}><dt className="caps">{m.k}</dt><dd>{m.v}</dd></div>
            ))}
          </dl>
        </div>
        <Parallax className="hero-stage">
          <HeroUI lang={lang} />
        </Parallax>
      </div>
    </section>
  );
}
