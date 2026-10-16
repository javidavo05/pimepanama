"use client";

/**
 * Vistas guardadas de la lista de clientes (fase 6 del CRM): cada miembro guarda su combinación de filtros con un
 * nombre, la vuelve a abrir de la lista y la borra cuando ya no le sirve.
 */
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/empresa/page-header";
import { borrarVistaAction, guardarVistaAction, type EstadoLista } from "@/app/(empresa)/empresa/(protected)/acciones-listas";

const campo = "w-full min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export type Vista = { id: string; nombre: string; query: string };

export function VistasGuardadas({ vistas, query, nombreSugerido, hayFiltros }: { vistas: Vista[]; query: string; nombreSugerido: string; hayFiltros: boolean }) {
  const router = useRouter();
  const activa = vistas.find((v) => v.query === query);
  const [guardando, setGuardando] = useState(false);
  const [estado, guardar, ocupado] = useActionState<EstadoLista, FormData>(guardarVistaAction, null);
  const [estadoBorrar, borrar, borrando] = useActionState<EstadoLista, FormData>(borrarVistaAction, null);
  useEffect(() => { if (estado?.ok) setGuardando(false); }, [estado]);
  const aviso = estado ?? estadoBorrar;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
          <span className="shrink-0 text-xs text-fg-dim">Vista</span>
          <select aria-label="Abrir una vista guardada" value={activa?.id ?? ""} className={campo}
            onChange={(e) => { const v = vistas.find((x) => x.id === e.target.value); router.push(`/empresa/clientes${v?.query ? `?${v.query}` : ""}`); }}>
            <option value="">{vistas.length ? (activa ? "Todos los clientes" : "Elige una vista guardada") : "Aún no tienes vistas guardadas"}</option>
            {vistas.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {hayFiltros && !activa && <button type="button" onClick={() => setGuardando((g) => !g)} aria-expanded={guardando} className={btn.secondary}>Guardar esta vista</button>}
          {activa && (
            <form action={borrar}>
              <input type="hidden" name="id" value={activa.id} />
              <button disabled={borrando} className={`${btn.secondary} w-full hover:text-danger`}>{borrando ? "Borrando…" : `Borrar «${activa.nombre}»`}</button>
            </form>
          )}
        </div>
      </div>
      {guardando && (
        <form action={guardar} className="flex flex-col gap-2 sm:flex-row sm:items-end rounded-xl border border-line bg-panel p-3">
          <input type="hidden" name="query" value={query} />
          <label className="block min-w-0 flex-1">
            <span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2">Nombre de la vista</span>
            <input name="nombre" required maxLength={60} defaultValue={nombreSugerido} className={campo} autoFocus />
            <span className="mt-1 block text-xs text-fg-dim">Solo la ves tú. Guarda la búsqueda, los filtros y el orden de ahora.</span>
          </label>
          <button disabled={ocupado} className={btn.primary}>{ocupado ? "Guardando…" : "Guardar vista"}</button>
        </form>
      )}
      {aviso?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{aviso.error}</p>}
      {aviso?.ok && aviso.mensaje && <p className="text-sm text-ok" role="status">{aviso.mensaje}</p>}
    </div>
  );
}
