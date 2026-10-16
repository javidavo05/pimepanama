"use client";

/** Responsable de un cliente o lead: se elige de la lista del equipo y se guarda al cambiarlo. */
import { useActionState, useRef } from "react";
import { asignarResponsableAction } from "@/app/(empresa)/empresa/(protected)/acciones-equipo";

export type PersonaEquipo = { id: string; nombre: string };

export function Responsable({ tipo, id, actual, equipo }: { tipo: "cliente" | "lead"; id: string; actual: string | null; equipo: PersonaEquipo[] }) {
  const [estado, enviar, enviando] = useActionState(asignarResponsableAction, null);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={enviar} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`resp-${id}`} className="text-fg-dim">Responsable</label>
      <select
        id={`resp-${id}`}
        name="responsableId"
        defaultValue={actual ?? ""}
        disabled={enviando}
        onChange={() => form.current?.requestSubmit()}
        className="min-h-11 sm:min-h-9 rounded-lg border border-line-mid bg-fill px-3 pr-8 text-sm text-fg field-select focus:outline-none focus:border-brand"
      >
        <option value="">Sin responsable</option>
        {equipo.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      {enviando && <span className="text-xs text-fg-dim" aria-live="polite">Guardando…</span>}
      {estado?.error && <span className="text-xs text-danger" role="alert">{estado.error}</span>}
      {estado?.ok && !enviando && <span className="text-xs text-ok" role="status">{estado.mensaje}</span>}
    </form>
  );
}
