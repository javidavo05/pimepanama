"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/empresa/link";
import { btn, seg } from "@/components/empresa/page-header";
import { campo } from "@/components/empresa/clientes/formularios";
import { chip, fechaHora } from "@/components/empresa/crm-ficha/comun";
import { faltaParaEnviar, propuestaAlDia, type RespuestaVista } from "@/lib/leads/respuestas-comun";
import {
  descartarRespuestaAction,
  enviarRespuestasAction,
  guardarRespuestaAction,
  marcarLinkedinAction,
  prepararPropuestaAction,
} from "./acciones-respuestas";

type Buzon = { id: string; label: string; username: string };
type Filtro = "revisar" | "enviadas" | "descartadas" | "todas";
type Cambios = { para: string; asunto: string; cuerpo: string; adjuntarPdf: boolean };

const etiqueta = "block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2";
const botonTexto = "inline-flex items-center min-h-11 sm:min-h-9 px-2 -mx-2 rounded-lg text-sm font-medium text-brand-fg hover:underline disabled:opacity-50 disabled:pointer-events-none";

const enFiltro = (r: RespuestaVista, f: Filtro) =>
  f === "todas" ? true
    : f === "revisar" ? r.estado === "borrador" || r.estado === "fallo"
    : f === "enviadas" ? r.estado === "enviada"
    : r.estado === "descartada";

type Tono = "ok" | "pendiente" | "falta" | "neutro";

/** Semáforo de cada pieza: verde lista, naranja pendiente, rojo no existe. */
const TONO: Record<Tono, { caja: string; punto: string }> = {
  ok: { caja: "border-ok/30 bg-ok/10 text-ok", punto: "bg-ok" },
  pendiente: { caja: "border-warn/30 bg-warn/10 text-warn", punto: "bg-warn" },
  falta: { caja: "border-danger/30 bg-danger/10 text-danger", punto: "bg-danger" },
  neutro: { caja: "border-line bg-fill text-fg-faint", punto: "bg-fg-faint" },
};

function Celda({ titulo, tono, texto, children }: { titulo: string; tono: Tono; texto: string; children?: React.ReactNode }) {
  return (
    <div className={`flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 ${TONO[tono].caja}`}>
      <span className="min-w-0">
        {/* El título solo hace falta cuando no está la cabecera de columnas (debajo de xl). */}
        <span className="block text-[11px] font-semibold uppercase tracking-widest opacity-75 xl:hidden">{titulo}</span>
        <span className="flex items-center gap-2 text-xs font-semibold">
          <span className={`size-2 shrink-0 rounded-full ${TONO[tono].punto}`} aria-hidden />
          <span className="truncate">{texto}</span>
        </span>
      </span>
      {children}
    </div>
  );
}

function estadoCorreo(r: RespuestaVista): { tono: Tono; texto: string } {
  if (r.estado === "enviada") return { tono: "ok", texto: r.enviadaAt ? `Enviado ${fechaHora(r.enviadaAt, false)}` : "Enviado" };
  if (r.estado === "descartada") return { tono: "neutro", texto: "Descartado" };
  if (r.estado === "fallo") return { tono: "falta", texto: "No salió" };
  if (!r.para) return { tono: "falta", texto: "Sin correo" };
  return { tono: "pendiente", texto: "Por enviar" };
}

function estadoLinkedin(r: RespuestaVista): { tono: Tono; texto: string } {
  if (!r.mensajeLinkedin) return { tono: "falta", texto: "No existe" };
  if (r.linkedinAt) return { tono: "ok", texto: "Enviado" };
  return { tono: "pendiente", texto: "Pendiente" };
}

/** Barra de avance: lo hecho más una estimación del que va en curso, que nunca llega sola al final. */
function Progreso({ texto, hechas, total, desde, porItemMs }: { texto: string; hechas: number; total: number; desde: number; porItemMs: number }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const enCurso = hechas < total ? Math.min(0.9, (ahora - desde) / porItemMs) : 0;
  const pct = Math.round(((hechas + enCurso) / Math.max(total, 1)) * 100);
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="min-w-0 text-fg-mute [overflow-wrap:anywhere]">{texto}</span>
        <span className="shrink-0 font-semibold tabular-nums text-fg">{pct} %</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={texto}>
        <div className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-fg-faint tabular-nums">{hechas} de {total} listas</span>
    </div>
  );
}

function sin<T>(obj: Record<string, T>, clave: string): Record<string, T> {
  const copia = { ...obj };
  delete copia[clave];
  return copia;
}

/** Columnas de cada fila desde xl: casilla, prospecto, correo, PDF, LinkedIn y acción. */
const COLUMNAS = "xl:grid-cols-[2.75rem_minmax(0,1fr)_11rem_12rem_10rem_8rem]";

const pdfUrl = (id: string) => `/api/empresa/leads/respuestas/${id}/pdf?inline=1`;

export function RespuestasView({ inicial, buzones }: { inicial: RespuestaVista[]; buzones: Buzon[] }) {
  const [respuestas, setRespuestas] = useState(inicial);
  const [filtro, setFiltro] = useState<Filtro>(inicial.some((r) => enFiltro(r, "revisar")) ? "revisar" : "todas");
  const [buzonId, setBuzonId] = useState(buzones[0]?.id ?? "");
  const [abierta, setAbierta] = useState<string | null>(null);
  // Lo que se editó y todavía no se guardó. Se guarda solo antes de enviar.
  const [cambios, setCambios] = useState<Record<string, Cambios>>({});
  const [quitadas, setQuitadas] = useState<Set<string>>(new Set());
  // Lo que está corriendo en una tanda. Con `total`, la pantalla muestra la barra de avance.
  const [ocupado, setOcupado] = useState<{ lote: string; texto: string; hechas?: number; total?: number; desde?: number; porItemMs?: number; ids?: string[]; tipo?: "preparar" | "enviar" } | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const buzon = buzones.find((b) => b.id === buzonId) ?? null;
  const conCambios = (r: RespuestaVista): RespuestaVista => (cambios[r.id] ? { ...r, ...cambios[r.id] } : r);
  const reemplazar = (lista: RespuestaVista[]) =>
    setRespuestas((prev) => prev.map((r) => lista.find((n) => n.id === r.id) ?? r));

  const cuenta = (f: Filtro) => respuestas.filter((r) => enFiltro(r, f)).length;

  const lotes = useMemo(() => {
    const grupos = new Map<string, RespuestaVista[]>();
    for (const r of respuestas) {
      if (!enFiltro(r, filtro)) continue;
      grupos.set(r.lote, [...(grupos.get(r.lote) ?? []), r]);
    }
    return [...grupos.entries()]
      .map(([lote, filas]) => ({ lote, filas, desde: filas.reduce((m, r) => (r.createdAt < m ? r.createdAt : m), filas[0].createdAt) }))
      .sort((a, b) => b.desde.localeCompare(a.desde));
  }, [respuestas, filtro]);

  // Una sola acción principal en la pantalla: el envío de la tanda más reciente que tiene algo listo.
  const lotePrincipal = lotes.find(({ filas }) => filas.some((r) => !faltaParaEnviar(cambios[r.id] ? { ...r, ...cambios[r.id] } : r)))?.lote;

  async function guardarSiHaceFalta(ids: string[]): Promise<string | null> {
    for (const id of ids) {
      const c = cambios[id];
      if (!c) continue;
      const r = await guardarRespuestaAction(id, c);
      if (!r.ok) return r.error;
      reemplazar([r.dato]);
      setCambios((prev) => sin(prev, id));
    }
    return null;
  }

  async function enviar(lote: string, ids: string[]) {
    if (!buzon) return setAviso({ tipo: "error", texto: "Conecta un buzón en Correos para poder enviar." });
    setConfirmar(null);
    setAviso(null);
    setOcupado({ lote, texto: "Guardando cambios…" });
    const errGuardar = await guardarSiHaceFalta(ids);
    if (errGuardar) {
      setOcupado(null);
      return setAviso({ tipo: "error", texto: errGuardar });
    }
    let faltan = ids, enviadas = 0;
    const fallos: string[] = [];
    try {
      while (faltan.length) {
        setOcupado({ lote, texto: `Enviando ${Math.min(enviadas + fallos.length + 1, ids.length)} de ${ids.length}…`, hechas: enviadas + fallos.length, total: ids.length, desde: Date.now(), porItemMs: 6000, ids: faltan, tipo: "enviar" });
        const r = await enviarRespuestasAction(faltan, buzon.id);
        if (!r.ok) { fallos.push(r.error); break; }
        reemplazar(r.dato.respuestas);
        enviadas += r.dato.enviadas.length;
        fallos.push(...r.dato.fallos.map((f) => f.error));
        faltan = r.dato.faltan;
      }
    } catch {
      fallos.push("Se cortó la conexión. Lo que ya salió quedó marcado como enviado; vuelve a intentar con el resto.");
    }
    setOcupado(null);
    if (fallos.length) {
      setAviso({ tipo: "error", texto: `Salieron ${enviadas} de ${ids.length}. ${fallos[0]}${fallos.length > 1 ? ` (y ${fallos.length - 1} más: mira las marcadas «No salió»)` : ""}` });
    } else {
      setAviso({ tipo: "ok", texto: enviadas === 1 ? `Listo: salió 1 correo desde ${buzon.username}.` : `Listo: salieron ${enviadas} correos desde ${buzon.username}.` });
    }
  }

  /** Primera vez: correo y PDF. Si ya había PDF, lo rehace desde el correo tal como está (con lo editado). */
  async function prepararPropuestas(lote: string, ids: string[]) {
    setAviso(null);
    setOcupado({ lote, texto: "Guardando cambios…" });
    const errGuardar = await guardarSiHaceFalta(ids);
    if (errGuardar) {
      setOcupado(null);
      return setAviso({ tipo: "error", texto: errGuardar });
    }
    let hechas = 0;
    for (const id of ids) {
      const quien = respuestas.find((r) => r.id === id);
      setOcupado({ lote, texto: `Redactando la propuesta de ${quien?.lead.company || quien?.lead.name || "…"}`, hechas, total: ids.length, desde: Date.now(), porItemMs: quien?.tienePropuesta ? 25000 : 45000, ids: [id], tipo: "preparar" });
      const r = await prepararPropuestaAction(id, !!quien?.tienePropuesta).catch(() => ({ ok: false as const, error: "Se cortó la conexión." }));
      if (!r.ok) {
        setOcupado(null);
        return setAviso({ tipo: "error", texto: `Quedaron ${hechas} de ${ids.length} propuestas. ${r.error}` });
      }
      reemplazar([r.dato]);
      hechas++;
    }
    setOcupado(null);
    setAviso({ tipo: "ok", texto: hechas === 1 ? "La propuesta y su correo están listos. Revísalos con «Revisar» y «Ver PDF» antes de enviar." : `Las ${hechas} propuestas y sus correos están listos. Revísalos con «Revisar» y «Ver PDF» antes de enviar.` });
  }

  if (respuestas.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel px-6 py-12 text-center">
        <p className="text-sm font-medium text-fg-mute">Todavía no hay respuestas para revisar</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-faint">
          Cada mañana el agente de prospección carga una tanda de prospectos con el correo y el mensaje de LinkedIn ya
          redactados. Aparecen aquí para que los revises, prepares la propuesta en PDF y los envíes.
        </p>
        <Link href="/empresa/leads" className={`${btn.secondary} mt-6`}>Ver los prospectos</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 lg:flex lg:items-end lg:justify-between">
        {/* Cuatro filtros no caben en una fila del celular: dos por fila hasta sm. */}
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-fill p-1 sm:inline-grid sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none" aria-label="Qué respuestas ver">
          {([
            ["revisar", "Por revisar"],
            ["enviadas", "Enviadas"],
            ["descartadas", "Descartadas"],
            ["todas", "Todas"],
          ] as [Filtro, string][]).map(([f, texto]) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={seg.item(filtro === f)}>
              {texto} <span className="text-fg-faint tabular-nums">{cuenta(f)}</span>
            </button>
          ))}
        </div>
        {buzones.length > 0 ? (
          <label className="grid gap-2 lg:w-80">
            <span className="text-fg-dim text-xs font-semibold uppercase tracking-widest">Enviar desde</span>
            <select value={buzonId} onChange={(e) => setBuzonId(e.target.value)} className={`${campo} field-select pr-8`}>
              {buzones.map((b) => <option key={b.id} value={b.id}>{b.username}</option>)}
            </select>
          </label>
        ) : (
          <p className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
            No hay un buzón conectado: puedes revisar y preparar las propuestas, pero para enviar hay que <Link href="/empresa/correos" className="underline">conectar uno en Correos</Link>.
          </p>
        )}
      </div>

      {aviso && (
        <div role={aviso.tipo === "error" ? "alert" : "status"}
          className={`flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${aviso.tipo === "ok" ? "border-ok/20 bg-ok/[0.08] text-ok" : "border-danger/25 bg-danger/[0.08] text-danger"}`}>
          <span className="min-w-0 [overflow-wrap:anywhere]">{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="shrink-0 min-h-8 px-2">×</button>
        </div>
      )}

      {lotes.length === 0 ? (
        <div className="rounded-xl border border-line bg-panel px-6 py-12 text-center">
          <p className="text-sm text-fg-dim">
            {filtro === "revisar" ? "No queda nada por revisar: todas las respuestas se enviaron o se descartaron." : "No hay respuestas en esta vista."}
          </p>
          <button type="button" onClick={() => setFiltro("todas")} className={`${botonTexto} mt-4`}>Ver todas las respuestas</button>
        </div>
      ) : (
        lotes.map(({ lote, filas, desde }) => {
          const listas = filas.filter((r) => !faltaParaEnviar(conCambios(r)));
          const elegidas = listas.filter((r) => !quitadas.has(r.id));
          // Todas las que siguen abiertas y no tienen propuesta, tengan o no correo.
          // Sin PDF o con un PDF que ya no coincide con el correo.
          const sinPropuesta = filas.filter((r) => !propuestaAlDia(conCambios(r)) && (r.estado === "borrador" || r.estado === "fallo"));
          const abiertas = filas.filter((r) => r.estado === "borrador" || r.estado === "fallo");
          const ocupadoAqui = ocupado?.lote === lote;
          const resumen: [Tono, string][] = [
            [listas.length ? "ok" : "neutro", `${listas.length} por enviar`],
            [sinPropuesta.length ? "falta" : "ok", sinPropuesta.length ? `${sinPropuesta.length} PDF por preparar` : "PDF listos"],
            [filas.some((r) => !r.para) ? "pendiente" : "ok", `${filas.filter((r) => !r.para).length} sin correo`],
          ];
          return (
            <section key={lote} className="rounded-2xl border border-line bg-panel" aria-labelledby={`lote-${lote}`}>
              <header className="grid gap-4 border-b border-line p-4 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <h2 id={`lote-${lote}`} className="text-fg text-base font-semibold tracking-tight">Tanda del {fechaHora(desde)}</h2>
                    <p className="mt-1 text-sm text-fg-dim">{filas.length} {filas.length === 1 ? "respuesta" : "respuestas"}</p>
                  </div>
                  {abiertas.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 lg:flex">
                      <button type="button" disabled={!!ocupado || !sinPropuesta.length} onClick={() => prepararPropuestas(lote, sinPropuesta.map((r) => r.id))} className={btn.secondary}>
                        {sinPropuesta.length ? `Preparar ${sinPropuesta.length === 1 ? "1 propuesta" : `${sinPropuesta.length} propuestas`}` : "Propuestas listas"}
                      </button>
                      <button type="button" disabled={!!ocupado || !elegidas.length || !buzon} onClick={() => setConfirmar(lote)}
                        className={lote === lotePrincipal ? btn.primary : btn.secondary}>
                        {!elegidas.length ? "Nada para enviar" : elegidas.length === 1 ? "Enviar 1 correo" : `Enviar ${elegidas.length} correos`}
                      </button>
                    </div>
                  )}
                </div>
                <ul className="grid gap-2 sm:grid-cols-3" aria-label="Resumen de la tanda">
                  {resumen.map(([tono, texto]) => (
                    <li key={texto} className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${TONO[tono].caja}`}>
                      <span className={`size-2 shrink-0 rounded-full ${TONO[tono].punto}`} aria-hidden />{texto}
                    </li>
                  ))}
                </ul>
              </header>

              {(confirmar === lote || ocupadoAqui) && (
                <div className="border-b border-line bg-fill px-4 py-4 sm:px-6" role="status">
                  {ocupadoAqui && ocupado!.total ? (
                    <Progreso texto={ocupado!.texto} hechas={ocupado!.hechas ?? 0} total={ocupado!.total} desde={ocupado!.desde ?? Date.now()} porItemMs={ocupado!.porItemMs ?? 15000} />
                  ) : ocupadoAqui ? (
                    <p className="text-sm text-fg-mute">{ocupado!.texto}</p>
                  ) : (
                    <div className="grid gap-4 sm:flex sm:items-center sm:justify-between">
                      <p className="text-sm text-fg-mute">
                        Van a salir {elegidas.length === 1 ? "1 correo" : `${elegidas.length} correos`} desde <strong className="text-fg">{buzon?.username}</strong>
                        {elegidas.some((r) => conCambios(r).adjuntarPdf) ? ", con la propuesta en PDF donde está marcada" : ""}. Cada uno queda en Enviados y en la ficha del lead.
                      </p>
                      <div className="grid grid-flow-col auto-cols-fr gap-2 sm:flex">
                        <button type="button" onClick={() => setConfirmar(null)} className={btn.secondary}>Cancelar</button>
                        <button type="button" onClick={() => enviar(lote, elegidas.map((r) => r.id))} className={btn.primary}>Sí, enviar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cabecera de columnas: desde xl las celdas van alineadas como tabla. */}
              <div className={`hidden xl:grid ${COLUMNAS} gap-x-4 border-b border-line px-6 py-2 text-[11px] font-semibold uppercase tracking-widest text-fg-faint`} aria-hidden>
                <span /><span>Prospecto</span><span>Correo</span><span>Propuesta PDF</span><span>LinkedIn</span><span />
              </div>

              <ul className="divide-y divide-line">
                {filas.map((r0) => {
                  const r = conCambios(r0);
                  const falta = faltaParaEnviar(r);
                  const empresa = r.lead.company || r.lead.name;
                  const abiertaAqui = abierta === r.id;
                  const preparando = ocupado?.tipo === "preparar" && !!ocupado.ids?.includes(r.id);
                  const correo = estadoCorreo(r);
                  const li = estadoLinkedin(r);
                  const abierta_ = r.estado === "borrador" || r.estado === "fallo";
                  const alDia = propuestaAlDia(r);
                  const pdf: { tono: Tono; texto: string } = preparando ? { tono: "pendiente", texto: "Preparando…" }
                    : alDia ? { tono: "ok", texto: "Lista" }
                    : r.tienePropuesta ? { tono: abierta_ ? "pendiente" : "ok", texto: abierta_ ? "No coincide" : "Enviada" }
                    : { tono: "falta", texto: "No existe" };
                  return (
                    <li key={r.id}>
                      <div className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 px-4 py-4 sm:px-6 xl:items-center xl:gap-y-0 ${COLUMNAS}`}>
                        <div className="flex min-h-11 items-center">
                          {falta ? (
                            <span className="block size-5" aria-hidden />
                          ) : (
                            // La caja mide 20 px; la etiqueta da los 44 px de toque.
                            <label className="-m-3 flex size-11 cursor-pointer items-center justify-center">
                            <input type="checkbox" className="size-5 accent-brand"
                              checked={!quitadas.has(r.id)} disabled={!!ocupado}
                              aria-label={`Incluir a ${empresa} en el envío`}
                              onChange={(e) => setQuitadas((prev) => { const n = new Set(prev); if (e.target.checked) n.delete(r.id); else n.add(r.id); return n; })} />
                            </label>
                          )}
                        </div>
                        <button type="button" onClick={() => setAbierta(abiertaAqui ? null : r.id)} aria-expanded={abiertaAqui}
                          className="min-w-0 text-left group">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-fg group-hover:underline [overflow-wrap:anywhere]">{empresa}</span>
                            {cambios[r.id] && <span className={`${chip} bg-warn/10 text-warn`}>Sin guardar</span>}
                          </span>
                          <span className="block text-xs text-fg-faint [overflow-wrap:anywhere] line-clamp-2">
                            {r.para ?? "Sin correo"}{r.asunto ? ` · ${r.asunto}` : ""}
                          </span>
                        </button>
                        {/* Debajo de xl: las tres piezas y la acción en una cuadrícula de 2 × 2, iguales en cada fila. */}
                        <div className="col-span-2 grid grid-cols-2 gap-2 xl:contents">
                          <Celda titulo="Correo" {...correo} />
                          <Celda titulo="PDF" {...pdf}>
                            {!alDia && abierta_ && !preparando && (
                              <button type="button" disabled={!!ocupado} onClick={() => prepararPropuestas(lote, [r.id])}
                                className="-my-1 inline-flex min-h-9 min-w-11 shrink-0 items-center justify-center rounded-md bg-panel px-2 text-xs font-semibold text-fg hover:bg-fill disabled:opacity-50">
                                {r.tienePropuesta ? "Rehacer" : "Preparar"}
                              </button>
                            )}
                            {alDia && (
                              <a href={pdfUrl(r.id)} target="_blank" rel="noreferrer" className="-my-1 inline-flex min-h-9 min-w-11 shrink-0 items-center justify-center rounded-md bg-panel px-2 text-xs font-semibold text-fg hover:bg-fill">Ver</a>
                            )}
                          </Celda>
                          <Celda titulo="LinkedIn" {...li} />
                          <button type="button" onClick={() => setAbierta(abiertaAqui ? null : r.id)} aria-expanded={abiertaAqui}
                            className={`${btn.secondary} w-full`}>
                            {abiertaAqui ? "Cerrar" : "Revisar"}
                          </button>
                        </div>
                      </div>
                      {abiertaAqui && (
                        <Detalle
                          r={r}
                          editable={abierta_}
                          ocupado={!!ocupado}
                          puedeEnviar={!!buzon}
                          onCambio={(c) => setCambios((prev) => ({ ...prev, [r.id]: c }))}
                          onActualizada={(n) => { reemplazar([n]); setCambios((prev) => sin(prev, r.id)); }}
                          onEnviar={() => enviar(lote, [r.id])}
                          onPreparar={() => prepararPropuestas(lote, [r.id])}
                          onAviso={setAviso}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function Detalle({ r, editable, ocupado, puedeEnviar, onCambio, onActualizada, onEnviar, onPreparar, onAviso }: {
  r: RespuestaVista;
  editable: boolean;
  ocupado: boolean;
  puedeEnviar: boolean;
  onCambio: (c: Cambios) => void;
  onActualizada: (r: RespuestaVista) => void;
  onEnviar: () => void;
  /** Prepara la propuesta con la barra de avance de la tanda. */
  onPreparar: () => void;
  onAviso: (a: { tipo: "ok" | "error"; texto: string } | null) => void;
}) {
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const valores: Cambios = { para: r.para ?? "", asunto: r.asunto, cuerpo: r.cuerpo, adjuntarPdf: r.adjuntarPdf };
  const cambiar = (p: Partial<Cambios>) => onCambio({ ...valores, ...p });
  const falta = faltaParaEnviar(r);
  const bloqueado = ocupado || !!trabajando;
  const f = (k: string) => `respuesta-${r.id}-${k}`;

  async function correr(texto: string, accion: () => Promise<{ ok: true; dato: RespuestaVista } | { ok: false; error: string }>, ok?: string) {
    setTrabajando(texto);
    onAviso(null);
    try {
      const res = await accion();
      if (res.ok) { onActualizada(res.dato); if (ok) onAviso({ tipo: "ok", texto: ok }); }
      else onAviso({ tipo: "error", texto: res.error });
    } catch {
      onAviso({ tipo: "error", texto: "Se cortó la conexión. Vuelve a intentar." });
    } finally {
      setTrabajando(null);
    }
  }

  const buscarLinkedin = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(r.lead.company || r.lead.name)}`;

  return (
    <div className="grid gap-6 border-t border-line bg-fill/50 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="grid content-start gap-4 min-w-0">
        <h3 className="text-fg text-sm font-semibold">Correo</h3>
        {r.estado === "fallo" && r.error && <p className="text-sm text-danger" role="alert">La última vez no salió: {r.error}</p>}
        <div>
          <label htmlFor={f("para")} className={etiqueta}>Para</label>
          <input id={f("para")} type="email" inputMode="email" autoComplete="off" disabled={!editable} value={valores.para}
            placeholder="correo@empresa.com" onChange={(e) => cambiar({ para: e.target.value })} className={campo} />
        </div>
        <div>
          <label htmlFor={f("asunto")} className={etiqueta}>Asunto</label>
          <input id={f("asunto")} disabled={!editable} value={valores.asunto} maxLength={200}
            onChange={(e) => cambiar({ asunto: e.target.value })} className={campo} />
        </div>
        <div>
          <label htmlFor={f("cuerpo")} className={etiqueta}>Texto</label>
          <textarea id={f("cuerpo")} disabled={!editable} value={valores.cuerpo} rows={14}
            onChange={(e) => cambiar({ cuerpo: e.target.value })} className={`${campo} py-3 leading-relaxed`} />
          <p className="mt-2 text-xs text-fg-faint">Al final va la firma del buzón. Si falta la dirección postal o el enlace de baja, se agregan solos al enviar.</p>
        </div>

        <div className="grid gap-4 rounded-xl border border-line bg-panel p-4">
          <label className="flex min-h-11 items-center gap-3 text-sm text-fg-mute">
            <input type="checkbox" className="size-5 accent-brand" disabled={!editable} checked={valores.adjuntarPdf}
              onChange={(e) => cambiar({ adjuntarPdf: e.target.checked })} />
            Adjuntar la propuesta en PDF
          </label>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {r.tienePropuesta ? (
              <>
                <a href={pdfUrl(r.id)} target="_blank" rel="noreferrer" className={botonTexto}>Ver PDF</a>
                {editable && (
                  <button type="button" disabled={bloqueado} className={botonTexto} onClick={onPreparar}>
                    Rehacer el PDF desde este correo
                  </button>
                )}
              </>
            ) : (
              <button type="button" disabled={bloqueado} className={btn.secondary} onClick={onPreparar}>
                Preparar la propuesta
              </button>
            )}
          </div>
          {editable && r.tienePropuesta && !propuestaAlDia(r) && (
            <p className="text-sm text-warn" role="status">Cambiaste el correo y el PDF ya no coincide. Rehazlo para revisarlo; si no, se rehace solo al enviar.</p>
          )}
          <p className="text-xs text-fg-faint">La primera vez la IA reescribe el correo para presentar la propuesta y arma el PDF a partir de ese correo: los mismos hechos, el mismo caso y las mismas piezas, con más detalle. Sin precios.</p>
        </div>

        {editable && (
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button type="button" disabled={bloqueado || falta != null || !puedeEnviar} onClick={onEnviar} className={btn.secondary}>
              Enviar solo este correo
            </button>
            <button type="button" disabled={bloqueado} className={btn.secondary}
              onClick={() => correr("guardar", () => guardarRespuestaAction(r.id, valores), "Cambios guardados.")}>
              {trabajando === "guardar" ? "Guardando…" : "Guardar cambios"}
            </button>
            <button type="button" disabled={bloqueado} className={`${botonTexto} text-danger sm:ml-auto sm:mx-0`}
              onClick={() => correr("descartar", () => descartarRespuestaAction(r.id, true), "Respuesta descartada. La encuentras en «Descartadas».")}>
              Descartar
            </button>
          </div>
        )}
        {editable && falta && <p className="text-xs text-fg-faint">Para enviarlo: {falta.charAt(0).toLowerCase() + falta.slice(1)}</p>}
        {r.estado === "descartada" && (
          <button type="button" disabled={bloqueado} className={`${btn.secondary} justify-self-start`}
            onClick={() => correr("restaurar", () => descartarRespuestaAction(r.id, false), "Volvió a «Por revisar».")}>
            Devolver a por revisar
          </button>
        )}
        {r.estado === "enviada" && r.correoId && (
          <Link href={`/empresa/correos/hub/${r.correoId}`} className={botonTexto}>Ver el correo enviado</Link>
        )}
      </div>

      <div className="grid content-start gap-4 min-w-0">
        <h3 className="text-fg text-sm font-semibold">LinkedIn</h3>
        {r.mensajeLinkedin ? (
          <>
            <p className="whitespace-pre-wrap rounded-xl border border-line bg-panel p-4 text-sm leading-relaxed text-fg-mute [overflow-wrap:anywhere]">{r.mensajeLinkedin}</p>
            <div className="grid grid-flow-col auto-cols-fr gap-2 sm:flex sm:flex-wrap">
              <button type="button" className={btn.secondary}
                onClick={async () => { try { await navigator.clipboard.writeText(r.mensajeLinkedin ?? ""); setCopiado(true); setTimeout(() => setCopiado(false), 1600); } catch { /* sin permiso de portapapeles */ } }}>
                {copiado ? "Copiado" : "Copiar mensaje"}
              </button>
              <a href={r.linkedinUrl ?? buscarLinkedin} target="_blank" rel="noreferrer" className={btn.secondary}>
                {r.linkedinUrl ? "Abrir perfil" : "Buscar en LinkedIn"}
              </a>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm text-fg-mute">
              <input type="checkbox" className="size-5 accent-brand" checked={!!r.linkedinAt} disabled={bloqueado}
                onChange={(e) => correr("linkedin", () => marcarLinkedinAction(r.id, e.target.checked))} />
              {r.linkedinAt ? `Lo mandé por LinkedIn el ${fechaHora(r.linkedinAt, false)}` : "Ya lo mandé por LinkedIn"}
            </label>
            <p className="text-xs text-fg-faint">LinkedIn no se automatiza: copia el mensaje, mándalo desde el perfil y márcalo aquí.</p>
          </>
        ) : (
          <p className="text-sm text-fg-faint">El agente no dejó mensaje de LinkedIn para este lead.</p>
        )}
        <div className="grid justify-items-start gap-2 border-t border-line pt-4 text-sm">
          <Link href={`/empresa/leads/${r.lead.id}`} className={botonTexto}>Abrir la ficha de {r.lead.name}</Link>
          {r.lead.sitio && (
            <a href={r.lead.sitio} target="_blank" rel="noreferrer" className={`${botonTexto} [overflow-wrap:anywhere]`}>{r.lead.sitio.replace(/^https?:\/\/(www\.)?/, "")}</a>
          )}
        </div>
      </div>
    </div>
  );
}
