// motion: none — pantalla estática en HTML/CSS/SVG; su coreografía de armado, sus ciclos, el
// enderezado con el scroll y el parallax viven en hero.css y en <Parallax>.
import { LetterChip, Pill } from "@/components/ui/primitives";
import { HOME } from "../../../content/home";
import type { Lang } from "../../../content/site";

const PATH = "M0 56 C 30 52, 50 60, 80 46 S 140 30, 170 36 S 230 16, 260 22 S 310 8, 340 4";

function Digits({ value, prefijo = "", sufijo = "", delay = 0 }: { value: number; prefijo?: string; sufijo?: string; delay?: number }) {
  const chars = value.toLocaleString("es-PA").replace(/,/g, " ").replace(/\./g, " ").split("");
  return (
    <span className="hw-digits" style={{ "--delay": `${delay}ms` } as React.CSSProperties}>
      {prefijo && <span className="hw-pre">{prefijo}</span>}
      {chars.map((c, i) =>
        /\d/.test(c) ? (
          <span className="hw-digit" key={i} style={{ "--d": Number(c), "--i": i } as React.CSSProperties}>
            <span>{[0,1,2,3,4,5,6,7,8,9].map((d) => <i key={d}>{d}</i>)}</span>
          </span>
        ) : <span key={i} className="hw-sep" />,
      )}
      {sufijo && <span className="hw-pre">{sufijo}</span>}
    </span>
  );
}

export function HeroWindow({ lang }: { lang: Lang }) {
  const v = HOME[lang].hero.ventana;
  return (
    <div className="hw" aria-hidden="true"><div className="hw-in">
      <div className="hw-frame">
        {/* Cabecera de la aplicación */}
        <div className="hw-chrome">
          <div className="hw-brand"><span className="hw-logo" /><span>PIME</span><span className="hw-app">{v.app}</span></div>
          <div className="hw-crumbs">{v.ruta.map((r, i) => <span key={r} className={i === v.ruta.length - 1 ? "on" : ""}>{r}</span>)}</div>
          <div className="hw-search"><span className="hw-search-ico" /><span>{v.buscar}</span><kbd>⌘K</kbd></div>
          <span className="hw-user">{v.usuario}</span>
        </div>

        <div className="hw-body">
          {/* Menú lateral con indicador que se desliza */}
          <nav className="hw-side">
            <span className="hw-side-ind" />
            {v.menu.map((m, i) => (
              <span key={m.label} className={`hw-side-item ${i === v.activo ? "on" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                <span className="hw-mini-chip">{m.chip}</span>{m.label}
              </span>
            ))}
          </nav>

          {/* Contenido principal */}
          <div className="hw-main">
            <div className="hw-head">
              <div><div className="hw-title">{v.titulo}</div><div className="hw-sub">{v.hoy}</div></div>
              <span className="hw-btn">+ {lang === "es" ? "Nueva operación" : "New operation"}</span>
            </div>
            <div className="hw-kpis">
              {v.kpis.map((k, i) => (
                <div className="hw-kpi" key={k.k} style={{ "--i": i } as React.CSSProperties}>
                  <span className="hw-kpi-k">{k.k}</span>
                  <span className="hw-kpi-v"><Digits value={k.v} prefijo={k.prefijo} sufijo={k.sufijo} delay={900 + i * 120} /></span>
                </div>
              ))}
            </div>
            <div className="hw-table">
              <div className="hw-tr hw-th">{v.columnas.map((c) => <span key={c}>{c}</span>)}</div>
              {v.filas.map((f, i) => (
                <div className="hw-tr" key={f.cliente} style={{ "--i": i } as React.CSSProperties}>
                  <span className="hw-td strong">{f.cliente}</span>
                  <span className="hw-td">{f.modulo}</span>
                  <span className="hw-td">{f.responsable}</span>
                  <span className="hw-td hw-swap">
                    <Pill variant={f.antes.tono}>{f.antes.t}</Pill>
                    <Pill variant={f.despues.tono}>{f.despues.t}</Pill>
                  </span>
                  <span className="hw-td num right">{f.monto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel derecho: gráfica y actividad */}
          <aside className="hw-rail">
            <div className="hw-card"><div className="hw-chart-in" style={{ "--depth": "var(--parallax-2)" } as React.CSSProperties}>
              <span className="hw-kpi-k">{v.grafica.titulo}</span>
              <svg className="hw-chart" viewBox="0 0 340 64" preserveAspectRatio="none">
                <path className="hw-area" d={`${PATH} L340 64 L0 64 Z`} />
                <path className="hw-line" d={PATH} pathLength={1} />
                <circle className="hw-dot" cx="340" cy="4" r="3" />
              </svg>
              <span className="hw-sub">{v.grafica.sub}</span>
            </div></div>
            <div className="hw-card">
              <span className="hw-kpi-k">{v.actividad.titulo}</span>
              {v.actividad.items.map((a, i) => (
                <div className="hw-act" key={a.t} style={{ "--i": i } as React.CSSProperties}>
                  <LetterChip>{a.chip}</LetterChip>
                  <span className="hw-act-t">{a.t}</span>
                  <span className="hw-act-h num">{a.h}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* Aviso que aparece al final del armado */}
        <div className="hw-toast"><div className="hw-toast-in" style={{ "--depth": "var(--parallax-3)" } as React.CSSProperties}>
          <span className="hw-toast-dot" />
          <div><div className="hw-title sm">{v.aviso.titulo}</div><div className="hw-sub">{v.aviso.texto}</div></div>
        </div></div>
      </div>
    </div></div>
  );
}
