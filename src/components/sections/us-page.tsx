// /en/nearshore-software-development: Pime para empresas de EE. UU. Mismo lenguaje de la home (eyebrow,
// líneas reveladas, filas con separador de 1 px, bloque de tinta); cierra con las preguntas y el cierre.
import { Eyebrow, Lines, NumChip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { Faq } from "./faq";
import { Closing } from "./closing";
import { EEUU } from "../../../content/eeuu";
import "./us-page.css";

export function UsPage() {
  const t = EEUU;
  return (
    <main className="us" data-motion="reveal">
      <header className="wrap us-head">
        <Eyebrow eager>{t.eyebrow}</Eyebrow>
        <Lines as="h1" className="t-1" lines={t.titulo} eager />
        <p className="lead eager-rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{t.bajada}</p>
        <div className="us-actions eager-rise" style={{ "--delay": "300ms" } as React.CSSProperties}>
          <Button href={t.cta.href} arrow>{t.cta.label}</Button>
          <TextLink href={t.secundario.href} className="tap">{t.secundario.label}</TextLink>
        </div>
      </header>

      <section className="wrap us-why" aria-labelledby="us-why">
        <h2 id="us-why" className="t-2" data-reveal="rise">{t.porque.titulo}</h2>
        <ol className="us-why-list">
          {t.porque.items.map((x, i) => (
            <li key={x.t} data-reveal="rise" style={{ "--delay": `${i * 80}ms` } as React.CSSProperties}><NumChip n={i + 1} /><div><h3 className="us-why-t">{x.t}</h3><p>{x.x}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="us-ink" data-theme="ink" aria-labelledby="us-price">
        <div className="wrap us-ink-in">
          <h2 id="us-price" className="t-2" data-reveal="rise">{t.precio.titulo}</h2>
          <dl className="us-price">
            {t.precio.items.map((x, i) => (
              <div key={x.k} data-reveal="rise" style={{ "--delay": `${i * 80}ms` } as React.CSSProperties}><dt>{x.k}</dt><dd>{x.v}</dd></div>
            ))}
          </dl>
          <p className="us-note" data-reveal="rise">{t.precio.nota}</p>
        </div>
      </section>

      <section className="wrap us-build" aria-labelledby="us-build">
        <h2 id="us-build" className="t-2" data-reveal="rise">{t.construimos.titulo}</h2>
        <ul className="us-build-list">{t.construimos.items.map((x, i) => <li key={x} data-reveal="rise" style={{ "--delay": `${i * 60}ms` } as React.CSSProperties}>{x}</li>)}</ul>
        <div className="us-links" data-reveal="rise">
          <TextLink href={t.construimos.ver.href} className="tap">{t.construimos.ver.label}</TextLink>
          <TextLink href={t.construimos.trabajo.href} className="tap">{t.construimos.trabajo.label}</TextLink>
        </div>
      </section>

      <Faq lang="en" eyebrow="Questions" />
      <Closing lang="en" eyebrow="Let's talk" />
    </main>
  );
}
