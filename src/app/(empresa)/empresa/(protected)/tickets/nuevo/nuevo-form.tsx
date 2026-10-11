"use client";

import { useActionState, useState } from "react";
import { crearTicketEquipoAction } from "../../acciones-clientes";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";

export function NuevoTicketEquipo({ clientes, proyectos, clientId }: { clientes: { id: string; nombre: string }[]; proyectos: { id: string; nombre: string; clientes: string[] }[]; clientId?: string }) {
  const [estado, accion, enviando] = useActionState(crearTicketEquipoAction, null);
  const [cliente, setCliente] = useState(clientId ?? "");
  const suyos = proyectos.filter((p) => p.clientes.includes(cliente));
  return (
    <form action={accion} className="space-y-4">
      <div><label htmlFor="clientId" className={etiqueta}>Cliente</label>
        <select id="clientId" name="clientId" required value={cliente} onChange={(e) => setCliente(e.target.value)} className={`${campo} field-select pr-8`}>
          <option value="">Elige un cliente</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select></div>
      {suyos.length > 0 && <div><label htmlFor="projectId" className={etiqueta}>Proyecto</label><select id="projectId" name="projectId" defaultValue={suyos.length === 1 ? suyos[0].id : ""} className={`${campo} field-select pr-8`}><option value="">Ninguno</option>{suyos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>}
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="tipo" className={etiqueta}>Tipo</label><select id="tipo" name="tipo" defaultValue="soporte" className={`${campo} field-select pr-8`}><option value="soporte">Soporte</option><option value="cambio">Cambio</option><option value="nuevo">Algo nuevo</option><option value="incidente">Incidente</option></select></div>
        <div><label htmlFor="prioridad" className={etiqueta}>Prioridad</label><select id="prioridad" name="prioridad" defaultValue="normal" className={`${campo} field-select pr-8`}><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div>
      </div>
      <div><label htmlFor="titulo" className={etiqueta}>Título</label><input id="titulo" name="titulo" required maxLength={160} className={campo} /></div>
      <div><label htmlFor="detalle" className={etiqueta}>Detalle</label><textarea id="detalle" name="detalle" rows={5} className={`${campo} py-2`} /></div>
      <label className="flex items-center gap-3 text-sm text-fg-mute"><input type="checkbox" name="interno" value="1" className="h-5 w-5" />El detalle es una nota interna (el cliente solo ve el título)</label>
      {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
      <div className="flex justify-end"><button className={btn.primary} disabled={enviando}>{enviando ? "Creando…" : "Crear ticket"}</button></div>
    </form>
  );
}
