"use client";

/**
 * Formularios cortos del equipo para Pime Clientes. Cada uno pide lo mínimo, trae los valores más
 * comunes ya puestos y dice qué va a pasar en el botón.
 */
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  decidirPagoAction, estimarTicketAction, facturarHorasAction, guardarClienteAction, invitarAlPortalAction, marcarGarantiaAction,
  quitarAccesoAction, registrarHorasAction, registrarPagoAction, responderTicketEquipoAction, restablecerAccesoAction, type Estado,
} from "@/app/(empresa)/empresa/(protected)/acciones-clientes";
import { btn } from "@/components/empresa/page-header";

export const campo = "w-full min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
export const etiqueta = "block text-fg-dim text-xs font-semibold uppercase tracking-widest mb-1.5";
const errorBox = "rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger";
const okBox = "rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok";
const avisoBox = "rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn";

function Mensajes({ estado }: { estado: Estado }) {
  if (!estado) return null;
  return (
    <>
      {estado.error && <p className={errorBox} role="alert">{estado.error}</p>}
      {estado.ok && estado.mensaje && (
        <p className={estado.aviso ? avisoBox : okBox} role="status">
          {estado.mensaje}{" "}
          {estado.enlace?.startsWith("/") && <Link href={estado.enlace} className="font-semibold underline">Abrir</Link>}
        </p>
      )}
    </>
  );
}
const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Panama" });

// ─── Cliente ─────────────────────────────────────────────────────────────────

type ClienteDatos = { id?: string; name?: string; company?: string | null; ruc?: string | null; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; country?: string | null; notes?: string | null; brandLine?: string; hourlyRate?: string | null };

/** `extra`: bloque opcional que va antes de las notas (fuente, industria, etiquetas y campos propios del CRM). */
export function ClienteForm({ c, tarifas, extra }: { c?: ClienteDatos; tarifas: { normal: number; premium: number }; extra?: ReactNode }) {
  const [estado, accion, enviando] = useActionState(guardarClienteAction, null);
  const [linea, setLinea] = useState(c?.brandLine ?? "normal");
  const dup = estado?.error?.startsWith("Ya existe un cliente con ese correo");
  return (
    <form action={accion} className="space-y-6">
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      {dup && <input type="hidden" name="confirmarDuplicado" value="1" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="name" className={etiqueta}>Contacto</label><input id="name" name="name" required defaultValue={c?.name} className={campo} placeholder="Nombre y apellido" autoComplete="off" /></div>
        <div><label htmlFor="company" className={etiqueta}>Empresa</label><input id="company" name="company" defaultValue={c?.company ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor="email" className={etiqueta}>Correo</label><input id="email" name="email" type="email" inputMode="email" defaultValue={c?.email ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor="phone" className={etiqueta}>Teléfono</label><input id="phone" name="phone" inputMode="tel" defaultValue={c?.phone ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor="ruc" className={etiqueta}>RUC</label><input id="ruc" name="ruc" defaultValue={c?.ruc ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor="city" className={etiqueta}>Ciudad</label><input id="city" name="city" defaultValue={c?.city ?? "Panamá"} className={campo} /></div>
        <div className="sm:col-span-2"><label htmlFor="address" className={etiqueta}>Dirección</label><input id="address" name="address" defaultValue={c?.address ?? ""} className={campo} /></div>
      </div>
      <input type="hidden" name="country" value={c?.country ?? "Panamá"} />
      <fieldset>
        <legend className={etiqueta}>Línea del cliente</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { v: "normal", t: "Normal", d: `Azul tinta · ${tarifas.normal} USD la hora` },
            { v: "premium", t: "Premium", d: `Negro y oro · ${tarifas.premium} USD la hora` },
          ].map((x) => (
            <label key={x.v} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${linea === x.v ? "border-brand bg-brand/5" : "border-line-mid hover:border-line-loud"}`}>
              <input type="radio" name="brandLine" value={x.v} checked={linea === x.v} onChange={() => setLinea(x.v)} className="sr-only" />
              <span className="text-fg text-sm font-semibold">{x.t}</span><span className="text-fg-dim text-xs">{x.d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="hourlyRate" className={etiqueta}>Tarifa propia por hora (opcional)</label><input id="hourlyRate" name="hourlyRate" inputMode="decimal" defaultValue={c?.hourlyRate ?? ""} className={campo} placeholder="Vacío = la de su línea" /></div>
      </div>
      {extra}
      <div><label htmlFor="notes" className={etiqueta}>Notas internas</label><textarea id="notes" name="notes" rows={3} defaultValue={c?.notes ?? ""} className={`${campo} py-2`} /></div>
      {!c?.id && (
        <p className="text-sm text-fg-dim">La invitación a su cuenta sale después, desde su ficha: primero revisas su cuenta tal como la verá y confirmas que todo está en orden.</p>
      )}
      <Mensajes estado={estado} />
      <div className="flex justify-end"><button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : dup ? "Crear de todas formas" : c?.id ? "Guardar cambios" : "Crear cliente"}</button></div>
    </form>
  );
}

// ─── Cuenta del cliente ─────────────────────────────────────────────────────

export function InvitarForm({ clientId, email, nombre, hayPrincipal, revisada }: { clientId: string; email?: string | null; nombre?: string | null; hayPrincipal: boolean; revisada: boolean }) {
  const [estado, accion, enviando] = useActionState(invitarAlPortalAction, null);
  const [copiado, setCopiado] = useState(false);
  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="rol" value={hayPrincipal ? "miembro" : "principal"} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div><label htmlFor="inv-nombre" className={etiqueta}>Nombre</label><input id="inv-nombre" name="nombre" defaultValue={hayPrincipal ? "" : nombre ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor="inv-email" className={etiqueta}>Correo</label><input id="inv-email" name="email" type="email" required defaultValue={hayPrincipal ? "" : email ?? ""} className={campo} autoComplete="off" /></div>
      </div>
      <Mensajes estado={estado} />
      {estado?.enlace && (
        <button type="button" className={btn.secondary} onClick={async () => { try { await navigator.clipboard.writeText(estado.enlace!); setCopiado(true); } catch { setCopiado(false); } }}>
          {copiado ? "Enlace copiado" : "Copiar enlace de invitación"}
        </button>
      )}
      {!revisada && <p className="text-sm text-fg-dim">Se habilita cuando confirmes que su cuenta está en orden.</p>}
      <button type="submit" className={revisada ? btn.primary : btn.secondary} disabled={enviando || !revisada}>{enviando ? "Enviando…" : hayPrincipal ? "Invitar a otra persona" : "Enviar invitación a su cuenta"}</button>
    </form>
  );
}

export function PersonaAcciones({ id, invitado }: { id: string; invitado: boolean }) {
  const [e1, a1, p1] = useActionState(restablecerAccesoAction, null);
  const [e2, a2, p2] = useActionState(quitarAccesoAction, null);
  const [seguro, setSeguro] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={a1}><input type="hidden" name="persona" value={id} /><button className="text-xs font-semibold text-brand-fg hover:underline min-h-10 px-2" disabled={p1}>{invitado ? "Reenviar invitación" : "Enviar cambio de contraseña"}</button></form>
      {seguro
        ? <form action={a2}><input type="hidden" name="persona" value={id} /><button className="text-xs font-semibold text-danger hover:underline min-h-10 px-2" disabled={p2}>Sí, quitar acceso</button></form>
        : <button type="button" className="text-xs font-semibold text-fg-dim hover:text-danger min-h-10 px-2" onClick={() => setSeguro(true)}>Quitar acceso</button>}
      {(e1?.mensaje || e1?.error || e2?.error) && <span className="w-full text-xs text-fg-dim" role="status">{e1?.mensaje || e1?.error || e2?.error}</span>}
    </div>
  );
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

const ESTADOS_TICKET = [
  ["", "Sin cambiar el estado"], ["en_revision", "Lo estamos revisando"], ["esperando_cliente", "Espera respuesta del cliente"], ["en_progreso", "En trabajo"], ["resuelto", "Resuelto"], ["cerrado", "Cerrado"],
] as const;

export function ResponderTicket({ ticketId, estadoActual }: { ticketId: string; estadoActual: string }) {
  const [estado, accion, enviando] = useActionState(responderTicketEquipoAction, null);
  const [interno, setInterno] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) form.current?.reset(); }, [estado]);
  return (
    <form ref={form} action={accion} className="space-y-3">
      <input type="hidden" name="ticket" value={ticketId} />
      <div className="flex gap-1 p-1 bg-fill border border-line rounded-xl w-full sm:w-auto sm:inline-flex" role="group" aria-label="Tipo de mensaje">
        <button type="button" onClick={() => setInterno(false)} className={`flex-1 min-h-9 px-3 rounded-lg text-sm font-medium ${!interno ? "bg-panel text-fg shadow-sm" : "text-fg-dim"}`}>Respuesta al cliente</button>
        <button type="button" onClick={() => setInterno(true)} className={`flex-1 min-h-9 px-3 rounded-lg text-sm font-medium ${interno ? "bg-panel text-fg shadow-sm" : "text-fg-dim"}`}>Nota interna</button>
      </div>
      <input type="hidden" name="interno" value={interno ? "1" : "0"} />
      <textarea name="mensaje" rows={4} className={`${campo} py-2 ${interno ? "bg-warn/5 border-warn/40" : ""}`} placeholder={interno ? "Solo la ve el equipo" : "El cliente la recibe por correo y en su cuenta"} aria-label="Mensaje" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select name="estado" defaultValue={estadoActual === "abierto" ? "en_revision" : ""} className={`${campo} sm:w-64 field-select pr-8`} aria-label="Cambiar estado">
          {ESTADOS_TICKET.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Enviando…" : interno ? "Guardar nota" : "Enviar al cliente"}</button>
      </div>
      <Mensajes estado={estado} />
    </form>
  );
}

export function EstimarTicket({ ticketId, umbralHoras }: { ticketId: string; umbralHoras: number }) {
  const [estado, accion, enviando] = useActionState(estimarTicketAction, null);
  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="ticket" value={ticketId} />
      <div className="flex gap-2">
        <input name="horas" inputMode="decimal" required className={campo} placeholder="Horas, p. ej. 1.5" aria-label="Horas estimadas" />
        <button type="submit" className={btn.secondary} disabled={enviando}>Estimar</button>
      </div>
      <p className="text-xs text-fg-faint">Si pasa de {umbralHoras} h, el cliente lo aprueba en su cuenta antes de empezar.</p>
      <Mensajes estado={estado} />
    </form>
  );
}

export function HorasForm({ clientId, ticketId, projectId, tarifa, garantia }: { clientId: string; ticketId?: string; projectId?: string | null; tarifa: number; garantia?: boolean }) {
  const [estado, accion, enviando] = useActionState(registrarHorasAction, null);
  const uid = useId();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) form.current?.reset(); }, [estado]);
  return (
    <form ref={form} action={accion} className="space-y-3">
      <input type="hidden" name="clientId" value={clientId} />
      {ticketId && <input type="hidden" name="ticket" value={ticketId} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor={`h-${uid}`} className={etiqueta}>Horas</label><input id={`h-${uid}`} name="horas" inputMode="decimal" defaultValue="0" className={campo} /></div>
        <div><label htmlFor={`m-${uid}`} className={etiqueta}>Minutos</label><input id={`m-${uid}`} name="minutos" inputMode="numeric" defaultValue="30" className={campo} /></div>
        <div className="col-span-2"><label htmlFor={`f-${uid}`} className={etiqueta}>Fecha</label><input id={`f-${uid}`} name="fecha" type="date" defaultValue={hoy()} className={campo} /></div>
      </div>
      <input name="nota" className={campo} placeholder="Qué se hizo (lo ve el cliente en la factura)" aria-label="Nota" />
      {garantia && <input type="hidden" name="garantia" value="1" />}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-fg-faint">{garantia ? "En garantía: se registra sin cobro." : `${tarifa} USD la hora, bloques de 15 min, mínimo 30.`}</p>
        <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : "Registrar horas"}</button>
      </div>
      <Mensajes estado={estado} />
    </form>
  );
}

export function GarantiaToggle({ ticketId, activa }: { ticketId: string; activa: boolean }) {
  const [estado, accion, enviando] = useActionState(marcarGarantiaAction, null);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="ticket" value={ticketId} />
      <button className={btn.secondary} disabled={enviando}>{activa ? "Quitar garantía" : "Marcar como garantía"}</button>
      <Mensajes estado={estado} />
    </form>
  );
}

// ─── Dinero ──────────────────────────────────────────────────────────────────

export function FacturarHorasForm({ clientId, monto }: { clientId: string; monto: string }) {
  const [estado, accion, enviando] = useActionState(facturarHorasAction, null);
  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <button className={btn.accent} disabled={enviando}>{enviando ? "Creando…" : `Facturar horas (${monto})`}</button>
      <Mensajes estado={estado} />
    </form>
  );
}

export function PagoForm({ clientId, facturas }: { clientId: string; facturas: { id: string; etiqueta: string; falta: number }[] }) {
  const [estado, accion, enviando] = useActionState(registrarPagoAction, null);
  const [doc, setDoc] = useState(facturas[0]?.id ?? "");
  const falta = facturas.find((f) => f.id === doc)?.falta;
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado?.ok) form.current?.reset(); }, [estado]);
  return (
    <form ref={form} action={accion} className="space-y-3">
      <input type="hidden" name="clientId" value={clientId} />
      <div><label htmlFor="p-doc" className={etiqueta}>Factura · saldo pendiente</label>
        <select id="p-doc" name="documentId" value={doc} onChange={(e) => setDoc(e.target.value)} className={`${campo} field-select pr-8`}>
          {facturas.map((f) => <option key={f.id} value={f.id}>{f.etiqueta}</option>)}<option value="">Pago aparte (se emite su factura)</option>
        </select></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <div><label htmlFor="p-monto" className={etiqueta}>Monto</label><input id="p-monto" name="monto" inputMode="decimal" required key={doc} defaultValue={falta ? falta.toFixed(2) : ""} className={campo} /></div>
        <div><label htmlFor="p-fecha" className={etiqueta}>Fecha</label><input id="p-fecha" name="fecha" type="date" defaultValue={hoy()} className={campo} /></div>
        <div><label htmlFor="p-met" className={etiqueta}>Método</label>
          <select id="p-met" name="metodo" defaultValue="transferencia" className={`${campo} field-select pr-8`}><option value="transferencia">Transferencia</option><option value="yappy">Yappy</option><option value="tarjeta">Tarjeta</option><option value="efectivo">Efectivo</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></div>
        <div><label htmlFor="p-ref" className={etiqueta}>Referencia</label><input id="p-ref" name="referencia" className={campo} /></div>
      </div>
      <Mensajes estado={estado} />
      <button type="submit" className={`${btn.primary} w-full`} disabled={enviando}>{enviando ? "Guardando…" : "Registrar pago"}</button>
    </form>
  );
}

export function PagoPorConfirmar({ pagoId, clientId }: { pagoId: string; clientId?: string | null }) {
  const [estado, accion, enviando] = useActionState(decidirPagoAction, null);
  if (estado?.ok) return <span className="text-xs font-semibold text-ok">Listo</span>;
  return (
    <form action={accion} className="flex items-center gap-2">
      <input type="hidden" name="pago" value={pagoId} />
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <button name="decision" value="confirmar" className="min-h-10 px-3 rounded-lg bg-ok-solid text-on-solid text-xs font-semibold" disabled={enviando}>Confirmar</button>
      <button name="decision" value="rechazar" className="min-h-10 px-3 rounded-lg border border-line-mid text-fg-dim text-xs font-semibold" disabled={enviando}>No llegó</button>
      {estado?.error && <span className="text-xs text-danger">{estado.error}</span>}
    </form>
  );
}
