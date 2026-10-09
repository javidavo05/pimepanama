"use client";
// Panel de demostración funcional. Cuatro tableros distintos, cada uno con su propio layout y sus propios
// tipos de gráfica. Nada reacciona al cursor ni se mueve solo: se arma al cargar y cambia cuando la persona
// toca algo. El HTML inicial (Operaciones) viene renderizado del servidor.
import { useState } from "react";
import { LetterChip, Pill } from "@/components/ui/primitives";
import { AreaChart, Calendar, Funnel, Gantt, HBars, Heat, Ring, Stacked } from "./charts";
import { HOME, type Ventana } from "../../../content/home";
import type { Lang } from "../../../content/site";

const money = (v: number) => `US$ ${v.toLocaleString("es-PA").replace(/[.,]/g, " ")}`;

/* ---------- 1. Operaciones: tablero kanban + carga por responsable + semana (gantt) ---------- */
function Operaciones({ d, lang }: { d: Ventana["operaciones"]; lang: Lang }) {
  const [quien, setQuien] = useState<string>("");
  const responsables = Array.from(new Set(d.columnas.flatMap((c) => c.items.map((i) => i.responsable))));
  const carga = responsables.map((r) => ({ label: r, valor: d.columnas.flatMap((c) => c.items).filter((i) => i.responsable === r).reduce((a, i) => a + i.dias * 3 + 6, 0), dim: !!quien && quien !== r }));
  return (
    <div className="hv hv-op">
      <div className="hw-head">
        <div><div className="hw-title">{d.titulo}</div><div className="hw-sub">{lang === "es" ? "Arrastrá en el sistema real; aquí filtrá por responsable" : "Drag in the real system; here, filter by owner"}</div></div>
        <span className="hw-btn">{d.accion}</span>
      </div>
      <div className="hw-chips" role="group" aria-label={lang === "es" ? "Responsable" : "Owner"}>
        <button type="button" className="hw-chip" aria-pressed={quien === ""} onClick={() => setQuien("")}>{d.todos}</button>
        {responsables.map((r) => <button key={r} type="button" className="hw-chip" aria-pressed={quien === r} onClick={() => setQuien(r)}>{r}</button>)}
      </div>
      <div className="hv-op-grid">
        <div className="hv-kanban">
          {d.columnas.map((c, ci) => {
            const items = c.items.filter((i) => !quien || i.responsable === quien);
            return (
              <div className="hv-col" key={c.label} style={{ "--i": ci } as React.CSSProperties}>
                <div className="hv-col-h"><span className="hw-kpi-k">{c.label}</span><b className="num">{items.length}</b></div>
                {items.length === 0 && <div className="hv-col-empty">{lang === "es" ? "Nada aquí" : "Nothing here"}</div>}
                {items.map((it, i) => (
                  <div className="hv-card" key={it.cliente + it.modulo} style={{ "--i": i } as React.CSSProperties}>
                    <div className="hv-card-t">{it.cliente}</div>
                    <div className="hw-sub">{it.modulo}</div>
                    <div className="hv-card-f"><span className="hw-mini-chip ink">{it.responsable.split(" ").map((p) => p[0]).join("")}</span><span className="meta num">{it.dias ? `${it.dias} d` : "✓"}</span></div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="hv-side">
          <div className="hw-card"><span className="hw-kpi-k">{d.cargaTitulo}</span><HBars items={carga} unidad={d.cargaUnidad} id={`carga-${quien}`} /><span className="hw-sub">{d.cargaUnidad}</span></div>
          <div className="hw-card"><span className="hw-kpi-k">{d.semanaTitulo}</span><Gantt filas={d.semana} dias={d.dias} id="gantt" /></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 2. Cobros: cifra grande + anillo de meta + área + antigüedad + vencimientos ---------- */
function Cobros({ d, lang }: { d: Ventana["cobros"]; lang: Lang }) {
  const [periodo, setPeriodo] = useState(0);
  const p = d.periodos[periodo];
  return (
    <div className="hv hv-co">
      <div className="hv-co-top">
        <div className="hv-hero-num">
          <span className="hw-kpi-k">{d.cobradoLabel}</span>
          <span className="hv-big num">{money(d.cobrado)}</span>
          <span className="hw-sub">{d.metaLabel}: {money(d.meta)}</span>
        </div>
        <Ring valor={d.cobrado} meta={d.meta} label={d.metaLabel} id="ring" />
        <div className="hw-chips" role="group" aria-label={lang === "es" ? "Período" : "Period"}>
          {d.periodos.map((x, i) => <button key={x.label} type="button" className="hw-chip" aria-pressed={i === periodo} onClick={() => setPeriodo(i)}>{x.label}</button>)}
        </div>
      </div>
      <div className="hw-card hv-co-chart">
        <span className="hw-kpi-k">{d.graficaTitulo} · {p.label}</span>
        <AreaChart valores={p.valores} etiquetas={p.etiquetas} unidad={d.unidad} id={`area-${periodo}`} />
        <span className="hw-sub">{d.unidad}</span>
      </div>
      <div className="hv-co-bottom">
        <div className="hw-card"><span className="hw-kpi-k">{d.antiguedadTitulo}</span><HBars items={d.antiguedad.map((a) => ({ label: a.label, valor: a.valor }))} unidad="US$" id="aging" /></div>
        <div className="hw-card">
          <span className="hw-kpi-k">{d.vencimientosTitulo}</span>
          <ul className="hv-list">
            {d.vencimientos.map((v, i) => (
              <li key={v.cliente + v.concepto} style={{ "--i": i } as React.CSSProperties}>
                <div className="hv-list-t"><b>{v.cliente}</b><span className="hw-sub">{v.concepto}</span></div>
                <span className="meta">{v.fecha}</span>
                <Pill variant={v.tono}>{v.monto}</Pill>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Clientes: embudo + tarjetas con salud + mapa de calor ---------- */
function Clientes({ d, lang }: { d: Ventana["clientes"]; lang: Lang }) {
  const [etapa, setEtapa] = useState(3);
  const lista = d.clientes.filter((c) => c.etapa === etapa);
  return (
    <div className="hv hv-cl">
      <div className="hw-head">
        <div><div className="hw-title">{d.titulo}</div><div className="hw-sub">{lang === "es" ? "Tocá una etapa del embudo" : "Tap a funnel stage"}</div></div>
        <span className="hw-btn">{d.accion}</span>
      </div>
      <div className="hv-cl-grid">
        <div className="hw-card"><span className="hw-kpi-k">{d.embudoTitulo}</span><Funnel etapas={d.etapas} activa={etapa} onPick={setEtapa} id="funnel" /></div>
        <div className="hv-cards">
          {lista.length === 0 && <div className="hv-col-empty">{lang === "es" ? "Sin cuentas en esta etapa" : "No accounts in this stage"}</div>}
          {lista.map((c, i) => (
            <div className="hw-card hv-client" key={c.nombre} style={{ "--i": i } as React.CSSProperties}>
              <div className="hv-client-h"><LetterChip>{c.nombre.split(" ").slice(0, 2).map((p) => p[0]).join("")}</LetterChip><div><div className="hv-card-t">{c.nombre}</div><div className="hw-sub">{c.industria} · {c.desde}</div></div></div>
              <div className="hv-health"><span className="hw-kpi-k">{d.saludLabel}</span><span className="hv-health-bar"><i style={{ "--w": `${c.salud}%` } as React.CSSProperties} /></span><b className="num">{c.salud}</b></div>
            </div>
          ))}
        </div>
        <div className="hw-card hv-cl-heat"><span className="hw-kpi-k">{d.calorTitulo}</span><Heat filas={d.industrias} cols={d.meses} datos={d.calor} id="heat" unidad="%" /></div>
      </div>
    </div>
  );
}

/* ---------- 4. Documentos: carpetas + lista + calendario + apiladas + pendientes ---------- */
function Documentos({ d, lang }: { d: Ventana["documentos"]; lang: Lang }) {
  const [carpeta, setCarpeta] = useState(0);
  const [firmas, setFirmas] = useState(d.firmas.map((f) => f.hecho));
  const docs = d.docs.filter((x) => carpeta === 0 || x.carpeta === carpeta);
  const hechas = firmas.filter(Boolean).length;
  return (
    <div className="hv hv-do">
      <nav className="hv-folders" aria-label={lang === "es" ? "Carpetas" : "Folders"}>
        {d.carpetas.map((c, i) => (
          <button type="button" key={c.label} className="hv-folder" aria-pressed={carpeta === i} onClick={() => setCarpeta(i)}><span className="hv-folder-ico" /><span>{c.label}</span><b className="num">{c.n}</b></button>
        ))}
      </nav>
      <div className="hv-do-main">
        <div className="hw-head"><div><div className="hw-title">{d.carpetas[carpeta].label === d.carpetas[0].label ? d.titulo : d.carpetas[carpeta].label}</div><div className="hw-sub">{docs.length} {lang === "es" ? "recientes" : "recent"}</div></div><span className="hw-btn">{d.accion}</span></div>
        <ul className="hv-docs">
          {docs.map((x, i) => (
            <li key={x.nombre} style={{ "--i": i } as React.CSSProperties}>
              <span className="hw-mini-chip">{x.tipo}</span>
              <span className="hv-doc-n">{x.nombre}</span>
              <Pill variant={x.estado.tono}>{x.estado.t}</Pill>
              <span className="meta num">{x.fecha}</span>
            </li>
          ))}
        </ul>
        <div className="hw-card"><span className="hw-kpi-k">{d.tipoTitulo}</span><Stacked series={d.porTipo} tipos={d.tipos} meses={d.meses} id="stack" unidad={d.tipoTitulo} /></div>
      </div>
      <div className="hv-do-side">
        <div className="hw-card"><span className="hw-kpi-k">{d.calendarioTitulo}</span><Calendar dias={d.calendario} diasCorto={d.diasCorto} id="cal" unidad={d.calendarioTitulo} /></div>
        <div className="hw-card">
          <div className="hw-card-head"><span className="hw-kpi-k">{d.firmasTitulo}</span><b className="num">{hechas}/{firmas.length}</b></div>
          <span className="hv-health-bar"><i style={{ "--w": `${(hechas / firmas.length) * 100}%` } as React.CSSProperties} /></span>
          <ul className="hv-check">
            {d.firmas.map((f, i) => (
              <li key={f.label}><label><input type="checkbox" checked={firmas[i]} onChange={() => setFirmas(firmas.map((v, j) => (j === i ? !v : v)))} /><span>{f.label}</span></label></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function HeroWindow({ lang }: { lang: Lang }) {
  const v = HOME[lang].hero.ventana;
  const [vista, setVista] = useState(0);
  const id = v.menu[vista].id;
  return (
    <div className="hw" data-motion="hero-window" role="region" aria-label={v.demo}>
      <div className="hw-frame">
        <div className="hw-chrome">
          <div className="hw-brand"><span className="hw-logo" /><span>PIME</span><span className="hw-app">{v.app}</span></div>
          <div className="hw-crumbs"><span>{v.menu[vista].label}</span><span className="on">{v.hoy}</span></div>
          <div className="hw-search"><span className="hw-search-ico" /><span>{v.buscar}</span><kbd>⌘K</kbd></div>
          <span className="hw-user">{v.usuario}</span>
        </div>
        <div className="hw-tabs" role="tablist" aria-label={lang === "es" ? "Vistas" : "Views"}>
          {v.menu.map((t, i) => <button key={t.id} type="button" role="tab" aria-selected={i === vista} className="hw-tab" onClick={() => setVista(i)}>{t.label}</button>)}
        </div>
        <div className="hw-body">
          <nav className="hw-side" aria-label={lang === "es" ? "Vistas" : "Views"}>
            <span className="hw-side-ind" style={{ "--on": vista } as React.CSSProperties} aria-hidden="true" />
            {v.menu.map((t, i) => (
              <button key={t.id} type="button" className={`hw-side-item ${i === vista ? "on" : ""}`} aria-current={i === vista ? "page" : undefined} onClick={() => setVista(i)}>
                <span className="hw-mini-chip" aria-hidden="true">{t.chip}</span>{t.label}
              </button>
            ))}
          </nav>
          <div className="hw-main" key={id}>
            {id === "operaciones" && <Operaciones d={v.operaciones} lang={lang} />}
            {id === "cobros" && <Cobros d={v.cobros} lang={lang} />}
            {id === "clientes" && <Clientes d={v.clientes} lang={lang} />}
            {id === "documentos" && <Documentos d={v.documentos} lang={lang} />}
          </div>
        </div>
      </div>
      <p className="hw-demo-note meta">{v.demo}</p>
    </div>
  );
}
