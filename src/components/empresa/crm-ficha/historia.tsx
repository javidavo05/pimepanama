"use client";

/**
 * Historia del cliente: todo lo que pasó con él en una sola línea —conversaciones, notas, correos, reuniones,
 * citas, cotizaciones, contratos, tickets y la actividad del portal—, con filtro por tipo y «cargar más».
 * Las interacciones fijadas van arriba, aparte.
 */
import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "@/components/empresa/link";
import { borrarInteraccionAction, cargarHistoriaAction, cargarHistoriaLeadAction, fijarInteraccionAction } from "@/app/(empresa)/empresa/(protected)/acciones-crm-ficha";
import { TIPOS_HISTORIA, TIPOS_HISTORIA_LEAD, TIPO_HISTORIA_LABEL, TIPO_HISTORIA_UNO, type EventoHistoria, type PaginaHistoria, type TipoHistoria } from "@/lib/crm/historia";
import { btn } from "@/components/empresa/page-header";
import { Resultado, botonChico, fechaHora } from "./comun";

const PUNTO: Record<TipoHistoria, string> = {
  conversacion: "bg-brand", nota: "bg-sand", correo: "bg-iris", reunion: "bg-ok", cita: "bg-ok",
  cotizacion: "bg-sand", contrato: "bg-sand", ticket: "bg-warn", actividad: "bg-fg-faint",
};

function AccionesInteraccion({ e }: { e: EventoHistoria }) {
  const [ef, fijar, fijando] = useActionState(fijarInteraccionAction, null);
  const [eb, borrar, borrando] = useActionState(borrarInteraccionAction, null);
  const [confirmar, setConfirmar] = useState(false);
  if (!e.refId) return null;
  return (
    <div className="mt-1 space-y-2">
      <div className="flex flex-wrap items-center gap-1 -ml-3">
        <form action={fijar}><input type="hidden" name="id" value={e.refId} /><button type="submit" className={botonChico} disabled={fijando}>{fijando ? "…" : e.fijada ? "Desfijar" : "Fijar arriba"}</button></form>
        {!confirmar && <button type="button" className={`${botonChico} hover:text-danger`} onClick={() => setConfirmar(true)}>Borrar</button>}
      </div>
      {confirmar && (
        <form action={borrar} className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
          <input type="hidden" name="id" value={e.refId} />
          <p className="text-sm text-fg-mute flex-1 min-w-0">¿Borrar {e.tipo === "nota" ? "esta nota" : "esta conversación"}? No se puede deshacer.</p>
          <button type="button" className={botonChico} onClick={() => setConfirmar(false)}>No</button>
          <button type="submit" className={`${botonChico} text-danger`} disabled={borrando}>{borrando ? "Borrando…" : "Sí, borrar"}</button>
        </form>
      )}
      <Resultado estado={ef?.error ? ef : eb?.error ? eb : null} />
    </div>
  );
}

function Evento({ e }: { e: EventoHistoria }) {
  const titulo = <span className="text-fg text-sm font-medium [overflow-wrap:anywhere]">{e.titulo}</span>;
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${PUNTO[e.tipo]}`} aria-hidden />
      <div className="min-w-0">
        {e.enlace ? <Link href={e.enlace} className="hover:underline">{titulo}</Link> : titulo}
        {e.detalle && <p className="text-fg-dim text-sm whitespace-pre-line [overflow-wrap:anywhere]">{e.detalle}</p>}
        <p className="text-fg-faint text-xs">{TIPO_HISTORIA_UNO[e.tipo]} · {fechaHora(e.fecha)}</p>
        {(e.tipo === "conversacion" || e.tipo === "nota") && <AccionesInteraccion e={e} />}
      </div>
    </li>
  );
}

/** Con `clientId`, la historia del cliente; con `leadId`, la comunicación del lead (correos, conversaciones, citas y cotizaciones). */
export function Historia({ clientId, leadId, inicial, fijadas }: { clientId?: string; leadId?: string; inicial: PaginaHistoria | null; fijadas: EventoHistoria[] }) {
  const tiposDisponibles: readonly TipoHistoria[] = leadId ? TIPOS_HISTORIA_LEAD : TIPOS_HISTORIA;
  const [tipos, setTipos] = useState<TipoHistoria[]>([]);
  const [eventos, setEventos] = useState<EventoHistoria[]>(inicial?.eventos ?? []);
  const [cursor, setCursor] = useState<string | null>(inicial?.cursor ?? null);
  const [hayMas, setHayMas] = useState(inicial?.hayMas ?? false);
  const [error, setError] = useState<string | null>(inicial ? null : "No se pudo cargar la historia. Recarga la página.");
  const [cargando, iniciar] = useTransition();

  // Después de registrar algo, el servidor manda la primera página nueva: sin filtro se toma tal cual.
  useEffect(() => {
    if (tipos.length || !inicial) return;
    setEventos(inicial.eventos); setCursor(inicial.cursor); setHayMas(inicial.hayMas); setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial]);

  function pedir(nuevos: TipoHistoria[], antes: string | null) {
    iniciar(async () => {
      const r = leadId ? await cargarHistoriaLeadAction(leadId, antes, nuevos) : await cargarHistoriaAction(clientId ?? "", antes, nuevos);
      if ("error" in r) { setError(r.error); return; }
      setError(null);
      setEventos((prev) => (antes ? [...prev, ...r.eventos.filter((x) => !prev.some((p) => p.id === x.id))] : r.eventos));
      setCursor(r.cursor); setHayMas(r.hayMas);
    });
  }

  function alternar(t: TipoHistoria | null) {
    const nuevos = t === null ? [] : tipos.includes(t) ? tipos.filter((x) => x !== t) : [...tipos, t];
    setTipos(nuevos);
    if (!nuevos.length && inicial) { setEventos(inicial.eventos); setCursor(inicial.cursor); setHayMas(inicial.hayMas); setError(null); return; }
    pedir(nuevos, null);
  }

  const chipCls = (activo: boolean) => `inline-flex items-center min-h-11 sm:min-h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${activo ? "border-brand bg-brand/10 text-brand-fg" : "border-line-mid text-fg-mute hover:border-line-loud hover:text-fg"}`;

  return (
    <div className="space-y-4">
      {fijadas.length > 0 && (
        <div className="rounded-xl border border-sand/30 bg-sand/5 p-4">
          <p className="text-fg-dim text-xs font-semibold uppercase tracking-wider">Fijadas</p>
          <ol className="mt-3 space-y-4">{fijadas.map((e) => <Evento key={e.id} e={e} />)}</ol>
        </div>
      )}

      <div className="-mx-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrar por tipo">
        <div className="flex w-max gap-2 px-1">
          <button type="button" aria-pressed={!tipos.length} className={chipCls(!tipos.length)} onClick={() => alternar(null)}>Todo</button>
          {tiposDisponibles.map((t) => <button key={t} type="button" aria-pressed={tipos.includes(t)} className={chipCls(tipos.includes(t))} onClick={() => alternar(t)}>{TIPO_HISTORIA_LABEL[t]}</button>)}
        </div>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div aria-busy={cargando} className={cargando && !eventos.length ? "opacity-60" : ""}>
        {eventos.length ? (
          <ol className="space-y-4">{eventos.map((e) => <Evento key={e.id} e={e} />)}</ol>
        ) : cargando ? (
          <p className="text-sm text-fg-dim">Cargando…</p>
        ) : !error ? (
          <p className="text-sm text-fg-dim">
            {tipos.length
              ? "Nada de ese tipo todavía. Quita el filtro para ver todo."
              : leadId
                ? "Aquí queda la comunicación con este lead: los correos que le mandes o te mande (se ligan solos por su dirección), llamadas, WhatsApp, citas y cotizaciones. Registra la primera conversación arriba."
                : "Aquí queda todo lo que pase con este cliente: llamadas, WhatsApp, correos, reuniones, cotizaciones y tickets. Registra la primera conversación arriba."}
          </p>
        ) : null}
      </div>

      {hayMas && (
        <div className="flex justify-center">
          <button type="button" className={btn.secondary} disabled={cargando} onClick={() => pedir(tipos, cursor)}>{cargando ? "Cargando…" : "Cargar más"}</button>
        </div>
      )}
    </div>
  );
}
