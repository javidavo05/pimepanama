// /servicios. Origen: "El sistema en detalle" de la propuesta (índice de filas, lista de check, pills de
// fase). Cinco servicios = CAPACIDADES; cada uno con qué incluye, cómo se entrega, sus casos reales (abren el
// pop-up) y un CTA que precarga el tipo en el wizard de contacto.
import Link from "next/link";
import { Eyebrow, LetterChip, Lines, NumChip, Pill } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CaseShot } from "@/components/cases";
import { CaseModalProvider, CaseTrigger } from "./case-modal";
import { CAPACIDADES } from "../../../content/home";
import { CASOS } from "../../../content/portfolio";
import { SERVICIOS, CASOS_POR_SERVICIO } from "../../../content/paginas";
import type { Lang } from "../../../content/site";
import "./services-page.css";

export function ServicesPage({ lang }: { lang: Lang }) {
  const t = SERVICIOS[lang]; const caps = CAPACIDADES[lang].items;
  const casos = CASOS.filter((c) => c.publicable);
  return (
    <main className="sv" data-motion="reveal">
      <CaseModalProvider casos={casos} lang={lang}>
        <header className="wrap sv-head">
          <Eyebrow eager>{t.eyebrow}</Eyebrow>
          <Lines as="h1" className="t-1" lines={t.titulo} eager />
          <p className="lead eager-rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{t.bajada}</p>
          <nav className="sv-index eager-rise" aria-label={t.indice} style={{ "--delay": "300ms" } as React.CSSProperties}>
            <span className="caps">{t.indice}</span>
            <ol>{caps.map((c) => <li key={c.id}><a href={`#${c.id}`} className="sv-index-row"><NumChip n={c.n} /><span>{c.titulo}</span><span className="sv-index-arrow" aria-hidden="true">↓</span></a></li>)}</ol>
          </nav>
        </header>
        {caps.map((c, i) => {
          const lista = (CASOS_POR_SERVICIO[c.id] ?? []).map((s) => casos.find((x) => x.slug === s)).filter((x): x is NonNullable<typeof x> => !!x);
          return (
            <section key={c.id} id={c.id} className={`sv-sec ${i % 2 ? "sv-sec-alt" : ""}`} aria-labelledby={`sv-${c.id}`}>
              <div className="wrap sv-grid">
                <header className="sv-sec-head" data-reveal="rise">
                  <span className="sv-n num">{c.n}</span>
                  <h2 id={`sv-${c.id}`} className="t-2">{c.titulo}</h2>
                  <p className="lead">{c.apoyo}</p>
                  <Button href={`/${lang}/contacto?tipo=${c.id}`} arrow>{`${t.cta} ${c.titulo.split(" ")[0]}`}</Button>
                </header>
                <div className="sv-cols">
                  <div className="sv-col" data-reveal="rise" style={{ "--delay": "80ms" } as React.CSSProperties}>
                    <h3 className="caps">{t.incluye}</h3>
                    <ul className="sv-check">{c.modulos.map((m) => <li key={m}><i aria-hidden="true" />{m}</li>)}</ul>
                  </div>
                  <div className="sv-col" data-reveal="rise" style={{ "--delay": "160ms" } as React.CSSProperties}>
                    <h3 className="caps">{t.entrega}</h3>
                    <ul className="sv-check">{t.entregaItems.map((m) => <li key={m}><i aria-hidden="true" />{m}</li>)}</ul>
                  </div>
                </div>
                {lista.length > 0 && (
                  <div className="sv-cases" data-reveal="rise" style={{ "--delay": "240ms" } as React.CSSProperties}>
                    <h3 className="caps">{t.casos}</h3>
                    <ul className="sv-case-list">
                      {lista.map((x) => (
                        <li key={x.slug}>
                          <CaseTrigger slug={x.slug} href={`/${lang}/portfolio/${x.slug}`} className="sv-case">
                            <CaseShot slug={x.slug} label={x.nombre} />
                            <span className="sv-case-t">{x.nombre}</span>
                            <span className="meta">{x.cliente} · {x.industria[lang]}</span>
                            <Pill variant="ghost">{x.tipo[lang]}</Pill>
                          </CaseTrigger>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          );
        })}
        <section className="sv-no" data-theme="ink">
          <div className="wrap sv-no-in">
            <div data-reveal="rise"><Eyebrow>{t.noHacemos}</Eyebrow><ul className="sv-no-list">{t.noHacemosItems.map((x) => <li key={x}><LetterChip>✕</LetterChip><span>{x}</span></li>)}</ul></div>
            <div className="sv-no-cta" data-reveal="rise" style={{ "--delay": "120ms" } as React.CSSProperties}><Button href={t.ctaTodos.href} variant="accent" arrow>{t.ctaTodos.label}</Button><Link href={`/${lang}/portfolio`} className="link tap">{lang === "es" ? "Ver más sistemas entregados" : "See more delivered systems"}</Link></div>
          </div>
        </section>
      </CaseModalProvider>
    </main>
  );
}
