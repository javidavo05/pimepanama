// Preguntas frecuentes. Origen: las filas de índice de la propuesta (separador de 1 px, título + texto).
// Cada pregunta abre con <details> nativo: funciona sin JS y el lector de pantalla lo entiende.
import { Eyebrow, Lines } from "@/components/ui/primitives";
import { FAQ } from "../../../content/faq";
import type { Lang } from "../../../content/site";
import "./faq.css";

export function Faq({ lang, eyebrow }: { lang: Lang; eyebrow?: string }) {
  const t = FAQ[lang];
  return (
    <section className="fq" id="preguntas" data-motion="accordion" aria-labelledby="fq-title">
      <div className="wrap fq-in">
        <header className="fq-head">
          <Eyebrow>{eyebrow ?? t.eyebrow}</Eyebrow>
          <Lines as="h2" className="t-2" lines={t.titulo} />
          <span id="fq-title" className="sr-only">{t.titulo.join(" ")}</span>
        </header>
        <ul className="fq-list">
          {t.preguntas.map((x, i) => (
            <li key={x.p} className="fq-item" data-reveal="rise" style={{ "--delay": `${i * 60}ms` } as React.CSSProperties}>
              <details>
                <summary className="fq-q"><span>{x.p}</span><span className="fq-mark" aria-hidden /></summary>
                <p className="fq-a">{x.r}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
