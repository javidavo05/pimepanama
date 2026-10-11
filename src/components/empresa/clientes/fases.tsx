"use client";

/** Fases del proyecto y órdenes de cambio, del lado del equipo. Lo que se guarda aquí es lo que ve el cliente. */
import { useActionState, useState } from "react";
import Link from "next/link";
import { sincronizarGithubAction, avanceFaseAction, borrarFaseAction, enviarOrdenAction, facturarFaseAction, guardarFaseAction, guardarOrdenAction, tipoProyectoAction, type Estado } from "@/app/(empresa)/empresa/(protected)/acciones-clientes";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "./formularios";

const COBRO = [["al_aprobar", "Al aprobar"], ["al_iniciar", "Al empezar"], ["al_entregar", "Al entregar"], ["sin_cobro", "Sin cobro"]] as const;
const ESTADO = [["pendiente", "Por empezar"], ["en_curso", "En curso"], ["en_revision", "En revisión del cliente"], ["hecha", "Terminada"]] as const;

function Msg({ e }: { e: Estado }) {
  if (!e) return null;
  if (e.error) return <p className="text-xs text-danger" role="alert">{e.error}</p>;
  return e.mensaje ? <p className="text-xs text-ok" role="status">{e.mensaje} {e.enlace?.startsWith("/") && <Link href={e.enlace} className="underline font-semibold">Abrir</Link>}</p> : null;
}

export type FaseVista = { id: string; name: string; description: string | null; price: number; billingPoint: string; status: string; progress: number; estimatedDays: number | null; githubMilestone: number | null; invoiceId: string | null; invoiceNumber: string | null };

export function FaseFila({ projectId, f, indice }: { projectId: string; f: FaseVista; indice: number }) {
  const [editar, setEditar] = useState(false);
  const [eA, aA, pA] = useActionState(avanceFaseAction, null);
  const [eF, aF, pF] = useActionState(facturarFaseAction, null);
  const [eB, aB, pB] = useActionState(borrarFaseAction, null);
  return (
    <li className="rounded-xl border border-line p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="text-fg-dim text-xs">Fase {indice + 1}{f.githubMilestone ? ` · GitHub milestone #${f.githubMilestone}` : ""}</p><p className="text-fg font-semibold break-words">{f.name}</p></div>
        <p className="font-mono text-sm text-fg shrink-0">{f.price ? `$${f.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Incluida"} · {COBRO.find((c) => c[0] === f.billingPoint)?.[1]}</p>
      </div>
      <form action={aA} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
        <input type="hidden" name="faseId" value={f.id} /><input type="hidden" name="projectId" value={projectId} />
        <div><label className={etiqueta} htmlFor={`st-${f.id}`}>Estado</label><select id={`st-${f.id}`} name="status" defaultValue={f.status} className={`${campo} field-select pr-8`}>{ESTADO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div><label className={etiqueta} htmlFor={`pr-${f.id}`}>Avance %</label><input id={`pr-${f.id}`} name="progress" type="number" min={0} max={100} step={5} defaultValue={Math.round(f.progress)} className={campo} /></div>
        <button className={btn.secondary} disabled={pA}>Actualizar</button>
      </form>
      <Msg e={eA} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="text-xs font-semibold text-fg-dim hover:text-fg min-h-10 px-2" onClick={() => setEditar((v) => !v)}>{editar ? "Cerrar edición" : "Editar fase"}</button>
        {f.invoiceId ? <Link href={`/empresa/facturas/${f.invoiceId}`} className="text-xs font-semibold text-brand-fg min-h-10 px-2 inline-flex items-center">Factura {f.invoiceNumber}</Link>
          : f.price > 0 && <form action={aF}><input type="hidden" name="faseId" value={f.id} /><button className="text-xs font-semibold text-sand-fg hover:underline min-h-10 px-2" disabled={pF}>Facturar esta fase</button></form>}
        {!f.invoiceId && <form action={aB}><input type="hidden" name="faseId" value={f.id} /><button className="text-xs font-semibold text-fg-faint hover:text-danger min-h-10 px-2" disabled={pB}>Borrar</button></form>}
      </div>
      <Msg e={eF} /><Msg e={eB} />
      {editar && <FaseForm projectId={projectId} f={f} />}
    </li>
  );
}

export function FaseForm({ projectId, f }: { projectId: string; f?: FaseVista }) {
  const [e, a, p] = useActionState(guardarFaseAction, null);
  return (
    <form action={a} className="space-y-3 rounded-xl bg-fill p-4">
      <input type="hidden" name="projectId" value={projectId} />{f && <input type="hidden" name="id" value={f.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={etiqueta}>Nombre</label><input name="name" required defaultValue={f?.name} className={campo} placeholder="Ej. Facturación electrónica" /></div>
        <div className="sm:col-span-2"><label className={etiqueta}>Qué incluye (lo ve el cliente)</label><textarea name="description" rows={2} defaultValue={f?.description ?? ""} className={`${campo} py-2`} /></div>
        <div><label className={etiqueta}>Precio USD</label><input name="price" inputMode="decimal" defaultValue={f?.price ?? ""} className={campo} /></div>
        <div><label className={etiqueta}>Se cobra</label><select name="billingPoint" defaultValue={f?.billingPoint ?? "al_entregar"} className={`${campo} field-select pr-8`}>{COBRO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div><label className={etiqueta}>Plazo (días)</label><input name="estimatedDays" inputMode="numeric" defaultValue={f?.estimatedDays ?? ""} className={campo} /></div>
        <div><label className={etiqueta}>Milestone de GitHub</label><input name="githubMilestone" inputMode="numeric" defaultValue={f?.githubMilestone ?? ""} className={campo} placeholder="Número; el avance se mueve solo" /></div>
      </div>
      <Msg e={e} />
      <button className={btn.primary} disabled={p}>{p ? "Guardando…" : f ? "Guardar fase" : "Agregar fase"}</button>
    </form>
  );
}

export function TipoProyecto({ projectId, kind, portalVisible }: { projectId: string; kind: string; portalVisible: boolean }) {
  const [e, a, p] = useActionState(tipoProyectoAction, null);
  return (
    <form action={a} className="grid gap-3 sm:grid-cols-2 sm:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div><label className={etiqueta}>Tipo</label><select name="kind" defaultValue={kind} className={`${campo} field-select pr-8`}><option value="nuevo">Proyecto nuevo</option><option value="modificacion">Modificación</option><option value="soporte">Soporte continuo</option></select></div>
      <div><label className={etiqueta}>Cuenta del cliente</label><select name="portalVisible" defaultValue={portalVisible ? "1" : "0"} className={`${campo} field-select pr-8`}><option value="1">Lo ve el cliente</option><option value="0">Oculto</option></select></div>
      <button className={`${btn.secondary} sm:col-span-2 w-full`} disabled={p}>Guardar tipo y visibilidad</button>
      <div className="sm:col-span-2 empty:hidden"><Msg e={e} /></div>
    </form>
  );
}

type FilaOrden = { name: string; price: string; billingPoint: string; estimatedDays: string; description: string };
export function OrdenForm({ projectId, ticketId, abierta }: { projectId: string; ticketId?: string; abierta?: boolean }) {
  const [e, a, p] = useActionState(guardarOrdenAction, null);
  const [mostrar, setMostrar] = useState(!!abierta);
  const [filas, setFilas] = useState<FilaOrden[]>([{ name: "", price: "", billingPoint: "al_entregar", estimatedDays: "", description: "" }]);
  const total = filas.reduce((s, f) => s + (Number(f.price) || 0), 0);
  if (!mostrar) return <button type="button" className={btn.secondary} onClick={() => setMostrar(true)}>+ Orden de cambio</button>;
  const cambiar = (i: number, k: keyof FilaOrden, v: string) => setFilas((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <form action={a} className="space-y-4 rounded-xl border border-line p-4">
      <input type="hidden" name="projectId" value={projectId} />{ticketId && <input type="hidden" name="ticketId" value={ticketId} />}
      <input type="hidden" name="fases" value={JSON.stringify(filas)} />
      <div><label className={etiqueta}>Qué cambia</label><input name="titulo" required className={campo} placeholder="Ej. Filtro por vendedor en el reporte de cobros" /></div>
      <div><label className={etiqueta}>Detalle para el cliente</label><textarea name="descripcion" rows={3} className={`${campo} py-2`} /></div>
      <ol className="space-y-3">
        {filas.map((f, i) => (
          <li key={i} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_7rem_9rem_5rem_auto] sm:items-end">
            <div><label className={etiqueta}>Fase {i + 1}</label><input value={f.name} onChange={(x) => cambiar(i, "name", x.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Precio</label><input value={f.price} inputMode="decimal" onChange={(x) => cambiar(i, "price", x.target.value)} className={campo} /></div>
            <div><label className={etiqueta}>Se cobra</label><select value={f.billingPoint} onChange={(x) => cambiar(i, "billingPoint", x.target.value)} className={`${campo} field-select pr-8`}>{COBRO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
            <div><label className={etiqueta}>Días</label><input value={f.estimatedDays} inputMode="numeric" onChange={(x) => cambiar(i, "estimatedDays", x.target.value)} className={campo} /></div>
            {filas.length > 1 ? <button type="button" className="min-h-11 px-2 text-xs text-fg-faint hover:text-danger" onClick={() => setFilas((xs) => xs.filter((_, j) => j !== i))}>Quitar</button> : <span />}
          </li>
        ))}
      </ol>
      <button type="button" className="text-sm font-semibold text-brand-fg" onClick={() => setFilas((xs) => [...xs, { name: "", price: "", billingPoint: "al_entregar", estimatedDays: "", description: "" }])}>+ Otra fase</button>
      <p className="text-sm text-fg-dim">Total: <span className="font-mono text-fg">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></p>
      <Msg e={e} />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button name="enviar" value="0" className={btn.secondary} disabled={p}>Guardar borrador</button>
        <button name="enviar" value="1" className={btn.primary} disabled={p}>Enviar al cliente para aprobar</button>
      </div>
    </form>
  );
}

export function EnviarOrden({ ordenId }: { ordenId: string }) {
  const [e, a, p] = useActionState(enviarOrdenAction, null);
  return <form action={a}><input type="hidden" name="ordenId" value={ordenId} /><button className="text-xs font-semibold text-brand-fg hover:underline min-h-10 px-2" disabled={p}>Enviar al cliente</button><Msg e={e} /></form>;
}

export function SincronizarGithub({ projectId, repo }: { projectId: string; repo: string | null }) {
  const [e, a, p] = useActionState(sincronizarGithubAction, null);
  if (!repo) return <p className="text-xs text-fg-dim">Conecta el repositorio del proyecto (pestaña Resumen) y pon el número de milestone en cada fase: el avance se mueve solo cuando se cierran sus tareas.</p>;
  return (
    <form action={a} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <span className="text-xs text-fg-dim">GitHub: <span className="font-mono text-fg-mute">{repo}</span></span>
      <button className="text-xs font-semibold text-brand-fg hover:underline min-h-10" disabled={p}>{p ? "Sincronizando…" : "Sincronizar avance ahora"}</button>
      <Msg e={e} />
    </form>
  );
}
