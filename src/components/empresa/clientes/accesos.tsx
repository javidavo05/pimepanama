"use client";

/** Enlace del sistema y accesos del cliente, del lado del equipo. Lo que se guarda aquí lo ve el cliente. */
import { useActionState, useState } from "react";
import { borrarAccesoAction, guardarAccesoAction, guardarEnlaceAction, textoAccesosAction, verClaveEquipoAction, type Estado } from "@/app/(empresa)/empresa/(protected)/acciones-accesos";
import { btn } from "@/components/empresa/page-header";
import Link from "@/components/empresa/link";
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

/**
 * Copia el mensaje con los accesos (claves incluidas) para pegarlo en WhatsApp o un correo. El texto se pide al
 * servidor dentro del mismo toque: Safari solo deja escribir en el portapapeles si la promesa nace del clic.
 */
export function CopiarAccesos({ clientId, projectId, etiqueta, className }: { clientId: string; projectId?: string; etiqueta: string; className: string }) {
  const [estado, setEstado] = useState<"listo" | "copiando" | "copiado" | string>("listo");
  async function copiar() {
    setEstado("copiando");
    const texto = textoAccesosAction(clientId, projectId).then((r) => { if (!r?.valor) throw new Error(r?.error ?? "No se pudo armar el mensaje."); return r.valor; });
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": texto.then((t) => new Blob([t], { type: "text/plain" })) })]);
      } else {
        await navigator.clipboard.writeText(await texto);
      }
      setEstado("copiado");
      setTimeout(() => setEstado("listo"), 2400);
    } catch (e) {
      const t = await texto.catch((x: Error) => x);
      setEstado(t instanceof Error ? t.message : e instanceof Error && e.name === "NotAllowedError" ? "El navegador no dejó copiar. Vuelve a tocar el botón." : "No se pudo copiar.");
    }
  }
  const error = estado !== "listo" && estado !== "copiando" && estado !== "copiado";
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} onClick={copiar} disabled={estado === "copiando"} aria-busy={estado === "copiando"}>
        {estado === "copiando" ? "Copiando…" : estado === "copiado" ? "Copiado: pégalo en el mensaje" : etiqueta}
      </button>
      <span className="text-xs text-danger empty:hidden" role="alert">{error ? estado : ""}</span>
    </span>
  );
}

type ProyectoConAccesos = { id: string; name: string; liveUrl: string | null; accesos: AccesoVista[] };

/** Accesos de todos los proyectos del cliente en su ficha: a la mano, y listos para copiar y mandárselos. */
export function AccesosDelCliente({ clientId, proyectos, className, h2 }: { clientId: string; proyectos: ProyectoConAccesos[]; className: string; h2: string }) {
  const conAlgo = proyectos.filter((p) => p.liveUrl || p.accesos.length);
  const enlace = "inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline";
  return (
    <section className={className} aria-labelledby="accesos-titulo">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="accesos-titulo" className={h2}>Accesos</h2>
          {conAlgo.length > 0 && <p className="mt-1 text-sm text-fg-dim">Enlaces, usuarios y claves de sus sistemas. El mensaje copiado lleva las claves: mándalo solo por un canal directo con el cliente.</p>}
        </div>
        {conAlgo.length > 0 && <CopiarAccesos clientId={clientId} etiqueta={conAlgo.length > 1 ? "Copiar todos los accesos" : "Copiar accesos"} className={`w-full sm:w-auto shrink-0 ${btn.primary}`} />}
      </div>
      {conAlgo.length ? (
        <ul className="mt-4 space-y-4">
          {conAlgo.map((p) => (
            <li key={p.id} className="rounded-xl border border-line p-4 space-y-3 min-w-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">{p.name}</p>
                <div className="flex flex-wrap gap-x-4">
                  {conAlgo.length > 1 && <CopiarAccesos clientId={clientId} projectId={p.id} etiqueta="Copiar este" className="inline-flex items-center min-h-11 sm:min-h-8 text-sm font-semibold text-brand-fg hover:underline disabled:opacity-60" />}
                  <Link href={`/empresa/proyectos/${p.id}?tab=fases#acceso-cliente`} className={enlace}>Editar</Link>
                </div>
              </div>
              {p.liveUrl && <p className="text-sm"><span className="text-fg-dim">Sistema: </span><a href={p.liveUrl} target="_blank" rel="noopener" className="text-brand-fg hover:underline break-all">{p.liveUrl.replace(/^https?:\/\//, "")}</a></p>}
              {p.accesos.length > 0 && (
                <ul className="divide-y divide-line">
                  {p.accesos.map((a) => <AccesoLectura key={a.id} a={a} />)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : proyectos.length ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm text-fg-dim">Todavía no hay accesos guardados. Agrégalos en la ficha del proyecto y aparecen aquí y en la cuenta del cliente.</p>
          {proyectos.slice(0, 3).map((p) => <Link key={p.id} href={`/empresa/proyectos/${p.id}?tab=fases#acceso-cliente`} className={`${enlace} mr-4`}>+ Acceso en {p.name}</Link>)}
        </div>
      ) : <p className="mt-3 text-sm text-fg-dim">Sin proyectos todavía. Los accesos se guardan en cada proyecto.</p>}
    </section>
  );
}

function AccesoLectura({ a }: { a: AccesoVista }) {
  const [e, accion, p] = useActionState(verClaveEquipoAction, null);
  return (
    <li className="py-3 first:pt-0 last:pb-0 min-w-0">
      <p className="text-fg text-sm font-medium [overflow-wrap:anywhere]">{a.label}</p>
      <dl className="mt-1 grid gap-1 text-xs sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-3">
        {a.url && <><dt className="text-fg-dim">Dirección</dt><dd className="min-w-0"><a href={a.url} target="_blank" rel="noopener" className="text-brand-fg hover:underline break-all">{a.url}</a></dd></>}
        {a.username && <><dt className="text-fg-dim">Usuario</dt><dd className="text-fg font-mono break-all select-all">{a.username}</dd></>}
        {a.conClave && (
          <><dt className="text-fg-dim">Clave</dt><dd className="min-w-0">
            {e?.valor ? <span className="text-fg font-mono break-all select-all">{e.valor}</span> : (
              <form action={accion} className="inline"><input type="hidden" name="id" value={a.id} /><button className="inline-flex items-center min-h-11 sm:min-h-6 font-semibold text-brand-fg hover:underline" disabled={p}>{p ? "Abriendo…" : "Ver clave"}</button></form>
            )}
            {e?.error && <span className="ml-2 text-danger" role="alert">{e.error}</span>}
          </dd></>
        )}
        {a.notes && <><dt className="text-fg-dim">Nota</dt><dd className="text-fg-mute [overflow-wrap:anywhere]">{a.notes}</dd></>}
      </dl>
    </li>
  );
}
