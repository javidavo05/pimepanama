"use client";

/**
 * Menú «Más» de la cabecera de la ficha (archivar) y el aviso de cliente archivado (restaurar).
 * La confirmación va en la misma página, nunca con un diálogo del navegador.
 */
import { useActionState, useEffect, useRef, useState } from "react";
import { archivarClienteAction } from "@/app/(empresa)/empresa/(protected)/acciones-crm-ficha";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { Resultado, botonChico } from "./comun";

export function MenuMas({ clientId, nombre, archivado, className }: { clientId: string; nombre: string; archivado: boolean; className: string }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [estado, accion, enviando] = useActionState(archivarClienteAction, null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);

  useEffect(() => { if (estado?.ok) setConfirmar(false); }, [estado]);

  return (
    <div ref={ref} className="relative">
      <button type="button" className={`${className} w-full`} aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>Más</button>
      {abierto && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-panel p-2 shadow-lg">
          <Link role="menuitem" href="/empresa/clientes/archivados" className="flex min-h-11 items-center rounded-lg px-3 text-sm text-fg-mute hover:bg-fill hover:text-fg">Ver clientes archivados</Link>
          {!archivado && (
            <button role="menuitem" type="button" className="flex w-full min-h-11 items-center rounded-lg px-3 text-left text-sm text-danger hover:bg-danger/5" onClick={() => { setConfirmar(true); setAbierto(false); }}>Archivar cliente</button>
          )}
        </div>
      )}
      {confirmar && !archivado && (
        <form action={accion} className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-danger/30 bg-panel p-4 shadow-lg" role="alertdialog" aria-labelledby="archivar-titulo">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="archivar" value="1" />
          <p id="archivar-titulo" className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">¿Archivar a {nombre}?</p>
          <p className="text-sm text-fg-dim">Deja de salir en la lista de clientes. Su historia, facturas y proyectos se conservan y lo puedes restaurar cuando quieras.</p>
          <Resultado estado={estado} />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={botonChico} onClick={() => setConfirmar(false)}>Cancelar</button>
            <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Archivando…" : "Sí, archivar"}</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function AvisoArchivado({ clientId, cuando }: { clientId: string; cuando: string }) {
  const [estado, accion, enviando] = useActionState(archivarClienteAction, null);
  return (
    <form action={accion} className="flex flex-col gap-3 rounded-2xl border border-warn/40 bg-warn/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="archivar" value="0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">Cliente archivado el {cuando}</p>
        <p className="text-sm text-fg-dim">No sale en la lista de clientes. Restáuralo para volver a trabajar con él.</p>
        <Resultado estado={estado?.error ? estado : null} />
      </div>
      <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Restaurando…" : "Restaurar cliente"}</button>
    </form>
  );
}

/** Botón de restaurar para la lista de archivados. */
export function RestaurarBoton({ clientId }: { clientId: string }) {
  const [estado, accion, enviando] = useActionState(archivarClienteAction, null);
  return (
    <form action={accion} className="flex flex-col items-end gap-1">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="archivar" value="0" />
      <button type="submit" className={botonChico} disabled={enviando}>{enviando ? "Restaurando…" : "Restaurar"}</button>
      <Resultado estado={estado?.error ? estado : null} />
    </form>
  );
}
