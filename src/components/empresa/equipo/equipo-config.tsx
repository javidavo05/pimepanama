"use client";

/**
 * Equipo de la empresa en Configuración (solo el dueño): quién entra, con qué área, y la invitación de alguien
 * nuevo. Todos trabajan sobre los mismos clientes; el área decide qué secciones ve cada uno.
 */
import { useActionState, useState } from "react";
import { activarMiembroAction, anularInvitacionAction, cambiarAreaAction, invitarMiembroAction, type EstadoEquipo } from "@/app/(empresa)/empresa/(protected)/acciones-equipo";
import { AREA_DETALLE, AREA_LABEL, type Area } from "@/lib/auth/permisos";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";

export type FilaEquipo = { id: string; email: string; fullName: string | null; area: string; activo: boolean; pendiente: boolean };
const AREAS_MIEMBRO: Exclude<Area, "dueno">[] = ["ventas", "proyectos", "finanzas"];

function Mensaje({ estado }: { estado: EstadoEquipo }) {
  if (!estado) return null;
  if (estado.error) return <p className="text-xs text-danger" role="alert">{estado.error}</p>;
  return (
    <div className="grid gap-1" role="status">
      <p className="text-xs text-ok">{estado.mensaje}</p>
      {estado.enlace && <input readOnly value={estado.enlace} onFocus={(e) => e.currentTarget.select()} className={`${campo} font-mono text-xs`} aria-label="Enlace de invitación" />}
    </div>
  );
}

function CambiarArea({ fila }: { fila: FilaEquipo }) {
  const [estado, enviar, enviando] = useActionState(cambiarAreaAction, null);
  const [area, setArea] = useState(fila.area);
  return (
    <form action={enviar} className="grid gap-1">
      <input type="hidden" name="id" value={fila.id} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`area-${fila.id}`} className="sr-only">Área de {fila.fullName ?? fila.email}</label>
        <select id={`area-${fila.id}`} name="area" value={area} onChange={(e) => setArea(e.target.value)} className={`${campo.replace("w-full", "w-auto")} field-select pr-8`}>
          {AREAS_MIEMBRO.map((a) => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}
        </select>
        <button type="submit" className="inline-flex items-center min-h-11 px-3 rounded-lg border border-line-mid text-sm font-semibold text-fg disabled:opacity-40" disabled={area === fila.area || enviando}>{enviando ? "Guardando…" : "Cambiar área"}</button>
      </div>
      <Mensaje estado={estado} />
    </form>
  );
}

export function EquipoConfig({ dueno, filas }: { dueno: { email: string; fullName: string | null }; filas: FilaEquipo[] }) {
  const [estado, enviar, enviando] = useActionState(invitarMiembroAction, null);
  const [area, setArea] = useState<Exclude<Area, "dueno">>("ventas");
  return (
    <section className="bg-panel border border-line rounded-2xl p-6 space-y-6" id="equipo">
      <div>
        <h2 className="text-fg text-sm font-semibold">Equipo</h2>
        <p className="text-fg-dim text-xs mt-1">Todos trabajan sobre los mismos clientes. El área decide qué secciones ve cada uno; el correo y estos ajustes son solo tuyos.</p>
      </div>

      <ul className="divide-y divide-line">
        <li className="flex flex-wrap items-center justify-between gap-2 py-3">
          <span className="min-w-0"><span className="block text-fg text-sm font-medium [overflow-wrap:anywhere]">{dueno.fullName ?? dueno.email}</span><span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{dueno.email}</span></span>
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-brand/10 text-brand-fg">Dueño</span>
        </li>
        {filas.map((f) => (
          <li key={f.id} className={`grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${f.activo ? "" : "opacity-70"}`}>
            <span className="min-w-0">
              <span className="block text-fg text-sm font-medium [overflow-wrap:anywhere]">{f.fullName ?? f.email}</span>
              <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">{f.email} · {f.pendiente ? "invitación enviada, todavía no entra" : f.activo ? AREA_LABEL[f.area as Area] ?? f.area : "sin acceso"}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {(f.activo || f.pendiente) && <CambiarArea fila={f} />}
              <form action={f.pendiente ? anularInvitacionAction : activarMiembroAction}>
                <input type="hidden" name="id" value={f.id} />
                <button type="submit" className="inline-flex items-center min-h-11 px-3 rounded-lg text-sm font-semibold text-fg-mute hover:text-fg hover:bg-fill">
                  {f.pendiente ? "Anular invitación" : f.activo ? "Quitar acceso" : "Devolver acceso"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {filas.length === 0 && <p className="text-fg-dim text-sm">Todavía trabajas solo. Invita a alguien: entra con su propio correo y ve solo lo de su área.</p>}

      <form action={enviar} className="grid gap-3 border-t border-line pt-6">
        <h3 className="text-fg text-sm font-semibold">Invitar a alguien</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="eq-email" className={etiqueta}>Correo</label><input id="eq-email" name="email" type="email" inputMode="email" required placeholder="nombre@empresa.com" className={campo} /></div>
          <div><label htmlFor="eq-nombre" className={etiqueta}>Nombre</label><input id="eq-nombre" name="fullName" placeholder="Nombre y apellido" className={campo} /></div>
        </div>
        <fieldset className="grid gap-2">
          <legend className={etiqueta}>Área</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {AREAS_MIEMBRO.map((a) => (
              <label key={a} className={`grid gap-1 rounded-xl border p-3 cursor-pointer ${area === a ? "border-brand bg-brand/5" : "border-line-mid"}`}>
                <span className="flex items-center gap-2 text-sm font-semibold text-fg"><input type="radio" name="area" value={a} checked={area === a} onChange={() => setArea(a)} className="accent-current" />{AREA_LABEL[a]}</span>
                <span className="text-xs text-fg-dim">{AREA_DETALLE[a]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Mensaje estado={estado} />
        <button type="submit" className={`${btn.primary} justify-self-start`} disabled={enviando}>{enviando ? "Enviando…" : `Invitar a ${AREA_LABEL[area]}`}</button>
      </form>
    </section>
  );
}
