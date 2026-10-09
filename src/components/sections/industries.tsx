// Industrias. Origen: la fila de índice de la propuesta (chip de letra + título + subtítulo + número a la
// derecha, separador de 1 px). Cada fila es una industria real con sus sistemas en producción; entran en
// orden (stagger) y el separador se dibuja. Datos derivados de content/portfolio.ts.
import Link from "next/link";
import { Eyebrow, LetterChip, Lines } from "@/components/ui/primitives";
import { TextLink } from "@/components/ui/text-link";
import { CASOS } from "../../../content/portfolio";
import { INDUSTRIAS_SEC } from "../../../content/home";
import type { Lang } from "../../../content/site";
import "./industries.css";

/** Chip de dos letras único por industria: primera letra + la primera que no repita otro chip. */
function chips(nombres: string[]) {
  const usados = new Set<string>(); const out = new Map<string, string>();
  for (const n of nombres) {
    const u = n.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase();
    let chip = u.slice(0, 2);
    for (let i = 1; i < u.length && usados.has(chip); i++) chip = u[0] + u[i];
    usados.add(chip); out.set(n, chip);
  }
  return out;
}

export function Industries({ lang }: { lang: Lang }) {
  const t = INDUSTRIAS_SEC[lang];
  const grupos = new Map<string, { nombre: string; slug: string }[]>();
  for (const c of CASOS.filter((x) => x.publicable)) {
    const k = c.industria[lang];
    grupos.set(k, [...(grupos.get(k) ?? []), { nombre: c.nombre, slug: c.slug }]);
  }
  const filas = Array.from(grupos.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const chip = chips(filas.map(([k]) => k));
  return (
    <section className="ind" id="industrias" data-motion="stagger-rows" aria-labelledby="ind-title">
      <div className="wrap ind-in">
        <header className="ind-head">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <Lines as="h2" className="t-1" lines={t.titulo} />
          <span id="ind-title" className="sr-only">{t.titulo.join(" ")}</span>
          <p className="lead" data-reveal="rise" style={{ "--delay": "200ms" } as React.CSSProperties}>{t.bajada}</p>
        </header>
        <ol className="ind-rows">
          {filas.map(([industria, sistemas], i) => (
            <li key={industria} className="ind-row" data-reveal="rise" style={{ "--delay": `${i * 70}ms` } as React.CSSProperties}>
              <span className="ind-sep draw" aria-hidden="true" />
              <LetterChip>{chip.get(industria) ?? industria.slice(0, 2).toUpperCase()}</LetterChip>
              <div className="ind-body">
                <h3 className="ind-t">{industria}</h3>
                <p className="ind-s">
                  {sistemas.map((s, j) => (
                    <span key={s.slug}>
                      <Link href={`/${lang}/portfolio/${s.slug}`} className="ind-link">{s.nombre}</Link>
                      {j < sistemas.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </p>
              </div>
              <span className="ind-n num">{String(sistemas.length).padStart(2, "0")}</span>
            </li>
          ))}
        </ol>
        <div className="ind-foot" data-reveal="rise"><TextLink href={`/${lang}/portfolio`} className="tap">{t.ver}</TextLink></div>
      </div>
    </section>
  );
}
