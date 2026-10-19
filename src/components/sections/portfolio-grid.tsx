"use client";
// /portfolio: listado completo con filtros por industria y tipo. Los filtros son pills; la selección se
// refleja en la URL (?industria=&tipo=) para poder compartirla. Las tarjetas abren el pop-up del caso
// (misma decisión que en la home: no se cambia de pantalla). Estados: lleno, filtrado y vacío con salida.
import { useEffect, useMemo, useState } from "react";
import { CaseShot } from "@/components/cases";
import { Pill } from "@/components/ui/primitives";
import { CaseModalProvider, CaseTrigger } from "./case-modal";
import type { Caso } from "../../../content/portfolio";
import type { Lang } from "../../../content/site";
import "./portfolio-grid.css";

const T = {
  es: { industria: "Industria", tipo: "Tipo", todas: "Todas", todos: "Todos", n: (n: number) => (n === 1 ? "1 sistema" : `${n} sistemas`), vacio: "Ningún sistema coincide con esos dos filtros.", limpiar: "Quitar filtros", ver: "Ver el caso", tablero: "tablero con datos de muestra" },
  en: { industria: "Industry", tipo: "Type", todas: "All", todos: "All", n: (n: number) => (n === 1 ? "1 system" : `${n} systems`), vacio: "No system matches both filters.", limpiar: "Clear filters", ver: "View case", tablero: "dashboard with sample data" },
};

function Grupo({ label, todos, total, valores, activo, set }: { label: string; todos: string; total: number; valores: { v: string; n: number }[]; activo: string; set: (v: string) => void }) {
  return (
    <div className="pg-group" role="group" aria-label={label}>
      <span className="caps pg-label">{label}</span>
      <div className="pg-pills">
        <button type="button" className={`pg-pill ${activo === "" ? "on" : ""}`} aria-pressed={activo === ""} onClick={() => set("")}>{todos} <span className="num">{total}</span></button>
        {valores.map(({ v, n }) => (
          <button key={v} type="button" className={`pg-pill ${activo === v ? "on" : ""}`} aria-pressed={activo === v} disabled={n === 0 && activo !== v} onClick={() => set(activo === v ? "" : v)}>{v} <span className="num">{n}</span></button>
        ))}
      </div>
    </div>
  );
}

export function PortfolioGrid({ casos, lang }: { casos: Caso[]; lang: Lang }) {
  const t = T[lang];
  const [ind, setInd] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  useEffect(() => { // estado inicial desde la URL
    const u = new URL(location.href);
    const i = u.searchParams.get("industria") ?? ""; const ty = u.searchParams.get("tipo") ?? "";
    const id = setTimeout(() => { setInd(i); setTipo(ty); }, 0); return () => clearTimeout(id);
  }, []);
  useEffect(() => { // URL compartible, sin entradas en el historial
    const u = new URL(location.href);
    if (ind) u.searchParams.set("industria", ind); else u.searchParams.delete("industria");
    if (tipo) u.searchParams.set("tipo", tipo); else u.searchParams.delete("tipo");
    history.replaceState(history.state, "", u);
  }, [ind, tipo]);
  const industrias = useMemo(() => Array.from(new Set(casos.map((c) => c.industria[lang]))).sort((a, b) => a.localeCompare(b)), [casos, lang]);
  const tipos = useMemo(() => Array.from(new Set(casos.map((c) => c.tipo[lang]))).sort((a, b) => a.localeCompare(b)), [casos, lang]);
  const lista = casos.filter((c) => (!ind || c.industria[lang] === ind) && (!tipo || c.tipo[lang] === tipo));
  // cuenta de cada valor con el OTRO filtro aplicado (así se ve qué combinación queda vacía)
  const cuenta = (k: "industria" | "tipo", v: string) => casos.filter((c) => (k === "industria" ? (!tipo || c.tipo[lang] === tipo) && c.industria[lang] === v : (!ind || c.industria[lang] === ind) && c.tipo[lang] === v)).length;
  const total = (k: "industria" | "tipo") => casos.filter((c) => (k === "industria" ? !tipo || c.tipo[lang] === tipo : !ind || c.industria[lang] === ind)).length;

  return (
    <CaseModalProvider casos={casos} lang={lang}>
      <div className="pg" data-motion="filter-grid">
        <div className="pg-filters">
          <Grupo label={t.industria} todos={t.todas} total={total("industria")} valores={industrias.map((v) => ({ v, n: cuenta("industria", v) }))} activo={ind} set={setInd} />
          <Grupo label={t.tipo} todos={t.todos} total={total("tipo")} valores={tipos.map((v) => ({ v, n: cuenta("tipo", v) }))} activo={tipo} set={setTipo} />
        </div>
        <p className="meta pg-count" aria-live="polite">{t.n(lista.length)}</p>
        {lista.length === 0 ? (
          <div className="pg-empty"><p>{t.vacio}</p><button type="button" className="btn secondary sm" onClick={() => { setInd(""); setTipo(""); }}>{t.limpiar}</button></div>
        ) : (
          <ul className="pg-grid">
            {lista.map((c, i) => (
              <li key={c.slug} className="pg-item" style={{ "--i": i } as React.CSSProperties}>
                <CaseTrigger slug={c.slug} href={`/${lang}/portfolio/${c.slug}`} className="pg-card">
                  <CaseShot lang={lang} slug={c.slug} label={`${c.nombre} · ${t.tablero}`} />
                  <span className="pg-top"><span className="pg-t">{c.nombre}</span><Pill variant="ghost">{c.tipo[lang]}</Pill></span>
                  <span className="meta">{c.cliente} · {c.industria[lang]}</span>
                  <span className="pg-r">{c.resumen[lang]}</span>
                  <span className="pg-cta">{t.ver} <span aria-hidden="true">→</span></span>
                </CaseTrigger>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CaseModalProvider>
  );
}
