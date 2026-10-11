"use client";

import { useActionState, useState } from "react";
import { guardarSistemaAction, probarSistemaAction, rotarSecretoAction, type EstadoSistemaForm } from "@/app/(empresa)/empresa/(protected)/acciones-sistemas";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";

const errorBox = "rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger";
const okBox = "rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok";

function Mensajes({ estado }: { estado: EstadoSistemaForm }) {
  if (!estado) return null;
  if (estado.error) return <p className={errorBox} role="alert">{estado.error}</p>;
  if (estado.ok && estado.mensaje) return <p className={okBox} role="status">{estado.mensaje}</p>;
  return null;
}

type Opcion = { id: string; nombre: string };
type Proyecto = Opcion & { clientId: string };
type Sistema = { id: string; name: string; clientId: string; projectId: string | null; url: string | null; healthUrl: string | null; portalVisible: boolean };

/** Sugerir la dirección de salud a partir de la del sistema: el paquete la publica en /api/salud. */
const saludDe = (url: string) => {
  try { const u = new URL(url); return `${u.origin}/api/salud`; } catch { return ""; }
};

export function SistemaForm({ s, clientes, proyectos, clienteInicial }: { s?: Sistema; clientes: Opcion[]; proyectos: Proyecto[]; clienteInicial?: string }) {
  const [estado, accion, enviando] = useActionState(guardarSistemaAction, null);
  const [clientId, setClientId] = useState(s?.clientId ?? clienteInicial ?? (clientes.length === 1 ? clientes[0].id : ""));
  const [url, setUrl] = useState(s?.url ?? "");
  const [salud, setSalud] = useState(s?.healthUrl ?? "");
  const [saludTocada, setSaludTocada] = useState(!!s?.healthUrl);
  const delCliente = proyectos.filter((p) => p.clientId === clientId);
  return (
    <form action={accion} className="space-y-6">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="name" className={etiqueta}>Nombre del sistema</label><input id="name" name="name" required defaultValue={s?.name} className={campo} placeholder="Ej.: Citas de la clínica" autoComplete="off" /></div>
        <div className="sm:col-span-2">
          <label htmlFor="clientId" className={etiqueta}>Cliente</label>
          <select id="clientId" name="clientId" required value={clientId} onChange={(e) => setClientId(e.target.value)} className={campo}>
            <option value="" disabled>Elige un cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="projectId" className={etiqueta}>Proyecto (opcional)</label>
          <select id="projectId" name="projectId" defaultValue={s?.projectId ?? (delCliente.length === 1 ? delCliente[0].id : "")} key={clientId} className={campo} disabled={!delCliente.length}>
            <option value="">{delCliente.length ? "Sin proyecto" : "Este cliente no tiene proyectos"}</option>
            {delCliente.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="url" className={etiqueta}>Dirección del sistema</label>
          <input id="url" name="url" type="url" inputMode="url" value={url} onChange={(e) => { setUrl(e.target.value); if (!saludTocada) setSalud(saludDe(e.target.value)); }} className={campo} placeholder="https://citas.ejemplo.com" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="healthUrl" className={etiqueta}>Dirección de salud</label>
          <input id="healthUrl" name="healthUrl" type="url" inputMode="url" value={salud} onChange={(e) => { setSalud(e.target.value); setSaludTocada(true); }} className={campo} placeholder="https://citas.ejemplo.com/api/salud" autoComplete="off" />
          <p className="mt-1.5 text-xs text-fg-dim">Pime la consulta cada 30 min. Vacía = solo recibe errores y despliegues.</p>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-fg-mute">
        <input type="checkbox" name="portalVisible" value="1" defaultChecked={s?.portalVisible ?? true} className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-brand))]" />
        <span>El cliente ve el estado en su cuenta <span className="block text-xs text-fg-dim">Solo «En línea» o «Con problemas», nunca el detalle técnico.</span></span>
      </label>
      <Mensajes estado={estado} />
      <div className="flex justify-end"><button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : s ? "Guardar cambios" : "Conectar y ver las credenciales"}</button></div>
    </form>
  );
}

export function ProbarAhora({ id, conSalud }: { id: string; conSalud: boolean }) {
  const [estado, accion, enviando] = useActionState(probarSistemaAction, null);
  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`${btn.secondary} w-full`} disabled={enviando || !conSalud}>{enviando ? "Consultando…" : "Consultar la salud ahora"}</button>
      {!conSalud && <p className="text-xs text-fg-dim">Agrega una dirección de salud para poder consultarla.</p>}
      <Mensajes estado={estado} />
    </form>
  );
}

export function RotarSecreto({ id }: { id: string }) {
  const [estado, accion, enviando] = useActionState(rotarSecretoAction, null);
  const [seguro, setSeguro] = useState(false);
  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {seguro ? (
        <div className="space-y-3">
          <p className="text-sm text-fg-mute">El sistema deja de poder reportar hasta que pongas el secreto nuevo en sus variables.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btn.secondary} onClick={() => setSeguro(false)}>No cambiar</button>
            <button type="submit" className="inline-flex items-center justify-center min-h-11 px-4 rounded-lg bg-danger text-on-solid text-sm font-semibold" disabled={enviando}>{enviando ? "Cambiando…" : "Cambiar secreto"}</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${btn.secondary} w-full`} onClick={() => setSeguro(true)}>Cambiar el secreto</button>
      )}
      <Mensajes estado={estado} />
    </form>
  );
}

export function Copiar({ texto, etiqueta: et = "Copiar" }: { texto: string; etiqueta?: string }) {
  const [hecho, setHecho] = useState(false);
  return (
    <button type="button" className="inline-flex items-center min-h-11 sm:min-h-8 px-3 rounded-lg border border-line-mid text-xs font-semibold text-fg-mute hover:text-fg hover:border-line-loud" onClick={async () => { try { await navigator.clipboard.writeText(texto); setHecho(true); setTimeout(() => setHecho(false), 2000); } catch { /* sin permiso de portapapeles */ } }}>
      {hecho ? "Copiado" : et}
    </button>
  );
}

/** El secreto se muestra tapado y se destapa a pedido. */
export function SecretoOculto({ valor }: { valor: string }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-fill px-3 py-2 font-mono text-xs text-fg">{ver ? valor : "•".repeat(32)}</code>
      <button type="button" onClick={() => setVer((v) => !v)} className="inline-flex items-center min-h-11 sm:min-h-8 px-3 rounded-lg border border-line-mid text-xs font-semibold text-fg-mute hover:text-fg">{ver ? "Ocultar" : "Ver"}</button>
      <Copiar texto={valor} />
    </div>
  );
}
