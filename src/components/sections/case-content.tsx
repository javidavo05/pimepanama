// Contenido de un caso (texto del sistema + enlace público + tablero). Lo usan la ficha /portfolio/[slug]
// y el pop-up del carril. En John Henry agrega el maniquí 3D en vivo.
import Image from "next/image";
import { Eyebrow, LetterChip, Pill } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CaseShot } from "@/components/cases";
import { LiveMannequinPanel } from "@/components/cases/live-mannequin";
import type { Caso } from "../../../content/portfolio";
import type { Lang } from "../../../content/site";
import "./case-detail.css";

export const CASE_T = {
  es: { volver: "Todo el portfolio", problema: "El problema", solucion: "La solución", modulos: "Módulos", stack: "Tecnología", visitar: "Abrir el sistema en vivo", sinEnlace: "Sin enlace público", tablero: "tablero con datos de muestra", nota: "Tablero recreado con datos de muestra: no muestra información real de clientes.", vivo: "En vivo", vivoT: "El maniquí del editor de medidas, funcionando", vivoB: "Así toma medidas el sastre en el sistema: arrastre para girarlo y pase el cursor por una medida para ver dónde se toma.", sig: "Siguiente caso", ant: "Caso anterior", cerrar: "Cerrar", ficha: "Abrir la ficha completa" },
  en: { volver: "All portfolio", problema: "The problem", solucion: "The solution", modulos: "Modules", stack: "Technology", visitar: "Open the live system", sinEnlace: "No public link", tablero: "dashboard with sample data", nota: "Dashboard recreated with sample data: it shows no real customer information.", vivo: "Live", vivoT: "The measurement editor's mannequin, running", vivoB: "This is how the tailor takes measurements in the system: drag to rotate it and hover a measurement to see where it is taken.", sig: "Next case", ant: "Previous case", cerrar: "Close", ficha: "Open the full page" },
};
const SIN_DOC = (s: string) => s.startsWith("Sin documentar") || s.startsWith("Not documented");

export function CaseContent({ caso: c, lang, as: H = "h1", titleId, compact }: { caso: Caso; lang: Lang; as?: "h1" | "h2"; titleId?: string; compact?: boolean }) {
  const t = CASE_T[lang];
  const S = (compact ? "h3" : "h2") as "h2" | "h3"; // orden de encabezados: h1→h2 en la ficha, h2→h3 en el pop-up
  const reveal = compact ? {} : { "data-reveal": "rise" };
  return (
    <>
      <header className="cd-head" {...reveal}>
        <div className="cd-id">
          {c.logo ? <Image src={c.logo} alt="" width={96} height={32} className="cd-logo" style={{ width: "auto" }} unoptimized={c.logo.endsWith(".svg")} /> : <LetterChip size="lg">{c.cliente.slice(0, 2).toUpperCase()}</LetterChip>}
          <Pill variant="ghost">{c.tipo[lang]}</Pill>
        </div>
        <Eyebrow>{c.cliente} · {c.industria[lang]} · {c.estado[lang]}</Eyebrow>
        <H id={titleId} className={`${compact ? "t-2" : "t-1"} cd-title`}>{c.nombre}</H>
        <p className="lead">{c.resumen[lang]}</p>
        <div className="cd-actions">
          {c.urlPublica ? <Button href={c.urlPublica} arrow>{t.visitar}</Button> : <span className="cd-nolink">{t.sinEnlace}{c.urlNota ? ` · ${c.urlNota[lang]}` : ""}</span>}
          {c.urlPublica && c.urlNota ? <span className="cd-nolink">{c.urlNota[lang]}</span> : null}
        </div>
      </header>
      <figure className="cd-shot" {...reveal} style={compact ? undefined : ({ viewTransitionName: `caso-${c.slug}` } as React.CSSProperties)}>
        <CaseShot slug={c.slug} label={`${c.nombre} · ${t.tablero}`} grande />
        <figcaption className="meta">{t.nota}</figcaption>
      </figure>
      <div className="cd-body">
        <div className="cd-text">
          {!SIN_DOC(c.problema[lang]) && <section {...reveal}><S className="cd-h">{t.problema}</S><p>{c.problema[lang]}</p></section>}
          {!SIN_DOC(c.solucion[lang]) && <section {...reveal}><S className="cd-h">{t.solucion}</S><p>{c.solucion[lang]}</p></section>}
        </div>
        <aside className="cd-side" {...reveal}>
          <S className="cd-h">{t.modulos}</S>
          <ul className="cd-mods">{c.modulos[lang].map((m) => <li key={m}><Pill variant="soft">{m}</Pill></li>)}</ul>
          <S className="cd-h">{t.stack}</S>
          <p className="cd-stack">{c.stack.join(" · ")}</p>
        </aside>
      </div>
      {c.slug === "john-henry" && (
        <section className="cd-live" data-motion="reveal" {...reveal} aria-labelledby="cd-live-t">
          <Eyebrow>{t.vivo}</Eyebrow>
          <S id="cd-live-t" className="t-2">{t.vivoT}</S>
          <p className="lead">{t.vivoB}</p>
          <div className="cd-live-frame"><LiveMannequinPanel /></div>
        </section>
      )}
    </>
  );
}
