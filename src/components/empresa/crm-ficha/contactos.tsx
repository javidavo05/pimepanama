"use client";

/**
 * Contactos de la empresa cliente: quién decide, quién paga, quién es el técnico. Correo y teléfono se tocan
 * para escribir o llamar; WhatsApp abre la conversación en otra pestaña y, al volver, ofrece registrarla.
 */
import { useActionState, useEffect, useState } from "react";
import { borrarContactoAction, guardarContactoAction, marcarPrincipalAction } from "@/app/(empresa)/empresa/(protected)/acciones-crm-ficha";
import { ROLES_CONTACTO, ROL_CONTACTO_LABEL, numeroWhatsapp, type RolContacto } from "@/lib/crm/ficha";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";
import { abrirRegistro } from "./registrar";
import { Resultado, botonChico, card, chip, h2 } from "./comun";

export type ContactoFila = { id: string; nombre: string; cargo: string | null; email: string | null; telefono: string | null; rol: string; principal: boolean };

const ROL_COLOR: Record<RolContacto, string> = { decide: "bg-brand/10 text-brand-fg", paga: "bg-ok/10 text-ok", tecnico: "bg-sand/15 text-sand-fg", otro: "bg-fill-2 text-fg-dim" };
const rolDe = (r: string): RolContacto => ((ROLES_CONTACTO as readonly string[]).includes(r) ? (r as RolContacto) : "otro");

function FormContacto({ clientId, k, sugerido, onListo }: { clientId: string; k?: ContactoFila; sugerido?: Partial<ContactoFila>; onListo: () => void }) {
  const [estado, accion, enviando] = useActionState(guardarContactoAction, null);
  useEffect(() => { if (estado?.ok) onListo(); }, [estado, onListo]);
  const v = k ?? sugerido ?? {};
  const pre = k?.id ?? "nuevo";
  return (
    <form action={accion} className="space-y-4 rounded-xl border border-line bg-fill p-4">
      <input type="hidden" name="clientId" value={clientId} />
      {k && <input type="hidden" name="id" value={k.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0"><label htmlFor={`${pre}-nombre`} className={etiqueta}>Nombre</label><input id={`${pre}-nombre`} name="nombre" required defaultValue={v.nombre ?? ""} className={campo} autoComplete="off" /></div>
        <div className="min-w-0"><label htmlFor={`${pre}-cargo`} className={etiqueta}>Cargo</label><input id={`${pre}-cargo`} name="cargo" defaultValue={v.cargo ?? ""} className={campo} placeholder="Gerente, contador…" autoComplete="off" /></div>
        <div className="min-w-0"><label htmlFor={`${pre}-email`} className={etiqueta}>Correo</label><input id={`${pre}-email`} name="email" type="email" inputMode="email" defaultValue={v.email ?? ""} className={campo} autoComplete="off" /></div>
        <div className="min-w-0"><label htmlFor={`${pre}-tel`} className={etiqueta}>Teléfono</label><input id={`${pre}-tel`} name="telefono" type="tel" inputMode="tel" defaultValue={v.telefono ?? ""} className={campo} placeholder="6123-4567" autoComplete="off" /></div>
      </div>
      <fieldset>
        <legend className={etiqueta}>Su papel</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ROLES_CONTACTO.map((r) => (
            <label key={r} className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line-mid text-sm font-medium text-fg-mute has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand-fg">
              <input type="radio" name="rol" value={r} defaultChecked={rolDe(v.rol ?? "otro") === r} className="sr-only" />{ROL_CONTACTO_LABEL[r]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-fg-dim">Decide: aprueba la compra. Paga: recibe las facturas. Técnico: con quien se trabaja el día a día.</p>
      </fieldset>
      {!k?.principal && (
        <label className="flex min-h-11 items-center gap-3 text-sm text-fg-mute"><input type="checkbox" name="principal" value="1" className="h-5 w-5 accent-[rgb(var(--c-brand))]" />Es el contacto principal</label>
      )}
      <Resultado estado={estado?.ok ? null : estado} />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={btn.secondary} onClick={onListo}>Cancelar</button>
        <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : k ? "Guardar cambios" : "Guardar contacto"}</button>
      </div>
    </form>
  );
}

function Fila({ clientId, k, onWhatsapp }: { clientId: string; k: ContactoFila; onWhatsapp: (k: ContactoFila) => void }) {
  const [editando, setEditando] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [eb, accionBorrar, borrando] = useActionState(borrarContactoAction, null);
  const [ep, accionPrincipal, marcando] = useActionState(marcarPrincipalAction, null);
  const wa = numeroWhatsapp(k.telefono);
  const rol = rolDe(k.rol);
  if (editando) return <li className="py-3"><FormContacto clientId={clientId} k={k} onListo={() => setEditando(false)} /></li>;
  return (
    <li className="py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere] min-w-0">{k.nombre}</p>
        <span className={`${chip} ${ROL_COLOR[rol]}`}>{ROL_CONTACTO_LABEL[rol]}</span>
        {k.principal && <span className={`${chip} bg-fill-2 text-fg-mute`}>Principal</span>}
      </div>
      {k.cargo && <p className="text-fg-dim text-xs [overflow-wrap:anywhere]">{k.cargo}</p>}
      <div className="flex flex-col gap-1 text-sm min-w-0">
        {k.email && <a href={`mailto:${k.email}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:underline [overflow-wrap:anywhere]">{k.email}</a>}
        {k.telefono && <a href={`tel:${k.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:underline">{k.telefono}</a>}
      </div>
      <div className="flex flex-wrap items-center gap-1 -ml-3">
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => onWhatsapp(k)} className={botonChico}>WhatsApp</a>
        )}
        <button type="button" className={botonChico} onClick={() => setEditando(true)}>Editar</button>
        {!k.principal && (
          <form action={accionPrincipal}><input type="hidden" name="id" value={k.id} /><button type="submit" className={botonChico} disabled={marcando}>{marcando ? "Marcando…" : "Hacer principal"}</button></form>
        )}
        {!borrar && <button type="button" className={`${botonChico} hover:text-danger`} onClick={() => setBorrar(true)}>Borrar</button>}
      </div>
      {borrar && (
        <form action={accionBorrar} className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
          <input type="hidden" name="id" value={k.id} />
          <p className="text-sm text-fg-mute min-w-0 flex-1">¿Borrar a {k.nombre}? Sus conversaciones siguen en la historia.</p>
          <button type="button" className={botonChico} onClick={() => setBorrar(false)}>No, dejarlo</button>
          <button type="submit" className={`${botonChico} text-danger`} disabled={borrando}>{borrando ? "Borrando…" : "Sí, borrar"}</button>
        </form>
      )}
      <Resultado estado={eb?.error ? eb : ep?.error ? ep : null} />
    </li>
  );
}

export function Contactos({ clientId, contactos, sugerido }: { clientId: string; contactos: ContactoFila[]; sugerido?: Partial<ContactoFila> }) {
  const [agregando, setAgregando] = useState(false);
  // WhatsApp abierto en otra pestaña: al volver a la ficha se ofrece registrar la conversación.
  const [pendiente, setPendiente] = useState<ContactoFila | null>(null);
  const [volvio, setVolvio] = useState(false);
  useEffect(() => {
    if (!pendiente) return;
    const onVer = () => { if (document.visibilityState === "visible") setVolvio(true); };
    document.addEventListener("visibilitychange", onVer);
    window.addEventListener("focus", onVer);
    return () => { document.removeEventListener("visibilitychange", onVer); window.removeEventListener("focus", onVer); };
  }, [pendiente]);

  return (
    <section className={card} aria-labelledby="contactos-titulo">
      <div className="flex items-center justify-between gap-3">
        <h2 id="contactos-titulo" className={h2}>Contactos{contactos.length ? ` · ${contactos.length}` : ""}</h2>
        {!agregando && <button type="button" className={`${botonChico} text-brand-fg -mr-3`} onClick={() => setAgregando(true)}>+ Contacto</button>}
      </div>
      <p className="mt-1 text-sm text-fg-dim">Las personas de esta empresa y qué papel tiene cada una.</p>

      {pendiente && volvio && (
        <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-3" role="status">
          <p className="text-sm text-fg">¿Cómo te fue con {pendiente.nombre} por WhatsApp?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn.primary} onClick={() => { abrirRegistro({ tipo: "whatsapp", contactoId: pendiente.id }); setPendiente(null); setVolvio(false); }}>Registrar la conversación</button>
            <button type="button" className={btn.secondary} onClick={() => { setPendiente(null); setVolvio(false); }}>Ahora no</button>
          </div>
        </div>
      )}

      {contactos.length > 0 ? (
        <ul className="mt-2 divide-y divide-line">
          {contactos.map((k) => <Fila key={k.id} clientId={clientId} k={k} onWhatsapp={(x) => { setPendiente(x); setVolvio(false); }} />)}
        </ul>
      ) : !agregando ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-fg-dim">Sin contactos todavía. Agrega a quien decide la compra para tener a mano su correo y su WhatsApp.</p>
          <button type="button" className={btn.secondary} onClick={() => setAgregando(true)}>{sugerido?.nombre ? `Agregar a ${sugerido.nombre}` : "Agregar el primer contacto"}</button>
        </div>
      ) : null}

      {agregando && <div className="mt-4"><FormContacto clientId={clientId} sugerido={contactos.length ? undefined : sugerido} onListo={() => setAgregando(false)} /></div>}
    </section>
  );
}
