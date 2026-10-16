"use client";

import { useActionState, useState } from "react";
import { botonPrincipal, campo, errorBox, etiqueta, okBox } from "@/components/auth/auth-shell";
import { responder, type EstadoEncuesta } from "./acciones";

const PUNTAJES = Array.from({ length: 11 }, (_, i) => i);

/**
 * La pregunta de 0 a 10 en botones grandes (radios, para que funcione con teclado y lector de pantalla), un
 * comentario opcional y enviar. Sin número preseleccionado a propósito: uno por omisión sesgaría la respuesta.
 */
export function EncuestaForm({ token }: { token: string }) {
  const [estado, accion, enviando] = useActionState<EstadoEncuesta, FormData>(responder, {});
  const [puntaje, setPuntaje] = useState<number | null>(null);

  if (estado.ok || estado.yaRespondida) return <Gracias ya={!!estado.yaRespondida} />;

  return (
    <form action={accion} className="grid gap-6">
      <input type="hidden" name="token" value={token} />
      <fieldset className="grid gap-3">
        <legend className={etiqueta}>Del 0 al 10</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11 sm:gap-1">
          {PUNTAJES.map((n) => {
            const elegido = puntaje === n;
            return (
              <label key={n} className={`relative inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border text-base font-bold tabular-nums transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${elegido ? "border-brand bg-brand text-on-brand" : "border-line-mid bg-panel text-fg hover:border-line-loud"}`}>
                <input type="radio" name="puntaje" value={n} required checked={elegido} onChange={() => setPuntaje(n)} className="sr-only" />
                {n}
              </label>
            );
          })}
        </div>
        <div className="flex justify-between gap-4 text-fg-dim text-xs" aria-hidden>
          <span>0 · Nada probable</span>
          <span>10 · Muy probable</span>
        </div>
      </fieldset>
      <div>
        <label htmlFor="comentario" className={etiqueta}>Comentario (opcional)</label>
        <textarea id="comentario" name="comentario" rows={4} maxLength={2000} className={`${campo} py-3 min-h-28`} placeholder="Lo que salió bien o lo que podemos hacer mejor" />
      </div>
      {estado.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={botonPrincipal} disabled={puntaje === null || enviando} aria-busy={enviando}>
        {enviando ? "Enviando…" : puntaje === null ? "Elige un número para enviar" : `Enviar mi respuesta: ${puntaje}`}
      </button>
    </form>
  );
}

export function Gracias({ ya }: { ya?: boolean }) {
  return (
    <div className={`${okBox} grid gap-1`} role="status">
      <p className="font-semibold">{ya ? "Esta encuesta ya se respondió" : "¡Gracias por tu respuesta!"}</p>
      <p>{ya ? "Solo se puede responder una vez. Si quieres contarnos algo más, escríbenos a info@pimepanama.com." : "La recibió el equipo de Pime. Nos ayuda a mejorar en cada proyecto."}</p>
    </div>
  );
}
