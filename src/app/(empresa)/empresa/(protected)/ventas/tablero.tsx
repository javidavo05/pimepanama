"use client";

/**
 * Tablero del embudo: una columna por etapa abierta y, debajo, las ganadas y perdidas plegadas.
 * Se mueve de etapa con el selector de cada tarjeta (funciona con teclado y en el celular, sin arrastrar).
 */
import { useActionState, useMemo, useRef, useState } from "react";
import Link from "@/components/empresa/link";
import { btn, seg } from "@/components/empresa/page-header";
import { MensajeEstado } from "@/components/empresa/crm/mensaje-estado";
import { moverOportunidadAction } from "../acciones-embudo";
import { FUENTES, cierreVencido, etiquetaFuente, fechaLegible, resumenEmbudo, totalesPorEtapa, usd, usdCorto } from "@/lib/crm/embudo";

export type OpTablero = {
  id: string;
  titulo: string;
  valor: number;
  probabilidad: number;
  cierreEsperado: string | null;
  estado: string;
  etapaId: string;
  responsableId: string | null;
  fuente: string | null;
  cerradaAt: string | null;
  motivoPerdida: string | null;
  quien: string;
  esLead: boolean;
};
type Etapa = { id: string; nombre: string; probabilidad: number; tipo: string; orden: number };
type Persona = { id: string; nombre: string };

const selectCls = "min-h-11 w-full rounded-lg border border-line-mid bg-fill px-3 pr-8 text-base sm:text-sm text-fg field-select focus:outline-none focus:border-brand";

export function TableroVentas({ etapas, ops, equipo, yo }: { etapas: Etapa[]; ops: OpTablero[]; equipo: Persona[]; yo: string }) {
  const [vista, setVista] = useState<"tablero" | "lista">("tablero");
  const [resp, setResp] = useState("todos");
  const [fuente, setFuente] = useState("todas");
  const [orden, setOrden] = useState<"valor" | "cierre">("valor");

  const nombre = useMemo(() => new Map(equipo.map((p) => [p.id, p.nombre])), [equipo]);
  const abiertas = etapas.filter((e) => e.tipo === "abierta");
  const finales = etapas.filter((e) => e.tipo !== "abierta");

  const filtradas = ops.filter((o) => {
    if (resp === "mias" && o.responsableId !== yo) return false;
    if (resp === "sin" && o.responsableId) return false;
    if (resp !== "todos" && resp !== "mias" && resp !== "sin" && o.responsableId !== resp) return false;
    if (fuente === "sin" && o.fuente) return false;
    if (fuente !== "todas" && fuente !== "sin" && o.fuente !== fuente) return false;
    return true;
  });
  const resumen = resumenEmbudo(filtradas);
  const totales = totalesPorEtapa(etapas, filtradas);
  const hayFiltros = resp !== "todos" || fuente !== "todas";

  if (ops.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-8 text-center">
        <h2 className="text-lg font-semibold text-fg">Todavía no hay oportunidades</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-dim">
          Una oportunidad es un negocio posible con un lead o un cliente: cuánto vale, en qué etapa va y cuándo esperas cerrarlo.
          Aquí vas a ver cada una en su etapa y el pronóstico del mes.
        </p>
        <Link href="/empresa/ventas/nueva" className={`${btn.primary} mt-6`}>Crear la primera oportunidad</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Totales */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Dato titulo="Total abierto" valor={usdCorto(resumen.totalAbierto)} nota={`${resumen.abiertas} oportunidad${resumen.abiertas === 1 ? "" : "es"} en curso`} />
        <Dato titulo="Pronóstico ponderado" valor={usdCorto(resumen.ponderado)} nota="Valor × probabilidad de cada una" />
        <Dato titulo="Cerrado este mes" valor={usdCorto(resumen.cerradoMes)} nota={`${resumen.ganadasMes} ganada${resumen.ganadasMes === 1 ? "" : "s"}`} />
      </div>

      {/* Filtros y vista */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[32rem]">
          <div>
            <label htmlFor="f-resp" className="mb-1 block text-xs font-semibold text-fg-dim">Responsable</label>
            <select id="f-resp" value={resp} onChange={(e) => setResp(e.target.value)} className={selectCls}>
              <option value="todos">Todo el equipo</option>
              <option value="mias">Mías</option>
              {equipo.filter((p) => p.id !== yo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              <option value="sin">Sin responsable</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-fuente" className="mb-1 block text-xs font-semibold text-fg-dim">Fuente</label>
            <select id="f-fuente" value={fuente} onChange={(e) => setFuente(e.target.value)} className={selectCls}>
              <option value="todas">Todas las fuentes</option>
              {FUENTES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              <option value="sin">Sin fuente</option>
            </select>
          </div>
        </div>
        <div className={seg.group} role="group" aria-label="Vista">
          <button type="button" className={seg.item(vista === "tablero")} aria-pressed={vista === "tablero"} onClick={() => setVista("tablero")}>Tablero</button>
          <button type="button" className={seg.item(vista === "lista")} aria-pressed={vista === "lista"} onClick={() => setVista("lista")}>Lista</button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-line bg-panel p-6 text-center">
          <p className="text-sm text-fg-dim">Ninguna oportunidad con estos filtros.</p>
          {hayFiltros && (
            <button type="button" className={`${btn.secondary} mt-4`} onClick={() => { setResp("todos"); setFuente("todas"); }}>Ver todas</button>
          )}
        </div>
      ) : vista === "tablero" ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:flex md:overflow-x-auto md:pb-2">
            {abiertas.map((e) => {
              const items = filtradas.filter((o) => o.etapaId === e.id && o.estado === "abierta");
              const t = totales[e.id];
              return (
                <section key={e.id} aria-label={e.nombre} className="min-w-0 rounded-xl border border-line bg-panel p-3 md:w-72 md:shrink-0">
                  <header className="mb-3 px-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate text-sm font-semibold text-fg">{e.nombre}</h2>
                      <span className="shrink-0 text-xs text-fg-faint">{e.probabilidad} %</span>
                    </div>
                    <p className="mt-1 text-xs text-fg-dim">{t?.cantidad ?? 0} · {usdCorto(t?.valor ?? 0)}</p>
                  </header>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-xs text-fg-faint">Nada en esta etapa</p>
                    ) : (
                      items.map((o) => <Tarjeta key={o.id} o={o} etapas={abiertas} responsable={o.responsableId ? nombre.get(o.responsableId) : undefined} />)
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="space-y-3">
            {finales.map((e) => {
              const items = filtradas.filter((o) => o.etapaId === e.id);
              const t = items.reduce((s, o) => s + o.valor, 0);
              return (
                <details key={e.id} className="group rounded-xl border border-line bg-panel">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-semibold text-fg">{e.nombre} <span className="font-normal text-fg-dim">· {items.length} · {usdCorto(t)}</span></span>
                    <span className="text-xs text-fg-dim group-open:hidden">Mostrar</span>
                    <span className="hidden text-xs text-fg-dim group-open:inline">Ocultar</span>
                  </summary>
                  <div className="border-t border-line p-3">
                    {items.length === 0 ? (
                      <p className="px-1 py-2 text-sm text-fg-faint">{e.tipo === "ganada" ? "Aún no hay negocios ganados." : "Ninguna perdida. Bien."}</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {items.map((o) => (
                          <li key={o.id}>
                            <Link href={`/empresa/ventas/${o.id}`} className="flex min-h-11 flex-col gap-1 px-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                              <span className="min-w-0 [overflow-wrap:anywhere]"><span className="text-sm font-medium text-fg">{o.titulo}</span> <span className="text-xs text-fg-dim">· {o.quien}</span></span>
                              <span className="shrink-0 text-xs text-fg-dim">{usd(o.valor)}{o.cerradaAt ? ` · ${fechaLegible(o.cerradaAt)}` : ""}{o.motivoPerdida ? ` · ${o.motivoPerdida}` : ""}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      ) : (
        <Lista ops={filtradas} etapas={etapas} nombre={nombre} orden={orden} setOrden={setOrden} />
      )}
    </div>
  );
}

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-panel p-4">
      <p className="text-xs font-semibold text-fg-dim">{titulo}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums text-fg">{valor}</p>
      <p className="mt-1 text-xs text-fg-faint">{nota}</p>
    </div>
  );
}

function Tarjeta({ o, etapas, responsable }: { o: OpTablero; etapas: Etapa[]; responsable?: string }) {
  const [estado, mover, moviendo] = useActionState(moverOportunidadAction, null);
  const form = useRef<HTMLFormElement>(null);
  const vencido = cierreVencido(o.cierreEsperado, o.estado);
  return (
    <article className={`rounded-lg border border-line bg-fill p-3 ${moviendo ? "opacity-60" : ""}`}>
      <Link href={`/empresa/ventas/${o.id}`} className="block min-w-0">
        <h3 className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{o.titulo}</h3>
        <p className="mt-1 truncate text-xs text-fg-dim">{o.esLead ? "Lead · " : ""}{o.quien}</p>
      </Link>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="sr-only">Valor</dt>
        <dd className="truncate font-semibold tabular-nums text-sand-fg">{usdCorto(o.valor)}</dd>
        <dt className="sr-only">Cierre esperado</dt>
        <dd className={`truncate text-right ${vencido ? "font-semibold text-danger" : "text-fg-dim"}`}>
          {o.cierreEsperado ? `${vencido ? "Venció " : "Cierra "}${fechaLegible(o.cierreEsperado)}` : "Sin fecha de cierre"}
        </dd>
        <dt className="sr-only">Responsable</dt>
        <dd className="col-span-2 truncate text-fg-faint">{responsable ?? "Sin responsable"}{o.fuente ? ` · ${etiquetaFuente(o.fuente)}` : ""}</dd>
      </dl>
      <form ref={form} action={mover} className="mt-3">
        <input type="hidden" name="id" value={o.id} />
        <label htmlFor={`etapa-${o.id}`} className="sr-only">Mover «{o.titulo}» a otra etapa</label>
        <select
          id={`etapa-${o.id}`}
          name="etapaId"
          defaultValue={o.etapaId}
          disabled={moviendo}
          onChange={() => form.current?.requestSubmit()}
          className="min-h-11 sm:min-h-9 w-full rounded-lg border border-line-mid bg-panel px-3 pr-8 text-base sm:text-xs text-fg-mute field-select focus:outline-none focus:border-brand"
        >
          {etapas.map((e) => <option key={e.id} value={e.id}>Etapa: {e.nombre}</option>)}
        </select>
      </form>
      {estado?.error && <div className="mt-2"><MensajeEstado estado={estado} /></div>}
    </article>
  );
}

function Lista({ ops, etapas, nombre, orden, setOrden }: { ops: OpTablero[]; etapas: Etapa[]; nombre: Map<string, string>; orden: "valor" | "cierre"; setOrden: (o: "valor" | "cierre") => void }) {
  const etapaDe = new Map(etapas.map((e) => [e.id, e.nombre]));
  const lista = [...ops].sort((a, b) =>
    orden === "valor"
      ? b.valor - a.valor
      : (a.cierreEsperado ? +new Date(a.cierreEsperado) : Infinity) - (b.cierreEsperado ? +new Date(b.cierreEsperado) : Infinity),
  );
  return (
    <div className="space-y-3">
      <div className="sm:w-64">
        <label htmlFor="orden" className="mb-1 block text-xs font-semibold text-fg-dim">Ordenar por</label>
        <select id="orden" value={orden} onChange={(e) => setOrden(e.target.value as "valor" | "cierre")} className={selectCls}>
          <option value="valor">Valor, de mayor a menor</option>
          <option value="cierre">Cierre esperado, el más próximo primero</option>
        </select>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {lista.map((o) => {
          const vencido = cierreVencido(o.cierreEsperado, o.estado);
          return (
            <li key={o.id}>
              <Link href={`/empresa/ventas/${o.id}`} className="grid min-h-11 grid-cols-1 gap-1 px-4 py-3 hover:bg-fill sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg [overflow-wrap:anywhere]">{o.titulo}</span>
                  <span className="block truncate text-xs text-fg-dim">{o.esLead ? "Lead · " : ""}{o.quien}</span>
                </span>
                <span className="truncate text-xs text-fg-mute">{etapaDe.get(o.etapaId) ?? "—"} · {o.probabilidad} %</span>
                <span className={`truncate text-xs ${vencido ? "font-semibold text-danger" : "text-fg-dim"}`}>
                  {o.cierreEsperado ? fechaLegible(o.cierreEsperado) : "Sin fecha"} · {o.responsableId ? nombre.get(o.responsableId) ?? "—" : "Sin responsable"}
                </span>
                <span className="text-sm font-semibold tabular-nums text-sand-fg sm:text-right">{usd(o.valor)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
