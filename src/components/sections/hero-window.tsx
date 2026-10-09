"use client";
// Panel de demostración funcional: menú que cambia de vista, períodos que cambian la gráfica, filtros de
// tabla. Nada reacciona al cursor ni se mueve solo: el movimiento ocurre solo cuando la persona toca algo.
// El HTML inicial (vista Operaciones) viene renderizado del servidor.
import { useState } from "react";
import { Pill } from "@/components/ui/primitives";
import { BarChart, Donut, LineChart, Sparkline } from "./charts";
import { HOME } from "../../../content/home";
import type { Lang } from "../../../content/site";

function Digits({ value, prefijo = "", sufijo = "", id }: { value: number; prefijo?: string; sufijo?: string; id: string }) {
  const chars = value.toLocaleString("es-PA").replace(/[.,]/g, " ").split("");
  return (
    <span className="hw-digits" key={id}>
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
  const [vista, setVista] = useState(0);
  const [periodo, setPeriodo] = useState(0);
  const [filtro, setFiltro] = useState(0);
  const w = v.vistas[vista];
  const filas = filtro === 0 ? w.filas : w.filas.filter((f) => f.estado.t === w.filtros[filtro]);
  const serie = w.grafica.periodos[periodo];
  const key = `${w.id}-${periodo}`;
  const cambiar = (i: number) => { setVista(i); setPeriodo(0); setFiltro(0); };

  return (
    <div className="hw" data-motion="hero-window" role="region" aria-label={v.demo}>
      <div className="hw-frame">
        <div className="hw-chrome">
          <div className="hw-brand"><span className="hw-logo" /><span>PIME</span><span className="hw-app">{v.app}</span></div>
          <div className="hw-crumbs"><span>{w.label}</span><span className="on">{lang === "es" ? "Hoy" : "Today"}</span></div>
          <div className="hw-search"><span className="hw-search-ico" /><span>{v.buscar}</span><kbd>⌘K</kbd></div>
          <span className="hw-user">{v.usuario}</span>
        </div>

        {/* Pestañas en teléfono */}
        <div className="hw-tabs" role="tablist" aria-label={lang === "es" ? "Vistas" : "Views"}>
          {v.vistas.map((t, i) => (
            <button key={t.id} type="button" role="tab" aria-selected={i === vista} className="hw-tab" onClick={() => cambiar(i)}>{t.label}</button>
          ))}
        </div>

        <div className="hw-body">
          <nav className="hw-side" aria-label={lang === "es" ? "Vistas" : "Views"}>
            <span className="hw-side-ind" style={{ "--on": vista } as React.CSSProperties} aria-hidden="true" />
            {v.vistas.map((t, i) => (
              <button key={t.id} type="button" className={`hw-side-item ${i === vista ? "on" : ""}`} aria-current={i === vista ? "page" : undefined} onClick={() => cambiar(i)}>
                <span className="hw-mini-chip" aria-hidden="true">{t.chip}</span>{t.label}
              </button>
            ))}
          </nav>

          <div className="hw-main" key={w.id}>
            <div className="hw-head">
              <div><div className="hw-title">{w.titulo}</div><div className="hw-sub">{v.hoy}</div></div>
              <span className="hw-btn">{w.accion}</span>
            </div>
            <div className="hw-kpis">
              {w.kpis.map((k, i) => (
                <div className="hw-kpi" key={k.k} style={{ "--i": i } as React.CSSProperties}>
                  <span className="hw-kpi-k">{k.k}</span>
                  <span className="hw-kpi-v"><Digits value={k.v} prefijo={k.prefijo} sufijo={k.sufijo} id={w.id} /></span>
                  <Sparkline serie={k.serie} id={w.id} />
                </div>
              ))}
            </div>
            <div className="hw-charts">
              <div className="hw-card">
                <div className="hw-card-head">
                  <span className="hw-kpi-k">{w.grafica.titulo}</span>
                  <div className="hw-chips" role="group" aria-label={lang === "es" ? "Período" : "Period"}>
                    {w.grafica.periodos.map((p, i) => (
                      <button key={p.label} type="button" className="hw-chip" aria-pressed={i === periodo} onClick={() => setPeriodo(i)}>{p.label}</button>
                    ))}
                  </div>
                </div>
                {w.grafica.tipo === "linea"
                  ? <LineChart valores={serie.valores} etiquetas={w.grafica.etiquetas} unidad={w.grafica.unidad} id={key} />
                  : <BarChart valores={serie.valores} etiquetas={w.grafica.etiquetas} unidad={w.grafica.unidad} id={key} />}
                <span className="hw-sub">{w.grafica.unidad} · {serie.label}</span>
              </div>
              <div className="hw-card">
                <span className="hw-kpi-k">{w.dona.titulo}</span>
                <Donut partes={w.dona.partes} id={w.id} titulo={w.dona.titulo} />
              </div>
            </div>
            <div className="hw-table">
              <div className="hw-table-bar">
                <div className="hw-chips" role="group" aria-label={lang === "es" ? "Filtro" : "Filter"}>
                  {w.filtros.map((f, i) => (
                    <button key={f} type="button" className="hw-chip" aria-pressed={i === filtro} onClick={() => setFiltro(i)}>{f}</button>
                  ))}
                </div>
                <span className="hw-sub num">{filas.length} / {w.filas.length}</span>
              </div>
              <div className="hw-tr hw-th">{w.columnas.map((c) => <span key={c}>{c}</span>)}</div>
              {filas.length === 0 && <div className="hw-empty">{lang === "es" ? "Nada con ese estado hoy." : "Nothing with that status today."}</div>}
              {filas.map((f, i) => (
                <div className="hw-tr" key={f.cliente} style={{ "--i": i } as React.CSSProperties}>
                  <span className="hw-td strong">{f.cliente}</span>
                  <span className="hw-td">{f.modulo}</span>
                  <span className="hw-td">{f.responsable}</span>
                  <span className="hw-td hw-estado"><Pill variant={f.estado.tono}>{f.estado.t}</Pill></span>
                  <span className="hw-td num right">{f.monto}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="hw-demo-note meta">{v.demo}</p>
    </div>
  );
}
