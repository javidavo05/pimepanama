"use client";

/** Enlace del sistema y accesos del cliente, del lado del equipo. Lo que se guarda aquí lo ve el cliente. */
import { useActionState, useState } from "react";
import { borrarAccesoAction, guardarAccesoAction, guardarEnlaceAction, verClaveEquipoAction, type Estado } from "@/app/(empresa)/empresa/(protected)/acciones-accesos";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "./formularios";

export type AccesoVista = { id: string; label: string; url: string | null; username: string | null; notes: string | null; conClave: boolean };

function Msg({ e }: { e: Estado }) {
  if (!e) return null;
  if (e.error) return <p className="text-xs text-danger" role="alert">{e.error}</p>;
  return e.mensaje ? <p className="text-xs text-ok" role="status">{e.mensaje}</p> : null;
}

export function EnlaceSistema({ projectId, liveUrl }: { projectId: string; liveUrl: string | null }) {
  const [e, a, p] = useActionState(guardarEnlaceAction, null);
  return (
    <form action={a} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div><label className={etiqueta} htmlFor={`url-${projectId}`}>Enlace del sistema en producción</label><input id={`url-${projectId}`} name="liveUrl" inputMode="url" defaultValue={liveUrl ?? ""} className={campo} placeholder="https://holorealty.com" /></div>
      <button className={btn.secondary} disabled={p}>{p ? "Guardando…" : "Guardar enlace"}</button>
      <div className="sm:col-span-2 empty:hidden"><Msg e={e} /></div>
    </form>
  );
}

function AccesoForm({ projectId, a, onListo }: { projectId: string; a?: AccesoVista; onListo?: () => void }) {
  const [e, accion, p] = useActionState(async (s: Estado, f: FormData) => { const r = await guardarAccesoAction(s, f); if (r?.ok) onListo?.(); return r; }, null);
  return (
    <form action={accion} className="space-y-3 rounded-xl bg-fill p-4">
      <input type="hidden" name="projectId" value={projectId} />{a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={etiqueta}>Qué es</label><input name="label" required defaultValue={a?.label} className={campo} placeholder="Panel de administración" /></div>
        <div><label className={etiqueta}>Dirección</label><input name="url" inputMode="url" defaultValue={a?.url ?? ""} className={campo} placeholder="https://holorealty.com/admin" /></div>
        <div><label className={etiqueta}>Usuario o correo</label><input name="username" defaultValue={a?.username ?? ""} className={campo} autoComplete="off" /></div>
        <div><label className={etiqueta}>Clave{a?.conClave ? " (vacía = no cambia)" : ""}</label><input name="secret" type="password" className={campo} autoComplete="new-password" /></div>
        <div className="sm:col-span-2"><label className={etiqueta}>Nota para el cliente</label><input name="notes" defaultValue={a?.notes ?? ""} className={campo} placeholder="Cámbiala al primer ingreso" /></div>
      </div>
      <Msg e={e} />
      <button className={btn.primary} disabled={p}>{p ? "Guardando…" : a ? "Guardar acceso" : "Agregar acceso"}</button>
    </form>
  );
}

function AccesoFila({ projectId, a }: { projectId: string; a: AccesoVista }) {
  const [editar, setEditar] = useState(false);
  const [eV, aV, pV] = useActionState(verClaveEquipoAction, null);
  const [eB, aB, pB] = useActionState(borrarAccesoAction, null);
  return (
    <li className="rounded-xl border border-line p-4 space-y-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="text-fg font-semibold break-words">{a.label}</p><p className="text-fg-dim text-xs break-all">{[a.url, a.username].filter(Boolean).join(" · ") || "Sin dirección ni usuario"}</p></div>
        <div className="flex flex-wrap gap-2">
          {a.conClave && <form action={aV}><input type="hidden" name="id" value={a.id} /><button className="text-xs font-semibold text-brand-fg min-h-10 px-2" disabled={pV}>{eV?.valor ? <span className="font-mono select-all">{eV.valor}</span> : "Ver clave"}</button></form>}
          <button type="button" className="text-xs font-semibold text-fg-dim hover:text-fg min-h-10 px-2" onClick={() => setEditar((v) => !v)}>{editar ? "Cerrar" : "Editar"}</button>
          <form action={aB}><input type="hidden" name="id" value={a.id} /><button className="text-xs font-semibold text-fg-faint hover:text-danger min-h-10 px-2" disabled={pB}>Quitar</button></form>
        </div>
      </div>
      {eV?.error && <Msg e={eV} />}<Msg e={eB} />
      {editar && <AccesoForm projectId={projectId} a={a} onListo={() => setEditar(false)} />}
    </li>
  );
}

export function AccesosCliente({ projectId, liveUrl, accesos }: { projectId: string; liveUrl: string | null; accesos: AccesoVista[] }) {
  return (
    <div className="space-y-4">
      <EnlaceSistema projectId={projectId} liveUrl={liveUrl} />
      {accesos.length > 0 && <ul className="space-y-3">{accesos.map((a) => <AccesoFila key={a.id} projectId={projectId} a={a} />)}</ul>}
      <details open={!accesos.length} className="rounded-xl border border-dashed border-line-mid">
        <summary className="flex items-center cursor-pointer p-4 text-sm font-semibold text-brand-fg min-h-11">+ Agregar acceso</summary>
        <div className="p-4 pt-0"><AccesoForm projectId={projectId} /></div>
      </details>
    </div>
  );
}
