"use client";

/** Editor de etapas: renombrar, cambiar probabilidad, subir/bajar, agregar y quitar (moviendo sus oportunidades). */
import { useActionState, useEffect, useRef, useState } from "react";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { MensajeEstado } from "@/components/empresa/crm/mensaje-estado";
import { agregarEtapaAction, guardarEtapaAction, moverEtapaAction, quitarEtapaAction } from "../../acciones-embudo";

type Etapa = { id: string; nombre: string; probabilidad: number; tipo: string; cuantas: number };

export function EditorEtapas({ etapas }: { etapas: Etapa[] }) {
  const abiertas = etapas.filter((e) => e.tipo === "abierta");
  const finales = etapas.filter((e) => e.tipo !== "abierta");
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-fg">En curso</h2>
        <ol className="space-y-3">
          {abiertas.map((e, i) => (
            <FilaEtapa key={e.id} e={e} primera={i === 0} ultima={i === abiertas.length - 1} otras={abiertas.filter((x) => x.id !== e.id)} puedeQuitar={abiertas.length > 1} />
          ))}
        </ol>
        <NuevaEtapa />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-fg">Donde terminan</h2>
        <p className="text-xs text-fg-dim">Ganado (100 %) y Perdido (0 %) cierran cada negocio. Se les puede cambiar el nombre, no quitarlas.</p>
        <ol className="space-y-3">
          {finales.map((e) => <FilaEtapa key={e.id} e={e} primera ultima otras={[]} puedeQuitar={false} />)}
        </ol>
      </section>
    </div>
  );
}

function FilaEtapa({ e, primera, ultima, otras, puedeQuitar }: { e: Etapa; primera: boolean; ultima: boolean; otras: Etapa[]; puedeQuitar: boolean }) {
  const [eG, guardar, guardando] = useActionState(guardarEtapaAction, null);
  const [eM, mover, moviendo] = useActionState(moverEtapaAction, null);
  const [eQ, quitar, quitando] = useActionState(quitarEtapaAction, null);
  const [quitarAbierto, setQuitarAbierto] = useState(false);
  const abierta = e.tipo === "abierta";
  return (
    <li className="rounded-xl border border-line bg-panel p-4">
      <form action={guardar} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <input type="hidden" name="id" value={e.id} />
        <div className="min-w-0">
          <label htmlFor={`n-${e.id}`} className={etiqueta}>Nombre</label>
          <input id={`n-${e.id}`} name="nombre" required maxLength={60} defaultValue={e.nombre} className={campo} />
        </div>
        <div>
          <label htmlFor={`p-${e.id}`} className={etiqueta}>Probabilidad</label>
          {abierta ? (
            <input id={`p-${e.id}`} name="probabilidad" inputMode="numeric" defaultValue={e.probabilidad} className={campo} aria-describedby={`pd-${e.id}`} />
          ) : (
            <p id={`p-${e.id}`} className="flex min-h-11 items-center text-sm text-fg-mute">{e.probabilidad} %</p>
          )}
        </div>
        <button type="submit" className={btn.secondary} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
      </form>
      {abierta && <p id={`pd-${e.id}`} className="mt-2 text-xs text-fg-faint">{e.cuantas} oportunidad{e.cuantas === 1 ? "" : "es"} en esta etapa · porcentaje de 0 a 100</p>}
      {!abierta && <p className="mt-2 text-xs text-fg-faint">{e.cuantas} oportunidad{e.cuantas === 1 ? "" : "es"}</p>}

      {abierta && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={mover}>
            <input type="hidden" name="id" value={e.id} />
            <input type="hidden" name="dir" value="subir" />
            <button type="submit" className={btn.secondary} disabled={primera || moviendo} aria-label={`Subir ${e.nombre}`}>↑ Subir</button>
          </form>
          <form action={mover}>
            <input type="hidden" name="id" value={e.id} />
            <input type="hidden" name="dir" value="bajar" />
            <button type="submit" className={btn.secondary} disabled={ultima || moviendo} aria-label={`Bajar ${e.nombre}`}>↓ Bajar</button>
          </form>
          {puedeQuitar && !quitarAbierto && (
            <button type="button" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-fg-dim hover:text-danger sm:min-h-10" onClick={() => setQuitarAbierto(true)}>Quitar etapa</button>
          )}
        </div>
      )}

      {quitarAbierto && (
        <form action={quitar} className="mt-3 space-y-3 rounded-lg border border-danger/25 bg-danger/5 p-3">
          <input type="hidden" name="id" value={e.id} />
          {e.cuantas > 0 ? (
            <div>
              <label htmlFor={`m-${e.id}`} className={etiqueta}>Sus {e.cuantas} oportunidad{e.cuantas === 1 ? "" : "es"} pasan a</label>
              <select id={`m-${e.id}`} name="moverA" required defaultValue={otras[0]?.id} className={`${campo} field-select pr-8`}>
                {otras.map((o) => <option key={o.id} value={o.id}>{o.nombre} · {o.probabilidad} %</option>)}
              </select>
            </div>
          ) : (
            <p className="text-sm text-fg-mute">No tiene oportunidades; se quita sin mover nada.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-danger-solid px-4 text-sm font-semibold text-on-solid sm:min-h-10" disabled={quitando}>
              {quitando ? "Quitando…" : e.cuantas > 0 ? "Mover y quitar etapa" : "Quitar etapa"}
            </button>
            <button type="button" className={btn.secondary} onClick={() => setQuitarAbierto(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="mt-3 space-y-2 empty:hidden">
        {eG && <MensajeEstado estado={eG} />}
        {eM?.error && <MensajeEstado estado={eM} />}
        {eQ && <MensajeEstado estado={eQ} />}
      </div>
    </li>
  );
}

function NuevaEtapa() {
  const [estado, agregar, agregando] = useActionState(agregarEtapaAction, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) form.current?.reset(); }, [estado]);
  return (
    <form ref={form} action={agregar} className="space-y-3 rounded-xl border border-dashed border-line-mid p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
        <div className="min-w-0">
          <label htmlFor="nueva-etapa" className={etiqueta}>Nueva etapa</label>
          <input id="nueva-etapa" name="nombre" required maxLength={60} className={campo} placeholder="Por ejemplo, Demo agendada" />
        </div>
        <div>
          <label htmlFor="nueva-prob" className={etiqueta}>Probabilidad</label>
          <input id="nueva-prob" name="probabilidad" inputMode="numeric" defaultValue={50} className={campo} />
        </div>
        <button type="submit" className={btn.primary} disabled={agregando}>{agregando ? "Agregando…" : "Agregar etapa"}</button>
      </div>
      <p className="text-xs text-fg-faint">Queda al final de las etapas en curso; súbela a su lugar con las flechas.</p>
      <MensajeEstado estado={estado} />
    </form>
  );
}
