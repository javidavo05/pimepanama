// Portfolio destacado. Origen: la fila de tarjetas de fase independientes de la propuesta. Scroll horizontal
// fijado (scroll-timeline nativo): la sección mide varias pantallas, el carril queda fijo y se desplaza con el
// scroll; cada tarjeta escala y se enfoca al pasar por el centro. Sin soporte o en teléfono: carril con scroll
// horizontal y snap. Cada tarjeta tiene inclinación 3D al cursor y spotlight.
import Image from "next/image";
import { Eyebrow, LetterChip, Lines, Pill } from "@/components/ui/primitives";
import { TiltCard } from "@/components/ui/tilt-card";
import { TextLink } from "@/components/ui/text-link";
import { CaseShot } from "@/components/cases";
import { CaseModalProvider, CaseTrigger } from "./case-modal";
import { DESTACADOS, type Caso } from "../../../content/portfolio";
import type { Lang } from "../../../content/site";
import "./featured-work.css";

const COPY = {
  es: { eyebrow: "04 · Trabajo", titulo: ["Sistemas que hoy", "operan empresas reales"], bajada: "Once casos en producción, cada uno con su tablero real recreado con datos de muestra. Cada tarjeta abre el sistema aquí mismo, con su ficha y su enlace público.", ver: "Ver el caso", todos: "Ver todo el portfolio", hint: "Bajá para recorrerlos", hintM: "Deslice para ver los once →" },
  en: { eyebrow: "04 · Work", titulo: ["Systems that run", "real companies today"], bajada: "Eleven cases in production, each with its real dashboard recreated with sample data. Each card opens the system right here, with its page and public link.", ver: "View case", todos: "See the whole portfolio", hint: "Scroll to browse", hintM: "Swipe to see all eleven →" },
};

function Card({ c, lang, i, n }: { c: Caso; lang: Lang; i: number; n: number }) {
  const t = COPY[lang];
  return (
    <TiltCard className="fw-card" style={{ "--i": i, "--n": n } as React.CSSProperties}>
      <CaseTrigger slug={c.slug} href={`/${lang}/portfolio/${c.slug}`} className="fw-link">
        <div className="fw-visual" style={{ viewTransitionName: `caso-${c.slug}` } as React.CSSProperties}>
          <CaseShot slug={c.slug} label={`${c.nombre} · ${lang === "es" ? "tablero con datos de muestra" : "dashboard with sample data"}`} />
        </div>
        <div className="fw-body">
          <div className="fw-top">
            {c.logo ? <Image src={c.logo} alt="" width={64} height={24} className="fw-logo" style={{ width: "auto" }} unoptimized={c.logo.endsWith(".svg")} /> : <LetterChip>{c.cliente.slice(0, 2).toUpperCase()}</LetterChip>}
            <Pill variant="ghost">{c.tipo[lang]}</Pill>
          </div>
          <h3 className="fw-t">{c.nombre}</h3>
          <p className="fw-c">{c.cliente} · {c.industria[lang]} · {c.estado[lang]}</p>
          <p className="fw-r">{c.resumen[lang]}</p>
          <p className="fw-stack"><span className="caps">{lang === "es" ? "Módulos" : "Modules"}</span> {c.modulos[lang].slice(0, 5).join(" · ")}</p>
          <span className="fw-cta">{t.ver} <span className="arrow" aria-hidden="true">→</span></span>
        </div>
      </CaseTrigger>
    </TiltCard>
  );
}

export function FeaturedWork({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const casos = DESTACADOS;
  return (
    <section className="fw" id="trabajo" data-motion="pin-scroll" aria-labelledby="fw-title" style={{ "--n": casos.length } as React.CSSProperties}>
      <div className="fw-pin">
        <div className="wrap fw-head">
          <div className="fw-head-l">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <Lines as="h2" className="t-1" lines={t.titulo} />
            <span id="fw-title" className="sr-only">{t.titulo.join(" ")}</span>
          </div>
          <div className="fw-head-r" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <p className="lead">{t.bajada}</p>
            <TextLink href={`/${lang}/portfolio`} className="tap">{t.todos}</TextLink>
          </div>
        </div>
        <CaseModalProvider casos={casos} lang={lang}>
          <div className="fw-rail-outer">
            <ol className="fw-rail wrap">
              {casos.map((c, i) => <li key={c.slug}><Card c={c} lang={lang} i={i} n={casos.length} /></li>)}
            </ol>
          </div>
        </CaseModalProvider>
        <div className="wrap fw-foot"><span className="meta fw-hint">{t.hint}</span><span className="meta fw-hint-m">{t.hintM}</span><span className="meta num">{String(casos.length).padStart(2, "0")} {lang === "es" ? "casos" : "cases"}</span></div>
      </div>
    </section>
  );
}
