"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { decidirEstimadoAction, responderTicketAction } from "../../acciones";
import { SubirArchivos } from "@/components/portal/subir-archivos";
import { btnPrincipal, btnSecundario } from "@/components/portal/ui";
import { campo, errorBox } from "@/components/auth/auth-shell";

export function ResponderForm({ ticketId, cerrado }: { ticketId: string; cerrado: boolean }) {
  const [estado, accion, enviando] = useActionState(responderTicketAction, null);
  const form = useRef<HTMLFormElement>(null);
  const [clave, setClave] = useState(0);
  useEffect(() => { if (estado?.ok) { form.current?.reset(); setClave((k) => k + 1); } }, [estado]);
  return (
    <form ref={form} action={accion} className="space-y-4">
      <input type="hidden" name="ticket" value={ticketId} />
      <label htmlFor="mensaje" className="text-fg text-sm font-semibold">{cerrado ? "¿Sigue pasando? Escribe y lo reabrimos" : "Responder"}</label>
      <textarea id="mensaje" name="mensaje" rows={4} maxLength={8000} className={`${campo} py-3 min-h-28`} placeholder="Escribe tu mensaje" />
      <SubirArchivos key={clave} etiqueta="Adjuntar imágenes" />
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <div className="flex justify-end"><button type="submit" className={btnPrincipal} disabled={enviando}>{enviando ? "Enviando…" : cerrado ? "Reabrir y enviar" : "Enviar respuesta"}</button></div>
    </form>
  );
}

export function DecidirEstimado({ ticketId }: { ticketId: string }) {
  const [estado, accion, enviando] = useActionState(decidirEstimadoAction, null);
  const [rechazo, setRechazo] = useState(false);
  return (
    <form action={accion} className="mt-4 space-y-4">
      <input type="hidden" name="ticket" value={ticketId} />
      {rechazo && <textarea name="comentario" required rows={3} className={`${campo} py-3`} placeholder="¿Qué te gustaría ajustar?" aria-label="Motivo" />}
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        {!rechazo && <button type="submit" name="decision" value="aprobado" className={btnPrincipal} disabled={enviando}>Aprobar y empezar</button>}
        {rechazo
          ? <button type="submit" name="decision" value="rechazado" className={btnSecundario} disabled={enviando}>Enviar mi respuesta</button>
          : <button type="button" className={btnSecundario} onClick={() => setRechazo(true)}>No aprobar</button>}
      </div>
    </form>
  );
}
