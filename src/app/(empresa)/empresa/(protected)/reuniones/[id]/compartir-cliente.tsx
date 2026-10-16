"use client";

/** Interruptor «Compartir la minuta con el cliente»: solo la minuta ejecutiva; la técnica y la transcripción nunca salen. */
import { useActionState } from "react";
import { compartirMinutaAction } from "./acciones-compartir";

export function CompartirMinuta({ meetingId, compartida, cliente, lista }: { meetingId: string; compartida: boolean; cliente: string; lista: boolean }) {
  const [estado, accion, guardando] = useActionState(compartirMinutaAction, null);
  // El estado real llega por props al revalidar; mientras guarda se muestra ya cambiado.
  const encendido = guardando ? !compartida : compartida;
  const deshabilitado = guardando || (!lista && !compartida);
  return (
    <form action={accion} className="bg-panel border border-line rounded-2xl p-4 sm:p-6 mb-6 min-w-0">
      <input type="hidden" name="meetingId" value={meetingId} />
      <input type="hidden" name="compartir" value={compartida ? "0" : "1"} />
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-fg text-sm font-semibold">Compartir la minuta con el cliente</p>
          <p className="text-fg-dim text-xs leading-relaxed [overflow-wrap:anywhere]">
            {lista
              ? `${cliente} la ve en su cuenta, en Documentos → Reuniones. Solo la minuta ejecutiva: la técnica y la transcripción quedan internas.`
              : "Se puede compartir cuando la minuta ejecutiva esté lista."}
          </p>
        </div>
        <button type="submit" role="switch" aria-checked={encendido} aria-label="Compartir la minuta con el cliente" disabled={deshabilitado}
          className="shrink-0 inline-flex items-center min-h-11 min-w-11 justify-center disabled:opacity-50">
          <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${encendido ? "bg-brand" : "bg-fill-2 border border-line-mid"}`}>
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${encendido ? "translate-x-6" : "translate-x-1"}`} />
          </span>
        </button>
      </div>
      {estado?.error && <p className="mt-3 text-danger text-xs" role="alert">{estado.error}</p>}
      {estado?.ok && estado.mensaje && <p className="mt-3 text-ok text-xs" role="status">{estado.mensaje}</p>}
    </form>
  );
}
