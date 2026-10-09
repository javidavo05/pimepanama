// /empresa. Quiénes somos con las cifras reales de SITE, cómo trabajamos, lo que no hacemos, los clientes
// autorizados (logos sobre tinta) y las industrias con sistema en producción. Sin equipo inventado ni fotos.
import Image from "next/image";
import Link from "next/link";
import { Counter, Eyebrow, LetterChip, Lines, NumChip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CLIENTES } from "../../../content/clientes";
import { CASOS } from "../../../content/portfolio";
import { EMPRESA } from "../../../content/paginas";
import { SITE, type Lang } from "../../../content/site";
import "./company-page.css";

export function CompanyPage({ lang }: { lang: Lang }) {
  const t = EMPRESA[lang];
  const clientes = CLIENTES.filter((c) => c.autorizado);
  const industrias = Array.from(new Set(CASOS.filter((c) => c.publicable).map((c) => c.industria[lang]))).sort((a, b) => a.localeCompare(b));
  return (
    <main className="em" data-motion="reveal">
      <header className="wrap em-head">
        <Eyebrow eager>{t.eyebrow}</Eyebrow>
        <Lines as="h1" className="t-1" lines={t.titulo} eager />
        <p className="lead eager-rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{t.bajada}</p>
        <dl className="em-stats eager-rise" style={{ "--delay": "300ms" } as React.CSSProperties}>
          <div><dt className="em-v"><Counter value={SITE.cifras.anios} /></dt><dd>{t.cifras.anios}</dd></div>
          <div><dt className="em-v"><Counter value={SITE.cifras.proyectos} suffix="+" /></dt><dd>{t.cifras.proyectos}</dd></div>
          <div><dt className="em-v"><Counter value={SITE.cifras.mesesGarantia} /></dt><dd>{t.cifras.garantia}</dd></div>
        </dl>
      </header>
      <section className="wrap em-como" aria-labelledby="em-como">
        <h2 id="em-como" className="t-2" data-reveal="rise">{t.como.titulo}</h2>
        <ol className="em-como-list">
          {t.como.items.map((x, i) => (
            <li key={x.titulo} data-reveal="rise" style={{ "--delay": `${i * 80}ms` } as React.CSSProperties}><NumChip n={i + 1} /><div><h3 className="em-como-t">{x.titulo}</h3><p>{x.texto}</p></div></li>
          ))}
        </ol>
      </section>
      <section className="em-ink" data-theme="ink" aria-labelledby="em-cli">
        <div className="wrap em-ink-in">
          <div className="em-no" data-reveal="rise">
            <Eyebrow>{t.no.titulo}</Eyebrow>
            <ul className="em-no-list">{t.no.items.map((x) => <li key={x}><LetterChip>✕</LetterChip><span>{x}</span></li>)}</ul>
          </div>
          <div className="em-cli" data-reveal="rise" style={{ "--delay": "120ms" } as React.CSSProperties}>
            <h2 id="em-cli" className="caps">{t.clientes}</h2>
            <ul className="em-logos">
              {clientes.map((c) => (
                <li key={c.nombre} title={c.sistema}>{c.logo ? <Image src={c.logo} alt={c.nombre} height={32} width={Math.round(32 * (c.ancho ?? 2))} style={{ width: "auto" }} unoptimized={c.logo.endsWith(".svg")} /> : <span className="em-wordmark">{c.nombre}</span>}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="wrap em-ind" aria-labelledby="em-ind">
        <h2 id="em-ind" className="caps" data-reveal="rise">{t.industrias}</h2>
        <ul className="em-ind-list">{industrias.map((i, k) => <li key={i} data-reveal="rise" style={{ "--delay": `${k * 40}ms` } as React.CSSProperties}><Link href={`/${lang}/portfolio?industria=${encodeURIComponent(i)}`} className="em-ind-pill">{i}</Link></li>)}</ul>
        <div className="em-cta" data-reveal="rise"><Button href={t.cta.href} arrow>{t.cta.label}</Button><Link href={`/${lang}/portfolio`} className="link tap">{t.verPortfolio}</Link></div>
      </section>
    </main>
  );
}
