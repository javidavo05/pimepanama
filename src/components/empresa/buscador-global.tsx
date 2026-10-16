"use client";

/**
 * Buscador global de la suite (fase 6 del CRM): ⌘K / Ctrl+K o el botón «Buscar». Busca pantallas al instante y
 * datos de la empresa (clientes, contactos, leads, proyectos, facturas, cotizaciones, tickets, oportunidades) en
 * /api/empresa/buscar. Sin texto muestra lo reciente y los accesos comunes. Flechas para moverse, Enter para abrir.
 *
 * «Preguntar al asistente» lanza el evento de ventana `pime:asistente` con `{ texto }`: el asistente
 * (asistente-ia/asistente-chat.tsx) lo escucha para abrirse con la pregunta ya escrita.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  accesosComunes, agregarReciente, agrupar, aplanar, buscarPantallas, moverIndice, TIPO_LABEL,
  type Reciente, type Resultado, type TipoResultado,
} from "@/lib/crm/buscar";

const CLAVE = "pime-buscador-recientes";
export const EVENTO_ASISTENTE = "pime:asistente";
export const EVENTO_ABRIR_BUSCADOR = "pime:buscador";

type Grupo = { tipo: TipoResultado; label: string; items: Resultado[] };
type Opcion = { clave: string; titulo: string; detalle?: string | null; tipo: TipoResultado | "asistente"; ir: () => void };

function leerRecientes(): Reciente[] {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) ?? "[]"); return Array.isArray(v) ? v.slice(0, 6) : []; } catch { return []; }
}

function IconoBuscar({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
}

export function BuscadorGlobal({ area, boton = true, className = "" }: { area?: string | null; /** Muestra el botón «Buscar» (para el celular y la barra superior). */ boton?: boolean; className?: string }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const caja = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [datos, setDatos] = useState<Resultado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activo, setActivo] = useState(-1);
  const [recientes, setRecientes] = useState<Reciente[]>([]);
  const [mac, setMac] = useState(true);

  useEffect(() => { setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)); }, []);

  // ⌘K / Ctrl+K abre y cierra; también se abre con el evento `pime:buscador` desde cualquier botón.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setAbierto((a) => !a); } };
    const abrir = () => setAbierto(true);
    window.addEventListener("keydown", k);
    window.addEventListener(EVENTO_ABRIR_BUSCADOR, abrir);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener(EVENTO_ABRIR_BUSCADOR, abrir); };
  }, []);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) { setRecientes(leerRecientes()); d.showModal(); requestAnimationFrame(() => caja.current?.select()); }
    if (!abierto && d.open) d.close();
  }, [abierto]);

  // Datos: con pausa de 250 ms y cancelando la búsqueda anterior.
  useEffect(() => {
    const t = q.trim();
    setError(null);
    if (t.length < 2) { setDatos([]); setCargando(false); return; }
    const ctrl = new AbortController();
    setCargando(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/empresa/buscar?q=${encodeURIComponent(t)}`, { signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? "La búsqueda no respondió.");
        setDatos(((j.grupos ?? []) as Grupo[]).flatMap((g) => g.items).filter((x) => x.tipo !== "pantalla"));
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(e instanceof Error ? e.message : "La búsqueda no respondió.");
      } finally {
        if (!ctrl.signal.aborted) setCargando(false);
      }
    }, 250);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q]);

  const cerrar = useCallback(() => { setAbierto(false); setActivo(-1); }, []);
  const ir = useCallback((r: Reciente) => {
    const nuevos = agregarReciente(leerRecientes(), { tipo: r.tipo, titulo: r.titulo, href: r.href, detalle: r.detalle ?? null });
    try { localStorage.setItem(CLAVE, JSON.stringify(nuevos)); } catch { /* sin almacenamiento */ }
    cerrar(); setQ("");
    router.push(r.href);
  }, [cerrar, router]);
  const preguntar = useCallback(() => {
    const texto = q.trim();
    cerrar(); setQ("");
    window.dispatchEvent(new CustomEvent(EVENTO_ASISTENTE, { detail: { texto } }));
  }, [cerrar, q]);

  const texto = q.trim();
  const grupos = useMemo(() => (texto ? agrupar([...buscarPantallas(texto, area), ...datos]) : []), [texto, datos, area]);

  // Lo que se pinta, en el mismo orden que recorren las flechas.
  const secciones = useMemo((): { titulo: string; opciones: Opcion[] }[] => {
    const asistente: Opcion = { clave: "asistente", tipo: "asistente", titulo: texto ? `Preguntar al asistente: «${texto}»` : "Preguntar al asistente", detalle: "Responde y hace cosas por ti: «¿quién me debe?», «tarea para mañana…»", ir: preguntar };
    if (!texto) {
      return [
        ...(recientes.length ? [{ titulo: "Recientes", opciones: recientes.map((r) => ({ clave: `r-${r.href}`, tipo: r.tipo, titulo: r.titulo, detalle: r.detalle, ir: () => ir(r) })) }] : []),
        { titulo: "Accesos comunes", opciones: accesosComunes(area).map((p) => ({ clave: `a-${p.href}`, tipo: "pantalla" as const, titulo: p.titulo, detalle: p.leyenda, ir: () => ir({ tipo: "pantalla", titulo: p.titulo, href: p.href, detalle: p.leyenda }) })) },
        { titulo: "Asistente", opciones: [asistente] },
      ];
    }
    return [
      ...grupos.map((g) => ({ titulo: g.label, opciones: g.items.map((r) => ({ clave: `${r.tipo}-${r.id}`, tipo: r.tipo, titulo: r.titulo, detalle: r.detalle, ir: () => ir(r) })) })),
      { titulo: "Asistente", opciones: [asistente] },
    ];
  }, [texto, grupos, recientes, area, ir, preguntar]);
  const planas = useMemo(() => secciones.flatMap((s) => s.opciones), [secciones]);

  useEffect(() => { setActivo(texto ? 0 : -1); }, [texto, datos]);
  useEffect(() => { listaRef.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" }); }, [activo]);

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => moverIndice(a, planas.length, e.key === "ArrowDown" ? 1 : -1)); }
    else if (e.key === "Enter") { e.preventDefault(); (planas[activo] ?? (texto ? planas[0] : undefined))?.ir(); }
  }

  const sinResultados = texto.length >= 2 && !cargando && !error && aplanar(grupos).length === 0;
  let indice = -1;

  return (
    <>
      {boton && (
        <button type="button" onClick={() => setAbierto(true)} aria-keyshortcuts="Meta+K Control+K"
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-mid bg-panel px-3 text-sm text-fg-dim hover:text-fg sm:min-h-10 ${className}`}>
          <IconoBuscar className="h-4 w-4" />
          <span>Buscar</span>
          <kbd className="hidden rounded border border-line-mid px-2 text-xs font-sans text-fg-faint md:inline">{mac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      )}
      <dialog ref={dialogo} onClose={cerrar} onClick={(e) => { if (e.target === dialogo.current) cerrar(); }} aria-label="Buscar en la suite"
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 sm:mx-auto sm:mt-[10vh] sm:h-auto sm:max-w-2xl sm:px-4">
        <div className="flex h-full flex-col overflow-hidden bg-panel sm:h-auto sm:max-h-[75vh] sm:rounded-2xl sm:border sm:border-line-mid sm:shadow-2xl">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <IconoBuscar className="h-5 w-5 shrink-0 text-fg-dim" />
            <input ref={caja} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={teclas} type="search" enterKeyHint="go" autoComplete="off" spellCheck={false}
              placeholder="Cliente, factura, ticket o pantalla…" aria-label="Qué buscas" role="combobox" aria-expanded aria-controls="buscador-resultados"
              aria-activedescendant={activo >= 0 ? `buscador-op-${activo}` : undefined}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-trace focus:outline-none" />
            {cargando && <span className="shrink-0 text-xs text-fg-dim" role="status">Buscando…</span>}
            <button type="button" onClick={cerrar} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm text-fg-dim hover:text-fg">Cerrar</button>
          </div>

          <ul ref={listaRef} id="buscador-resultados" role="listbox" aria-label="Resultados" className="min-h-0 flex-1 overflow-y-auto p-2">
            {error && <li className="m-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error} Las pantallas sí aparecen abajo.</li>}
            {sinResultados && (
              <li className="px-3 py-4 text-sm text-fg-dim [overflow-wrap:anywhere]">
                Nada con «{texto}». Prueba con el número de la factura o del ticket, el correo o parte del nombre, o pregúntale al asistente.
              </li>
            )}
            {secciones.map((s) => (
              <li key={s.titulo} role="presentation" className="py-1">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-fg-faint">{s.titulo}</p>
                <ul role="presentation">
                  {s.opciones.map((o) => {
                    indice++;
                    const i = indice;
                    return (
                      <li key={o.clave} id={`buscador-op-${i}`} data-indice={i} role="option" aria-selected={activo === i}
                        onMouseMove={() => setActivo(i)} onClick={o.ir}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${activo === i ? "bg-brand/10" : "hover:bg-fill"}`}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{o.titulo}</span>
                          {o.detalle && <span className="block truncate text-xs text-fg-dim">{o.detalle}</span>}
                        </span>
                        {o.tipo !== "asistente" && s.titulo !== TIPO_LABEL[o.tipo as TipoResultado] && (
                          <span className="hidden shrink-0 rounded-full bg-fill-2 px-2 py-1 text-xs text-fg-dim sm:inline">{TIPO_LABEL[o.tipo as TipoResultado]}</span>
                        )}
                        {activo === i && <span aria-hidden className="hidden shrink-0 text-xs text-fg-faint sm:inline">Enter ↵</span>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <p className="hidden border-t border-line px-4 py-2 text-xs text-fg-faint sm:block">↑ ↓ para moverte · Enter para abrir · Esc para cerrar</p>
        </div>
      </dialog>
    </>
  );
}
