"use client";
// Ventana de la cuenta del cliente (demostración). Tres partes, cada una funcional con datos de ejemplo:
// - Avance: la fase en curso se completa tarea por tarea, como cuando el equipo cierra trabajo en el código;
//   al llegar al 100 % avisa que está lista para revisión y muestra su factura. Arranca al verse en pantalla;
//   con movimiento reducido no arranca sola y avanza con un botón.
// - Tickets: se escribe uno (viene precargado), se envía, recibe respuesta y estimado, y se aprueba.
// - Facturas: saldo pagado/pendiente y el detalle de cada factura al tocarla.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PORTAL, type Ticket } from "../../../content/portal";
import type { Lang } from "../../../content/site";
import { Logo } from "@/components/ui/logo";

type Vista = "avance" | "tickets" | "facturas";
const money = (v: number) => `US$ ${v.toLocaleString("en-US").replace(/,/g, " ")}`;
const PASO_MS = 2200;

const RM = "(prefers-reduced-motion: reduce)";
function useReducido() {
  return useSyncExternalStore(
    (on) => { const m = window.matchMedia(RM); m.addEventListener("change", on); return () => m.removeEventListener("change", on); },
    () => window.matchMedia(RM).matches,
    () => false,
  );
}

/* ---------- Avance ---------- */
function Avance({ lang, activa }: { lang: Lang; activa: boolean }) {
  const v = PORTAL[lang].ventana;
  const enCurso = 1; // índice de la fase que avanza en la demostración
  const inicial = v.fases[enCurso].hechas;
  const total = v.fases[enCurso].tareas.length;
  const [hechas, setHechas] = useState(inicial);
  const [corriendo, setCorriendo] = useState(false);
  const [feed, setFeed] = useState<{ t: string; tipo: "tarea" | "fase" | "cobro" }[]>(v.feedInicial.map((t) => ({ t, tipo: "tarea" })));
  const reducido = useReducido();
  const raiz = useRef<HTMLDivElement>(null);
  const yaArranco = useRef(false);

  const hechasRef = useRef(inicial);
  const avanzar = useCallback(() => {
    const h = hechasRef.current;
    if (h >= total) return;
    const n = h + 1;
    hechasRef.current = n;
    const f = v.fases[enCurso];
    const corto = f.nombre.split(" · ")[0];
    const nuevos: { t: string; tipo: "tarea" | "fase" | "cobro" }[] = [{ t: v.listo(corto, f.tareas[n - 1]), tipo: "tarea" }];
    if (n === total) nuevos.unshift({ t: v.faseLista(corto), tipo: "fase" }, { t: v.cobro(corto, money(f.precio)), tipo: "cobro" });
    setHechas(n);
    setFeed((fd) => [...nuevos, ...fd].slice(0, 5));
  }, [total, v]);

  // Reproducción: un paso cada PASO_MS mientras corre y queda trabajo.
  const vivo = corriendo && hechas < total;
  useEffect(() => {
    if (!vivo) return;
    const t = window.setTimeout(avanzar, PASO_MS);
    return () => window.clearTimeout(t);
  }, [vivo, hechas, avanzar]);

  // Arranca sola la primera vez que se ve (salvo movimiento reducido).
  useEffect(() => {
    const el = raiz.current;
    if (!el || reducido || !activa) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !yaArranco.current) { yaArranco.current = true; setCorriendo(true); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [reducido, activa]);

  const repetir = () => {
    hechasRef.current = inicial;
    setHechas(inicial);
    setFeed(v.feedInicial.map((t) => ({ t, tipo: "tarea" })));
    setCorriendo(!reducido);
  };

  const pctFase = (i: number) => (i === enCurso ? hechas / total : v.fases[i].hechas / v.fases[i].tareas.length) * 100;
  const pctTotal = Math.round(v.fases.reduce((a, _, i) => a + pctFase(i), 0) / v.fases.length);
  const terminada = hechas >= total;

  return (
    <div className="po-av" ref={raiz}>
      <div className="po-av-top">
        <div className="po-av-proj">
          <span className="po-k">{v.proyecto}</span>
          <span className="po-av-total num" aria-live="polite">{pctTotal} %</span>
          <span className="po-sub">{v.avanceTotal} · {terminada ? v.estados.revision : v.faseDe(enCurso + 1, v.fases.length)}</span>
        </div>
        <div className="po-av-ctrl">
          {terminada ? (
            <button type="button" className="po-btn" onClick={repetir}>{v.repetir}</button>
          ) : reducido ? (
            <button type="button" className="po-btn" onClick={avanzar}>{v.siguiente}</button>
          ) : vivo ? (
            <button type="button" className="po-btn ghost" onClick={() => setCorriendo(false)}>{v.pausa}</button>
          ) : (
            <button type="button" className="po-btn" onClick={() => setCorriendo(true)}>{v.verEnVivo}</button>
          )}
        </div>
      </div>
      <ol className="po-fases">
        {v.fases.map((f, i) => {
          const pct = pctFase(i);
          const estado = pct >= 100 ? (i === enCurso ? "revision" : "hecha") : pct > 0 ? "curso" : "pendiente";
          return (
            <li key={f.nombre} className="po-fase" data-estado={estado}>
              <div className="po-fase-h">
                <span className="po-fase-n">{f.nombre}</span>
                <span className="po-fase-p num">{Math.round(pct)} %</span>
              </div>
              <div className="po-bar" aria-hidden="true"><span style={{ transform: `scaleX(${pct / 100})` }} /></div>
              <span className={`po-pill ${estado}`}>{v.estados[estado as keyof typeof v.estados]}</span>
            </li>
          );
        })}
      </ol>
      <div className="po-feed">
        <span className="po-k">{v.feedTitulo}</span>
        <ul aria-live="polite">
          {feed.map((e, i) => (
            <li key={`${e.t}-${feed.length - i}`} className={`po-ev ${e.tipo}`} data-nuevo={i === 0 && hechas > inicial ? "" : undefined}>
              <span className="po-ev-dot" aria-hidden="true" />
              <span className="po-ev-t">{e.t}</span>
              {(e.tipo === "tarea" || (i === 0 && hechas > inicial)) && (
                <span className="po-ev-m">{[e.tipo === "tarea" ? v.desdeCodigo : null, i === 0 && hechas > inicial ? v.ahora : null].filter(Boolean).join(" · ")}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Tickets ---------- */
function Tickets({ lang }: { lang: Lang }) {
  const t = PORTAL[lang].ventana.tickets;
  const [tipo, setTipo] = useState(1);
  const [texto, setTexto] = useState(t.ejemplo);
  const [lista, setLista] = useState<(Ticket & { respuesta?: boolean; aprobado?: boolean })[]>(t.items);
  const [enviando, setEnviando] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    const id = `T-0${146 + lista.length - t.items.length}`;
    setEnviando(true);
    setLista((l) => [{ id, titulo: texto.trim(), estado: "recibido" }, ...l]);
    timers.current.push(window.setTimeout(() => {
      setLista((l) => l.map((x) => (x.id === id ? { ...x, estado: "en_curso", quien: "Javier", respuesta: true } : x)));
      setEnviando(false);
    }, 1600));
    setTexto("");
  };
  const aprobar = (id: string) => setLista((l) => l.map((x) => (x.id === id ? { ...x, aprobado: true } : x)));

  return (
    <div className="po-tk">
      <form className="po-tk-form" onSubmit={enviar}>
        <span className="po-k">{t.nuevo}</span>
        <div className="po-seg" role="radiogroup" aria-label={t.tipo}>
          {t.tipos.map((x, i) => (
            <button key={x} type="button" role="radio" aria-checked={tipo === i} className="po-seg-b" onClick={() => setTipo(i)}>{x}</button>
          ))}
        </div>
        <label className="po-lbl" htmlFor={`po-tk-${lang}`}>{t.detalle}</label>
        <textarea id={`po-tk-${lang}`} className="po-input" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={140} />
        {!texto.trim() && <span className="po-sub">{t.vacio}</span>}
        <button type="submit" className="po-btn" disabled={!texto.trim() || enviando}>{t.enviar}</button>
      </form>
      <div className="po-tk-list">
        <span className="po-k">{t.lista}</span>
        <ul aria-live="polite">
          {lista.map((x) => (
            <li key={x.id} className="po-tk-i" data-estado={x.estado}>
              <div className="po-tk-h">
                <span className="po-tk-id num">{x.id}</span>
                <span className={`po-pill ${x.estado === "resuelto" ? "hecha" : x.estado === "en_curso" ? "curso" : "pendiente"}`}>{t.estados[x.estado]}{x.quien ? ` · ${x.quien}` : ""}</span>
              </div>
              <span className="po-tk-t">{x.titulo}</span>
              {x.respuesta && (
                <div className="po-tk-r">
                  <span>{t.respuesta}</span>
                  {x.aprobado ? (
                    <span className="po-pill hecha">{t.aprobado}</span>
                  ) : (
                    <div className="po-tk-ap">
                      <span className="po-sub">{t.estimado}</span>
                      <button type="button" className="po-btn sm" onClick={() => aprobar(x.id)}>{t.aprobar}</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Facturas ---------- */
function Facturas({ lang }: { lang: Lang }) {
  const f = PORTAL[lang].ventana.facturas;
  const [abierta, setAbierta] = useState<string | null>(f.items[0].id);
  const pagado = f.items.filter((x) => x.estado === "pagada").reduce((a, x) => a + x.monto, 0);
  const pendiente = f.items.filter((x) => x.estado === "pendiente").reduce((a, x) => a + x.monto, 0);
  const pct = (pagado / (pagado + pendiente)) * 100;
  return (
    <div className="po-fc">
      <div className="po-fc-saldo">
        <div><span className="po-k">{f.pagado}</span><span className="po-fc-n num ok">{money(pagado)}</span></div>
        <div><span className="po-k">{f.pendiente}</span><span className="po-fc-n num run">{money(pendiente)}</span></div>
        <div className="po-fc-bar" aria-hidden="true"><span style={{ transform: `scaleX(${pct / 100})` }} /></div>
        <span className="po-sub">{f.proximo}</span>
      </div>
      <ul className="po-fc-list">
        {f.items.map((x) => {
          const open = abierta === x.id;
          return (
            <li key={x.id} className="po-fc-i" data-open={open || undefined}>
              <button type="button" className="po-fc-row" aria-expanded={open} onClick={() => setAbierta(open ? null : x.id)}>
                <span className="po-fc-c"><b>{x.concepto}</b><span className="po-sub num">{x.id} · {x.fecha}</span></span>
                <span className="po-fc-m num">{money(x.monto)}</span>
                <span className={`po-pill ${x.estado === "pagada" ? "hecha" : "curso"}`}>{f.estados[x.estado]}</span>
              </button>
              {open && (
                <div className="po-fc-d">
                  <ul>{x.lineas.map((l) => <li key={l}>{l}</li>)}</ul>
                  <span className="po-sub">{x.estado === "pendiente" ? f.pagar : f.pdf}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PortalDemo({ lang }: { lang: Lang }) {
  const p = PORTAL[lang];
  const v = p.ventana;
  const [vista, setVista] = useState<Vista>("avance");
  return (
    <div className="po-demo" data-motion="portal-demo">
      <div className="po-steps" role="tablist" aria-label={p.titulo.join(" ")}>
        {p.pasos.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`po-tab-${s.id}`}
            aria-controls="po-panel"
            aria-selected={vista === s.id}
            className="po-step"
            onClick={() => setVista(s.id)}
          >
            <span className="po-step-n num" aria-hidden="true">{i + 1}</span>
            <span className="po-step-b">
              <span className="po-step-t">{s.titulo}</span>
              <span className="po-step-x">{s.texto}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="po-win" id="po-panel" role="tabpanel" aria-labelledby={`po-tab-${vista}`}>
        <div className="po-win-bar">
          <Logo height={16} />
          <span className="po-win-c">{v.cliente}</span>
          <span className="po-win-ej">{v.ejemplo}</span>
        </div>
        <div className="po-win-body" key={vista}>
          {vista === "avance" && <Avance lang={lang} activa />}
          {vista === "tickets" && <Tickets lang={lang} />}
          {vista === "facturas" && <Facturas lang={lang} />}
        </div>
      </div>
    </div>
  );
}
