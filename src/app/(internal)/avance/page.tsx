import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ETIQUETA_ESTADO, PASOS } from "../../../../content/avance";
import "./avance.css";

export const metadata: Metadata = { title: "Avance · Pime v2", robots: { index: false } };

export default function Avance() {
  const total = PASOS.length;
  const aprobados = PASOS.filter((p) => p.estado === "aprobado").length;
  const enRevision = PASOS.filter((p) => p.estado === "en_revision").length;
  return (
    <main className="av" data-motion="avance">
      <header className="av-head">
        <div className="av-brand">
          <Image src="/brand/logo_icon.png" alt="" width={16} height={20} />
          PIME
        </div>
        <div className="av-eyebrow">Sitio nuevo · tablero de avance</div>
        <h1>Cada parte se aprueba antes de seguir</h1>
        <p className="av-sub">
          Un paso por parte del sitio. Cada fila dice qué revisar en localhost, sus capturas, su Lighthouse móvil y las notas.
        </p>
        <div className="av-tot">
          <span><b>{aprobados}</b> de {total} aprobados</span>
          <span><b>{enRevision}</b> en revisión</span>
          <span><b>{total - aprobados - enRevision}</b> pendientes</span>
        </div>
      </header>

      <ol className="av-list">
        {PASOS.map((p, i) => (
          <li key={p.n} className="av-row" data-estado={p.estado} id={`paso-${p.n}`} style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
            <div className="av-n">{String(p.n).padStart(2, "0")}</div>
            <div className="av-body">
              <div className="av-top">
                <h2 className="av-t">{p.titulo}</h2>
                <span className="av-pill" data-estado={p.estado}>{ETIQUETA_ESTADO[p.estado]}</span>
              </div>
              <p className="av-d">{p.descripcion}</p>

              {p.estado !== "pendiente" && (
                <div className="av-grid">
                  <div className="av-box">
                    <div className="av-k">Dónde se revisa</div>
                    {p.ruta ? (
                      <Link className="av-link" href={p.ruta}>localhost:3000{p.ruta}</Link>
                    ) : (
                      <p className="av-empty">Todavía no hay ruta para esta parte.</p>
                    )}
                    {p.revisar?.length ? (
                      <>
                        <div className="av-k">Qué mirar</div>
                        <ul className="av-ul">{p.revisar.map((r) => <li key={r}>{r}</li>)}</ul>
                      </>
                    ) : null}
                    <div className="av-k">Lighthouse móvil</div>
                    {typeof p.lighthouseMovil === "number" ? (
                      <div className="av-lh">{p.lighthouseMovil}<small>/ 100 · build local</small></div>
                    ) : (
                      <p className="av-empty">Sin medir. Se mide contra el build de producción en el puerto 3001.</p>
                    )}
                  </div>
                  <div className="av-box">
                    <div className="av-k">Capturas 375 y 1440</div>
                    <div className="av-shots">
                      <div className="av-shot">
                        {p.capturas?.w375 ? <Image src={p.capturas.w375} alt={`${p.titulo} a 375 px`} fill sizes="96px" style={{ objectFit: "cover", objectPosition: "top" }} /> : <span>Sin captura 375</span>}
                      </div>
                      <div className="av-shot wide">
                        {p.capturas?.w1440 ? <Image src={p.capturas.w1440} alt={`${p.titulo} a 1440 px`} fill sizes="(min-width: 1024px) 480px, 100vw" style={{ objectFit: "cover", objectPosition: "top" }} /> : <span>Sin captura 1440</span>}
                      </div>
                    </div>
                    <div className="av-k">Notas</div>
                    {p.notas?.length ? (
                      <div className="av-note">{p.notas.map((n) => <p key={n}>{n}</p>)}</div>
                    ) : (
                      <p className="av-empty">Sin notas todavía. Las notas de Javier van aquí.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="av-foot">Se actualiza al cerrar cada paso. Los datos viven en content/avance.ts.</p>
    </main>
  );
}
