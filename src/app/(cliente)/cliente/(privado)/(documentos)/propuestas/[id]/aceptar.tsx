"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { aceptarPropuestaAction } from "../../../acciones-documentos";
import { btnPrincipal, btnSecundario } from "@/components/portal/ui";
import { errorBox, okBox } from "@/components/auth/auth-shell";

/** Aceptar en dos pasos en la misma página: primero se pide, después se confirma con la casilla. */
export function AceptarPropuesta({ propuestaId, total }: { propuestaId: string; total: string }) {
  const [estado, accion, enviando] = useActionState(aceptarPropuestaAction, null);
  const [confirmando, setConfirmando] = useState(false);
  if (estado?.ok) return <p className={okBox} role="status">Listo. Aceptaste la propuesta y el equipo de Pime ya recibió el aviso; te escribimos con los siguientes pasos.</p>;
  if (!confirmando) {
    return (
      <div className="space-y-4">
        <p className="text-fg-mute text-sm leading-relaxed">Si estás de acuerdo con el alcance y el precio, acéptala aquí. Si quieres ajustar algo, escríbenos antes de aceptar.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className={btnPrincipal} onClick={() => setConfirmando(true)}>Aceptar propuesta por {total}</button>
          <Link href="/cliente/tickets/nuevo" className={btnSecundario}>Quiero ajustar algo</Link>
        </div>
      </div>
    );
  }
  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="propuesta" value={propuestaId} />
      <label className="flex items-start gap-3 rounded-xl border border-line bg-fill px-4 py-3 text-sm text-fg-mute leading-relaxed cursor-pointer min-h-11">
        <input type="checkbox" name="confirmo" value="1" required className="mt-1 h-5 w-5 shrink-0 accent-current" />
        <span>Confirmo que acepto esta propuesta por <b className="text-fg tabular-nums">{total}</b>. Mi aceptación queda registrada con mi nombre y la fecha.</span>
      </label>
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className={btnPrincipal} disabled={enviando}>{enviando ? "Aceptando…" : "Confirmar y aceptar"}</button>
        <button type="button" className={btnSecundario} onClick={() => setConfirmando(false)} disabled={enviando}>Volver</button>
      </div>
    </form>
  );
}
