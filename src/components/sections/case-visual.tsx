// motion: none — composiciones fieles en HTML/CSS de la UI de cada tipo de sistema, con las piezas del
// sistema visual (chips de letra, pills, filas, tablas). Nunca capturas ajenas ni imágenes.
import type { Caso } from "../../../content/portfolio";
import type { Lang } from "../../../content/site";

export function CaseVisual({ tipo, lang }: { tipo: Caso["visual"]; lang: Lang }) {
  const es = lang === "es";
  switch (tipo) {
    case "analitica":
      return (
        <div className="cv cv-analitica">
          <div className="cv-bar"><i /><span>{es ? "Muestras · Remolcador 14" : "Samples · Tug 14"}</span><b className="cv-pill ok">OK</b></div>
          <div className="cv-grid3">{[["Fe", "12 ppm"], ["Cu", "4 ppm"], ["Visc.", "14.2"]].map(([k, v]) => <div className="cv-kpi" key={k}><span>{k}</span><b>{v}</b></div>)}</div>
          <svg viewBox="0 0 200 60" className="cv-chart" aria-hidden="true"><path d="M0 48 L25 44 L50 46 L75 36 L100 38 L125 28 L150 30 L175 18 L200 20" /><path className="cv-limit" d="M0 14 L200 14" /></svg>
          <div className="cv-rows">{[["Motor BB", es ? "Normal" : "Normal", "ok"], ["Motor EB", es ? "Revisar Fe" : "Check Fe", "run"]].map(([a, b, c]) => <div className="cv-row" key={a}><span>{a}</span><b className={`cv-pill ${c}`}>{b}</b></div>)}</div>
        </div>
      );
    case "documentos":
      return (
        <div className="cv cv-documentos">
          <div className="cv-side">{[es ? "Secretaría" : "Secretariat", es ? "Propiedades" : "Properties", es ? "Actas" : "Minutes", es ? "Juntas" : "Boards"].map((p, i) => <span key={p} className={i === 2 ? "on" : ""}>{p}</span>)}</div>
          <div className="cv-main">
            <div className="cv-bar"><span>{es ? "Actas · 2026" : "Minutes · 2026"}</span><b className="cv-pill">{es ? "Firmada" : "Signed"}</b></div>
            {[1, 2, 3, 4].map((k) => <div className="cv-row" key={k}><i className="cv-doc" /><span>{es ? `Acta de junta ${k}` : `Board minutes ${k}`}</span><em /></div>)}
          </div>
        </div>
      );
    case "tenants":
      return (
        <div className="cv cv-tenants">
          <div className="cv-bar"><i /><span>{es ? "Academias" : "Academies"}</span><b className="cv-pill">6</b></div>
          <div className="cv-grid3">{["AN", "SF", "IC", "IS", "SR", "UA"].map((c, i) => <div className="cv-tenant" key={c} style={{ "--i": i } as React.CSSProperties}><b>{c}</b><em /><i /></div>)}</div>
        </div>
      );
    case "catalogo":
      return (
        <div className="cv cv-catalogo">
          <div className="cv-bar"><span>{es ? "Catálogo" : "Catalog"}</span><b className="cv-pill">{es ? "Publicado" : "Published"}</b></div>
          <div className="cv-grid3">{[0, 1, 2, 3, 4, 5].map((k) => <div className="cv-item" key={k}><i /><em /><b /></div>)}</div>
        </div>
      );
    case "mapa":
      return (
        <div className="cv cv-mapa">
          <div className="cv-bar"><span>Pipeline</span><b className="cv-pill">US$ 1.2M</b></div>
          <div className="cv-cols">{[es ? "Contacto" : "Contact", es ? "Visita" : "Visit", es ? "Oferta" : "Offer", es ? "Cierre" : "Close"].map((c, i) => <div className="cv-col" key={c}><span>{c}</span>{Array.from({ length: 3 - (i % 2) }).map((_, j) => <i key={j} />)}</div>)}</div>
        </div>
      );
    case "calendario":
      return (
        <div className="cv cv-calendario">
          <div className="cv-bar"><span>{es ? "Calendario · Octubre" : "Calendar · October"}</span><b className="cv-pill">{es ? "Hoy" : "Today"}</b></div>
          <div className="cv-cal">{Array.from({ length: 28 }).map((_, k) => <i key={k} data-ev={[3, 8, 9, 15, 16, 22, 26].includes(k) ? "" : undefined} data-hoy={k === 8 ? "" : undefined} />)}</div>
          <div className="cv-row"><i className="cv-dot" /><span>{es ? "Reunión de junta · 19:00" : "Board meeting · 7:00 pm"}</span></div>
        </div>
      );
    case "respaldo":
      return (
        <div className="cv cv-respaldo">
          <div className="cv-bar"><span>{es ? "Respaldo nocturno" : "Nightly backup"}</span><b className="cv-pill ok">SHA256 ✓</b></div>
          {[["Drive", 92], ["Gmail", 64], [es ? "Calendario" : "Calendar", 100]].map(([k, v]) => <div className="cv-prog" key={String(k)}><span>{k}</span><i style={{ "--w": `${v}%` } as React.CSSProperties} /><b>{v}%</b></div>)}
        </div>
      );
    case "control":
      return (
        <div className="cv cv-control">
          <div className="cv-bar"><span>Godmode</span><b className="cv-pill">12 {es ? "empresas" : "companies"}</b></div>
          <div className="cv-grid3">{[["AX", "ok"], ["SC", "ok"], ["WD", "run"], ["HB", "ok"], ["GM", "ok"], ["MS", "ok"]].map(([c, s]) => <div className="cv-tenant" key={c}><b>{c}</b><em className={`cv-pill ${s}`} /></div>)}</div>
        </div>
      );
    case "reservas":
      return (
        <div className="cv cv-reservas">
          <div className="cv-bar"><span>{es ? "Disponibilidad" : "Availability"}</span><b className="cv-pill">iCal</b></div>
          <div className="cv-cal">{Array.from({ length: 28 }).map((_, k) => <i key={k} data-ev={k >= 5 && k <= 9 ? "" : k >= 17 && k <= 20 ? "" : undefined} />)}</div>
        </div>
      );
    case "invitacion":
      return (
        <div className="cv cv-invitacion">
          <div className="cv-bar"><span>RSVP</span><b className="cv-pill ok">118 / 140</b></div>
          <div className="cv-rows">{["Mesa 1", "Mesa 2", "Mesa 3"].map((m) => <div className="cv-row" key={m}><span>{m}</span><em /></div>)}</div>
        </div>
      );
    default:
      return (
        <div className="cv cv-tabla">
          <div className="cv-bar"><span>{es ? "Operaciones" : "Operations"}</span></div>
          {[0, 1, 2, 3].map((k) => <div className="cv-row" key={k}><span /><em /><b className="cv-pill" /></div>)}
        </div>
      );
  }
}
