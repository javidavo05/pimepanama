// Cierre y contacto. Origen: la página de cierre de la propuesta (único fondo oscuro, pasos numerados en
// círculos outline). Un solo trabajo: el titular y el botón de propuesta. El teléfono vive solo en el footer,
// justo debajo, para no repetirlo (Javier, 2026-10-09).
import { Eyebrow, Lines, NumChip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CIERRE } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./closing.css";

export function Closing({ lang }: { lang: Lang }) {
  const t = CIERRE[lang];
  return (
    <section className="cl" id="contacto" data-theme="ink" data-motion="rise-magnetic" aria-labelledby="cl-title">
      <div className="wrap cl-in">
        <header className="cl-head">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <Lines as="h2" className="t-1 cl-t" lines={t.titulo} />
          <span id="cl-title" className="sr-only">{t.titulo.join(" ")}</span>
          <p className="lead" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{t.bajada}</p>
          <div className="cl-actions" data-reveal="rise" style={{ "--delay": "300ms" } as React.CSSProperties}>
            <Button href={t.cta.href} variant="accent" arrow>{t.cta.label}</Button>
          </div>
        </header>
        <ol className="cl-steps">
          {t.pasos.map((p, i) => (
            <li key={p.titulo} className="cl-step" data-reveal="rise" style={{ "--delay": `${i * 90}ms` } as React.CSSProperties}>
              <NumChip n={i + 1} />
              <div><h3 className="cl-st">{p.titulo}</h3><p className="cl-sx">{p.texto}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
