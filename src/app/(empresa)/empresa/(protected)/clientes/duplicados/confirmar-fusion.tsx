"use client";

import { useActionState } from "react";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { fusionarClientesAction, type EstadoFusion } from "@/app/(empresa)/empresa/(protected)/acciones-duplicados";

/** Botón final de la fusión, con el resultado en la misma página. */
export function ConfirmarFusion({ quedaId, otroId, nombreOtro, nombreQueda }: { quedaId: string; otroId: string; nombreOtro: string; nombreQueda: string }) {
  const [estado, fusionar, fusionando] = useActionState<EstadoFusion, FormData>(fusionarClientesAction, null);
  if (estado?.ok) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok" role="status">{estado.mensaje}</p>
        <div className="grid gap-2 sm:flex">
          <Link href={`/empresa/clientes/${estado.quedaId}`} className={btn.primary}>Abrir {nombreQueda}</Link>
          <Link href="/empresa/clientes/duplicados" className={btn.secondary}>Seguir revisando duplicados</Link>
        </div>
      </div>
    );
  }
  return (
    <form action={fusionar} className="space-y-3 border-t border-line pt-4">
      <input type="hidden" name="queda" value={quedaId} />
      <input type="hidden" name="otro" value={otroId} />
      <input type="hidden" name="confirmado" value="1" />
      <p className="text-sm text-fg">No se puede deshacer: «{nombreOtro}» deja de existir y todo lo suyo queda en «{nombreQueda}».</p>
      <div className="grid gap-2 sm:flex">
        <button disabled={fusionando} className={`${btn.primary} !bg-danger-solid hover:!bg-danger-solid/90 [overflow-wrap:anywhere]`}>{fusionando ? "Fusionando…" : `Fusionar y borrar «${nombreOtro.slice(0, 40)}»`}</button>
        <Link href="/empresa/clientes/duplicados" className={btn.secondary}>Cancelar</Link>
      </div>
      {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
    </form>
  );
}
