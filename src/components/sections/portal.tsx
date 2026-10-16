// Su cuenta. Cómo trabaja el cliente dentro del sistema de Pime: avance por fase en vivo, tickets y facturas.
// El titular, la bajada y la llamada a la acción vienen del servidor; la ventana es una isla que se arma con
// datos de ejemplo marcados como tales y se mueve solo cuando la persona la mira o la toca.
import { Eyebrow, Lines } from "@/components/ui/primitives";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PORTAL } from "../../../content/portal";
import type { Lang } from "../../../content/site";
import { PortalDemo } from "./portal-demo";
import "./portal.css";

export function Portal({ lang }: { lang: Lang }) {
  const p = PORTAL[lang];
  return (
    <section className="po" id="cuenta" data-motion="portal" aria-labelledby="po-title">
      <div className="wrap po-in">
        <header className="po-head">
          <Eyebrow>{p.eyebrow}</Eyebrow>
          <Lines as="h2" className="t-1" lines={p.titulo} />
          <span id="po-title" className="sr-only">{p.titulo.join(" ")}</span>
          <p className="lead" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{p.bajada}</p>
          <ul className="po-sellos" data-reveal="rise" style={{ "--delay": "280ms" } as React.CSSProperties}>
            {p.sellos.map((x) => <li key={x}><span className="po-sello-dot" aria-hidden="true" />{x}</li>)}
          </ul>
        </header>
        <PortalDemo lang={lang} />
        <div className="po-cta" data-reveal="rise">
          <Button href={p.cta.href} variant="accent" arrow>{p.cta.label}</Button>
          <p className="po-cta2">{p.cta2.texto} <Link href={p.cta2.href}>{p.cta2.label}</Link></p>
        </div>
      </div>
    </section>
  );
}
