"use client";

import { useActionState, useState } from "react";
import { decidirOrdenAction } from "../../acciones";
import { btnPrincipal, btnSecundario } from "@/components/portal/ui";
import { campo, errorBox, okBox } from "@/components/auth/auth-shell";

export function DecidirOrden({ ordenId, total }: { ordenId: string; total: string }) {
  const [estado, accion, enviando] = useActionState(decidirOrdenAction, null);
  const [ajustes, setAjustes] = useState(false);
  if (estado?.ok) return <p className={okBox} role="status">Listo. Tu decisión quedó registrada y el equipo de Pime ya la vio.</p>;
  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="orden" value={ordenId} />
      <p className="text-fg-mute text-sm leading-relaxed">Al aprobar, el equipo agrega estas fases al proyecto y se cobran como dice cada una. Tu aprobación queda registrada con fecha y no se puede editar.</p>
      {ajustes && <textarea name="comentario" required rows={4} className={`${campo} py-3`} placeholder="¿Qué te gustaría cambiar del alcance o del precio?" aria-label="Qué ajustar" />}
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        {!ajustes && <button type="submit" name="decision" value="aprobado" className={btnPrincipal} disabled={enviando}>Aprobar por {total}</button>}
        {ajustes
          ? <><button type="submit" name="decision" value="solicita_cambios" className={btnPrincipal} disabled={enviando}>Pedir ajustes</button><button type="submit" name="decision" value="rechazado" className={btnSecundario} disabled={enviando}>No la quiero</button></>
          : <button type="button" className={btnSecundario} onClick={() => setAjustes(true)}>Quiero ajustar algo</button>}
      </div>
    </form>
  );
}
