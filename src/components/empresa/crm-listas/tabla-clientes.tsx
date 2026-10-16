"use client";

/**
 * Filas de la lista de clientes con casillas y la barra de acciones sobre los marcados (fase 6 del CRM).
 * La selección vive solo en esta página de la lista: al cambiar de página o de filtro empieza de cero.
 */
import { useActionState, useEffect, useId, useState } from "react";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { accionMasivaAction, type EstadoLista } from "@/app/(empresa)/empresa/(protected)/acciones-listas";

export type FilaTabla = {
  id: string; titulo: string; sub: string; etiquetas: string[]; internal: boolean; premium: boolean; cuenta: string;
  actividad: string; responsable: string | null; contacto: string; contactoViejo: boolean; saldo: string; debe: boolean;
};

/** Teléfono: todo apilado. Mediano: datos a la izquierda y saldo a la derecha. Ancho: 5 columnas fijas. */
const COLUMNAS = "md:grid-cols-[minmax(0,1fr)_128px] xl:grid-cols-[minmax(0,1fr)_176px_144px_120px_112px]";
const campo = "w-full min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const casilla = "h-5 w-5 shrink-0 accent-brand cursor-pointer";

type Modo = "" | "asignar" | "etiquetar" | "quitar-etiqueta" | "archivar";

export function TablaClientes({ filas, equipo, etiquetas }: { filas: FilaTabla[]; equipo: { id: string; nombre: string }[]; etiquetas: string[] }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<Modo>("");
  const [estado, accion, enviando] = useActionState<EstadoLista, FormData>(accionMasivaAction, null);
  const listaEtiquetas = useId();

  // Al terminar bien, se limpia la selección y se cierra el paso abierto.
  useEffect(() => { if (estado?.ok) { setMarcados(new Set()); setModo(""); } }, [estado]);
  // Si cambian las filas (otra página u otro filtro), la selección no se arrastra.
  const clave = filas.map((f) => f.id).join(",");
  useEffect(() => { setMarcados(new Set()); setModo(""); }, [clave]);

  const todos = filas.length > 0 && filas.every((f) => marcados.has(f.id));
  const alguno = marcados.size > 0;
  const cambiar = (id: string) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const n = marcados.size;
  const cuantos = `${n} ${n === 1 ? "cliente" : "clientes"}`;
  const etiquetasMarcadas = [...new Set(filas.filter((f) => marcados.has(f.id)).flatMap((f) => f.etiquetas))].sort((a, b) => a.localeCompare(b, "es"));

  return (
    <div className="space-y-3">
      {(alguno || estado) && (
        <div className="sticky top-2 z-20 rounded-2xl border border-line-mid bg-panel p-3 sm:p-4 shadow-lg space-y-3" role="region" aria-label="Acciones sobre los clientes marcados">
          {alguno && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-semibold text-fg">{cuantos} {n === 1 ? "marcado" : "marcados"}</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {([["asignar", "Asignar responsable"], ["etiquetar", "Agregar etiqueta"], ["quitar-etiqueta", "Quitar etiqueta"], ["archivar", "Archivar"]] as const).map(([m, label]) => (
                  <button key={m} type="button" onClick={() => setModo(modo === m ? "" : m)} aria-pressed={modo === m}
                    className={`${btn.secondary} ${modo === m ? "border-brand text-fg" : ""} ${m === "archivar" ? "hover:text-danger" : ""}`}>{label}</button>
                ))}
                <button type="button" onClick={() => setMarcados(new Set())} className={btn.secondary}>Desmarcar</button>
              </div>
            </div>
          )}

          {alguno && modo && (
            <form action={accion} className="flex flex-col gap-3 sm:flex-row sm:items-end border-t border-line pt-3">
              {[...marcados].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
              <input type="hidden" name="accion" value={modo} />
              {modo === "asignar" && (
                <label className="block min-w-0 flex-1">
                  <span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2">Responsable</span>
                  <select name="responsableId" defaultValue={equipo[0]?.id ?? ""} className={campo}>
                    {equipo.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    <option value="">Sin responsable</option>
                  </select>
                </label>
              )}
              {modo === "etiquetar" && (
                <label className="block min-w-0 flex-1">
                  <span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2">Etiqueta</span>
                  <input name="etiqueta" list={listaEtiquetas} required maxLength={40} placeholder="Por ejemplo: VIP, Referido, Gobierno" className={campo} autoFocus />
                  <datalist id={listaEtiquetas}>{etiquetas.map((e) => <option key={e} value={e} />)}</datalist>
                </label>
              )}
              {modo === "quitar-etiqueta" && (etiquetasMarcadas.length ? (
                <label className="block min-w-0 flex-1">
                  <span className="block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-2">Etiqueta a quitar</span>
                  <select name="etiqueta" defaultValue={etiquetasMarcadas[0]} className={campo}>
                    {etiquetasMarcadas.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </label>
              ) : <p className="flex-1 text-sm text-fg-dim">Los clientes marcados no tienen etiquetas.</p>)}
              {modo === "archivar" && (
                <div className="min-w-0 flex-1 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-fg">
                  <input type="hidden" name="confirmado" value="1" />
                  ¿Archivar {cuantos}? Dejan de salir en la lista y en los buscadores; sus facturas, proyectos y su historial se guardan.
                </div>
              )}
              {!(modo === "quitar-etiqueta" && !etiquetasMarcadas.length) && (
                <button disabled={enviando} className={`${btn.primary} ${modo === "archivar" ? "!bg-danger-solid hover:!bg-danger-solid/90" : ""}`}>
                  {enviando ? "Guardando…"
                    : modo === "asignar" ? `Asignar ${cuantos}`
                    : modo === "etiquetar" ? `Etiquetar ${cuantos}`
                    : modo === "quitar-etiqueta" ? `Quitar de ${cuantos}`
                    : `Sí, archivar ${cuantos}`}
                </button>
              )}
              <button type="button" onClick={() => setModo("")} className={btn.secondary}>Cancelar</button>
            </form>
          )}

          {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
          {estado?.ok && estado.mensaje && !alguno && <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok" role="status">{estado.mensaje}</p>}
        </div>
      )}

      <ul className="bg-panel border border-line rounded-2xl divide-y divide-line overflow-hidden">
        <li className="flex items-center gap-3 px-4 sm:px-6 py-3">
          <label className="flex min-h-11 items-center gap-3 text-xs font-semibold text-fg-dim cursor-pointer xl:min-h-0">
            <input type="checkbox" className={casilla} checked={todos} onChange={() => setMarcados(todos ? new Set() : new Set(filas.map((f) => f.id)))} />
            <span className="xl:sr-only">Seleccionar todos los de esta página</span>
          </label>
          {/* Columnas fijas e iguales en todas las filas: línea, responsable, contacto y saldo quedan alineados. */}
          <span aria-hidden className={`hidden xl:grid flex-1 gap-x-6 ${COLUMNAS} text-xs font-semibold uppercase tracking-widest text-fg-faint`}>
            <span>Cliente</span><span>Línea y cuenta</span><span>Responsable</span><span>Último contacto</span><span className="text-right">Saldo</span>
          </span>
        </li>
        {filas.map((c) => (
          <li key={c.id} className={`flex items-start gap-3 pl-4 sm:pl-6 ${marcados.has(c.id) ? "bg-brand/5" : c.internal ? "bg-fill/60" : ""}`}>
            <label className="-ml-3 flex min-h-11 min-w-11 items-center justify-center pt-3 xl:pt-0 xl:self-center cursor-pointer">
              <input type="checkbox" className={casilla} checked={marcados.has(c.id)} onChange={() => cambiar(c.id)} aria-label={`Marcar ${c.titulo}`} />
            </label>
            <Link href={`/empresa/clientes/${c.id}`} className={`grid min-w-0 flex-1 gap-x-6 gap-y-2 pr-4 sm:pr-6 py-4 hover:bg-fill md:items-center ${COLUMNAS}`}>
              <span className="min-w-0 md:col-start-1 md:row-start-1 space-y-1">
                <span className="block text-fg font-medium truncate">{c.titulo}</span>
                {c.sub && <span className="block text-fg-dim text-xs truncate">{c.sub}</span>}
                <span className="block text-fg-dim text-xs truncate">{c.actividad}</span>
                {c.etiquetas.length > 0 && (
                  <span className="flex flex-wrap gap-1 pt-1">
                    {c.etiquetas.slice(0, 3).map((e) => <span key={e} className="max-w-40 truncate rounded-full bg-fill-2 px-2 py-1 text-xs text-fg-mute">{e}</span>)}
                    {c.etiquetas.length > 3 && <span className="rounded-full bg-fill-2 px-2 py-1 text-xs text-fg-dim">+{c.etiquetas.length - 3}</span>}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap gap-2 text-xs md:col-start-1 xl:col-start-2 xl:row-start-1">
                {c.internal ? (
                  <span className="w-20 shrink-0 rounded-full py-1 text-center font-semibold bg-fill-2 text-fg-mute">Interna</span>
                ) : (
                  <>
                    <span className={`w-20 shrink-0 rounded-full py-1 text-center font-semibold ${c.premium ? "bg-sand/15 text-sand-fg" : "bg-brand/10 text-brand-fg"}`}>{c.premium ? "Premium" : "Normal"}</span>
                    <span className="shrink-0 rounded-full px-3 py-1 font-semibold bg-fill-2 text-fg-dim">{c.cuenta}</span>
                  </>
                )}
              </span>
              <span className="min-w-0 text-xs text-fg-dim truncate md:col-start-1 xl:col-start-3 xl:row-start-1">
                <span className="xl:hidden">A cargo: </span>{c.responsable ?? "Sin responsable"}
              </span>
              <span className={`text-xs md:col-start-1 xl:col-start-4 xl:row-start-1 ${c.contactoViejo ? "text-warn font-semibold" : "text-fg-dim"}`}>
                <span className="xl:hidden">Último contacto: </span>{c.contacto}
              </span>
              <span className={`font-mono text-sm md:text-right md:col-start-2 md:row-start-1 md:row-span-4 xl:col-start-5 xl:row-span-1 ${c.debe ? "text-fg" : "text-fg-faint"}`}>{c.saldo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
