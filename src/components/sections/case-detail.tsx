// Ficha de un caso en su propia URL (/portfolio/[slug]): enlace directo y compartible. El carril de la home
// abre el mismo contenido en un pop-up (case-modal.tsx).
import Link from "next/link";
import { CaseContent, CASE_T } from "./case-content";
import { CASOS, type Caso } from "../../../content/portfolio";
import type { Lang } from "../../../content/site";
import "./case-detail.css";

export function CaseDetail({ caso: c, lang }: { caso: Caso; lang: Lang }) {
  const t = CASE_T[lang];
  const lista = CASOS.filter((x) => x.publicable);
  const i = lista.findIndex((x) => x.slug === c.slug);
  const sig = lista[(i + 1) % lista.length];
  const ant = lista[(i - 1 + lista.length) % lista.length];
  return (
    <main className="cd" data-motion="reveal">
      <div className="wrap cd-wrap">
        <Link href={`/${lang}/portfolio`} className="cd-back tap">← {t.volver}</Link>
        <CaseContent caso={c} lang={lang} />
        <nav className="cd-pager" aria-label="Casos">
          <Link href={`/${lang}/portfolio/${ant.slug}`} className="cd-pg tap"><span className="meta">← {t.ant}</span><b>{ant.nombre}</b></Link>
          <Link href={`/${lang}/portfolio/${sig.slug}`} className="cd-pg cd-pg-r tap"><span className="meta">{t.sig} →</span><b>{sig.nombre}</b></Link>
        </nav>
      </div>
    </main>
  );
}
