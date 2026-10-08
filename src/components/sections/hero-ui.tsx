// motion: none — composición estática en HTML/CSS/SVG; sus loops y su parallax viven en hero.css y en <Parallax>.
// Tres planos con profundidad: operaciones (atrás), cobros con gráfica (medio), aprobación (frente).
import { LetterChip, NumChip, Pill } from "@/components/ui/primitives";
import { HOME } from "../../../content/home";
import type { Lang } from "../../../content/site";

const PATH = "M0 56 C 24 50, 40 58, 64 44 S 112 30, 136 34 S 184 18, 208 22 S 248 8, 272 4";

export function HeroUI({ lang }: { lang: Lang }) {
  const u = HOME[lang].hero.ui;
  return (
    <div className="hui" aria-hidden="true">
      <div className="hui-plane hui-ops" style={{ "--depth": "var(--parallax-1)", "--delay": "240ms" } as React.CSSProperties}><div className="hui-card">
        <div className="hui-head">
          <LetterChip>OP</LetterChip>
          <div className="hui-title">{u.operaciones.titulo}</div>
          <Pill variant="ghost">{u.operaciones.estado}</Pill>
        </div>
        <div className="hui-rows">
          {u.operaciones.filas.map((f, i) => (
            <div className="hui-row" key={f.cliente} style={{ "--i": i } as React.CSSProperties}>
              <span className="hui-client">{f.cliente}</span>
              <span className="hui-mod">{f.modulo}</span>
              <span className="hui-swap">
                <Pill variant={f.antes.tono}>{f.antes.t}</Pill>
                <Pill variant={f.despues.tono}>{f.despues.t}</Pill>
              </span>
            </div>
          ))}
        </div>
      </div></div>

      <div className="hui-plane hui-stat" style={{ "--depth": "var(--parallax-2)", "--delay": "380ms" } as React.CSSProperties}><div className="hui-card">
        <div className="caps">{u.cobros.titulo}</div>
        <div className="hui-value">
          <span>{u.cobros.prefijo}</span>
          <span className="hui-roll">
            {u.cobros.valor.split("").map((c, i) =>
              /\d/.test(c) ? (
                <span className="hui-digit" key={i} style={{ "--i": i, "--d": Number(c) } as React.CSSProperties}>
                  <span>{[0,1,2,3,4,5,6,7,8,9].map((d) => <i key={d}>{d}</i>)}</span>
                </span>
              ) : <span key={i} className="hui-sep">{c}</span>,
            )}
          </span>
        </div>
        <div className="hui-delta">{u.cobros.delta}</div>
        <svg className="hui-chart" viewBox="0 0 272 64" preserveAspectRatio="none">
          <path className="hui-area" d={`${PATH} L272 64 L0 64 Z`} />
          <path className="hui-line" d={PATH} pathLength={1} />
          <circle className="hui-dot" cx="272" cy="4" r="3" />
        </svg>
        <div className="meta">{u.cobros.sub}</div>
      </div></div>

      <div className="hui-plane hui-ok" style={{ "--depth": "var(--parallax-3)", "--delay": "520ms" } as React.CSSProperties}><div className="hui-card hui-ok-card">
        <NumChip n={2} />
        <div className="hui-ok-text">
          <div className="hui-title">{u.aprobacion.titulo}</div>
          <div className="small">{u.aprobacion.texto}</div>
        </div>
        <span className="hui-swap">
          <Pill variant="ghost">{u.aprobacion.antes}</Pill>
          <Pill variant="ok">{u.aprobacion.despues}</Pill>
        </span>
      </div></div>
    </div>
  );
}
