"use client";

/** Botones del detalle de la oportunidad: cotización (crear o ligar) y cerrar (ganar, perder, reabrir). */
import { useActionState, useState } from "react";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { MensajeEstado } from "@/components/empresa/crm/mensaje-estado";
import Link from "@/components/empresa/link";
import { crearCotizacionAction, ganarOportunidadAction, perderOportunidadAction, reabrirOportunidadAction, vincularCotizacionAction } from "../../acciones-embudo";
import { MOTIVOS_PERDIDA } from "@/lib/crm/embudo";

type Opcion = { id: string; etiqueta: string };

export function CotizacionOportunidad({ id, actual, opciones, puedeCrear }: { id: string; actual: Opcion | null; opciones: Opcion[]; puedeCrear: boolean }) {
  const [eC, crear, creando] = useActionState(crearCotizacionAction, null);
  const [eV, vincular, vinculando] = useActionState(vincularCotizacionAction, null);
  const otras = opciones.filter((o) => o.id !== actual?.id);
  return (
    <div className="space-y-3">
      {actual ? (
        <Link href={`/empresa/cotizaciones/${actual.id}`} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line-mid px-3 text-sm text-fg-mute hover:text-fg">
          <span className="min-w-0 truncate">{actual.etiqueta}</span><span aria-hidden>→</span>
        </Link>
      ) : (
        <form action={crear}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className={`${btn.accent} w-full`} disabled={creando || !puedeCrear}>{creando ? "Creando…" : "Crear cotización"}</button>
          <p className="mt-2 text-xs text-fg-faint">Se arma con el título y el valor; la terminas en el armador de cotizaciones.</p>
        </form>
      )}
      {otras.length > 0 && (
        <form action={vincular} className="space-y-2">
          <input type="hidden" name="id" value={id} />
          <label htmlFor={`cot-${id}`} className={etiqueta}>{actual ? "Cambiar por otra" : "O ligar una que ya existe"}</label>
          <select id={`cot-${id}`} name="cotizacionId" defaultValue={otras[0].id} className={`${campo} field-select pr-8`}>
            {otras.map((o) => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
          </select>
          <button type="submit" className={`${btn.secondary} w-full`} disabled={vinculando}>{vinculando ? "Ligando…" : "Ligar cotización"}</button>
        </form>
      )}
      <MensajeEstado estado={eC} />
      <MensajeEstado estado={eV} />
    </div>
  );
}

export function CerrarOportunidad({ id, estado, motivoPerdida, esLead, tieneCotizacion, tieneProyecto }: {
  id: string; estado: string; motivoPerdida: string | null; esLead: boolean; tieneCotizacion: boolean; tieneProyecto: boolean;
}) {
  const [eG, ganar, ganando] = useActionState(ganarOportunidadAction, null);
  const [eP, perder, perdiendo] = useActionState(perderOportunidadAction, null);
  const [eR, reabrir, reabriendo] = useActionState(reabrirOportunidadAction, null);
  const [perderAbierto, setPerderAbierto] = useState(false);
  const [motivo, setMotivo] = useState<string>(MOTIVOS_PERDIDA[0]);

  if (estado !== "abierta") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-fg-mute">
          {estado === "ganada" ? "Ganada." : `Perdida${motivoPerdida ? `: ${motivoPerdida}` : "."}`}
        </p>
        <form action={reabrir}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className={`${btn.secondary} w-full`} disabled={reabriendo}>{reabriendo ? "Abriendo…" : "Volver a abrirla"}</button>
        </form>
        {estado === "ganada" && <p className="text-xs text-fg-faint">El cliente y el proyecto que se crearon se quedan.</p>}
        <MensajeEstado estado={eG} />
        <MensajeEstado estado={eR} />
      </div>
    );
  }

  const queHace = [
    esLead ? "convierte el lead en cliente (o usa el que ya tenga su correo)" : null,
    tieneProyecto ? null : tieneCotizacion ? "crea su proyecto con las líneas de la cotización como fases" : "crea su proyecto",
  ].filter(Boolean).join(" y ");

  return (
    <div className="space-y-3">
      <form action={ganar} className="space-y-2">
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={`${btn.primary} w-full`} disabled={ganando}>{ganando ? "Cerrando…" : "Marcar ganada"}</button>
        {queHace && <p className="text-xs text-fg-faint">Al ganarla se {queHace}.</p>}
      </form>
      <MensajeEstado estado={eG} />

      {!perderAbierto ? (
        <button type="button" className={`${btn.secondary} w-full`} onClick={() => setPerderAbierto(true)}>Marcar perdida</button>
      ) : (
        <form action={perder} className="space-y-3 rounded-lg border border-line-mid p-3">
          <input type="hidden" name="id" value={id} />
          <fieldset>
            <legend className={etiqueta}>¿Por qué se perdió?</legend>
            <div className="grid gap-1">
              {[...MOTIVOS_PERDIDA, "otro"].map((m) => (
                <label key={m} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-fg-mute hover:bg-fill">
                  <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} className="h-4 w-4 accent-[rgb(var(--c-brand))]" />
                  {m === "otro" ? "Otro motivo" : m}
                </label>
              ))}
            </div>
          </fieldset>
          {motivo === "otro" && (
            <div>
              <label htmlFor={`otro-${id}`} className={etiqueta}>Motivo</label>
              <input id={`otro-${id}`} name="otro" required maxLength={300} className={campo} autoFocus />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btn.secondary} onClick={() => setPerderAbierto(false)}>Cancelar</button>
            <button type="submit" className={btn.secondary} disabled={perdiendo}>{perdiendo ? "Guardando…" : "Guardar como perdida"}</button>
          </div>
          <MensajeEstado estado={eP} />
        </form>
      )}
    </div>
  );
}
