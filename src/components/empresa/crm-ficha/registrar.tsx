"use client";

/**
 * Registrar una conversación en dos toques: qué fue (llamada, WhatsApp…) y de qué hablaron. Lo demás
 * (contacto, dirección, resultado, duración, próximo paso) trae lo más común ya puesto.
 *
 * Desde cualquier parte de la ficha, `abrirRegistro({ tipo, contactoId })` lo deja listo y lleva la vista ahí
 * (lo usa el botón WhatsApp de cada contacto al volver de la conversación).
 */
import { useActionState, useEffect, useRef, useState } from "react";
import { registrarInteraccionAction } from "@/app/(empresa)/empresa/(protected)/acciones-crm-ficha";
import { TIPOS_INTERACCION, TIPO_INTERACCION_LABEL, type TipoInteraccion } from "@/lib/crm/historia";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";
import { irAPestana } from "@/components/empresa/clientes/ficha-tabs";
import { Resultado } from "./comun";

const EVENTO = "crm-registrar";
export const ANCLA_REGISTRO = "crm-registrar";

export function abrirRegistro(detalle: { tipo?: TipoInteraccion; contactoId?: string | null }) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: detalle }));
}

export type ContactoOpcion = { id: string; nombre: string; principal: boolean };

const BOTON: Record<TipoInteraccion, string> = {
  llamada: "Guardar llamada", whatsapp: "Guardar conversación", visita: "Guardar visita", nota: "Guardar nota", correo: "Guardar correo", reunion: "Guardar reunión",
};

export function RegistrarInteraccion({ clientId, contactos }: { clientId: string; contactos: ContactoOpcion[] }) {
  const [estado, accion, enviando] = useActionState(registrarInteraccionAction, null);
  const principal = contactos.find((k) => k.principal)?.id ?? contactos[0]?.id ?? "";
  const [tipo, setTipo] = useState<TipoInteraccion>("llamada");
  const [direccion, setDireccion] = useState<"saliente" | "entrante">("saliente");
  const [contacto, setContacto] = useState(principal);
  const [vuelta, setVuelta] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const resumenRef = useRef<HTMLTextAreaElement>(null);

  // El contacto principal puede cambiar después de guardar uno nuevo.
  useEffect(() => {
    if (!contactos.some((k) => k.id === contacto)) setContacto(principal);
  }, [contactos, contacto, principal]);

  useEffect(() => {
    const onAbrir = (e: Event) => {
      const d = (e as CustomEvent<{ tipo?: TipoInteraccion; contactoId?: string | null }>).detail ?? {};
      if (d.tipo) setTipo(d.tipo);
      if (d.contactoId) setContacto(d.contactoId);
      if (d.tipo === "whatsapp") setDireccion("saliente");
      irAPestana("resumen", ANCLA_REGISTRO);
      setTimeout(() => resumenRef.current?.focus({ preventScroll: true }), 120);
    };
    window.addEventListener(EVENTO, onAbrir);
    return () => window.removeEventListener(EVENTO, onAbrir);
  }, []);

  // Guardado: el formulario queda limpio para la siguiente, con el mismo tipo elegido.
  useEffect(() => {
    if (estado?.ok) {
      formRef.current?.reset();
      setVuelta((v) => v + 1);
    }
  }, [estado]);

  const conDireccion = tipo === "llamada" || tipo === "whatsapp";
  const conContacto = tipo !== "nota" && contactos.length > 0;
  return (
    <form ref={formRef} action={accion} className="space-y-4" id={ANCLA_REGISTRO} tabIndex={-1}>
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="tipo" value={tipo} />
      <fieldset>
        <legend className="sr-only">Qué fue</legend>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
          {TIPOS_INTERACCION.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tipo === t}
              onClick={() => setTipo(t)}
              className={`inline-flex items-center justify-center min-h-11 rounded-full border px-3 text-sm font-medium transition-colors ${tipo === t ? "border-brand bg-brand/10 text-brand-fg" : "border-line-mid text-fg-mute hover:border-line-loud hover:text-fg"}`}
            >
              {TIPO_INTERACCION_LABEL[t]}
            </button>
          ))}
        </div>
      </fieldset>

      {(conDireccion || conContacto) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {conDireccion && (
            <fieldset>
              <legend className={etiqueta}>¿Quién inició?</legend>
              <input type="hidden" name="direccion" value={direccion} />
              <div className="grid grid-cols-2 gap-2">
                {(["saliente", "entrante"] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={direccion === d} onClick={() => setDireccion(d)}
                    className={`min-h-11 rounded-lg border text-sm font-medium ${direccion === d ? "border-brand bg-brand/10 text-brand-fg" : "border-line-mid text-fg-mute hover:border-line-loud"}`}>
                    {d === "saliente" ? "Nosotros" : "El cliente"}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {conContacto && (
            <div className="min-w-0">
              <label htmlFor="crm-contacto" className={etiqueta}>Con quién</label>
              <select id="crm-contacto" name="contactoId" value={contacto} onChange={(e) => setContacto(e.target.value)} className={campo}>
                <option value="">Sin contacto en particular</option>
                {contactos.map((k) => <option key={k.id} value={k.id}>{k.nombre}{k.principal ? " (principal)" : ""}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="crm-resumen" className={etiqueta}>{tipo === "nota" ? "Nota" : "De qué hablaron"}</label>
        <textarea key={`r-${vuelta}`} ref={resumenRef} id="crm-resumen" name="resumen" rows={3} required className={`${campo} py-2`}
          placeholder={tipo === "nota" ? "Lo que conviene recordar de este cliente. Él no lo ve." : "Una o dos líneas bastan"} />
      </div>

      {tipo !== "nota" && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <div className="min-w-0">
            <label htmlFor="crm-paso" className={etiqueta}>Próximo paso (opcional)</label>
            <input key={`p-${vuelta}`} id="crm-paso" name="proximoPaso" className={campo} placeholder="Enviar la cotización" autoComplete="off" />
          </div>
          <div className="min-w-0">
            <label htmlFor="crm-paso-fecha" className={etiqueta}>Para cuándo</label>
            <input key={`f-${vuelta}`} id="crm-paso-fecha" name="proximoPasoFecha" type="date" className={campo} />
          </div>
          <p className="sm:col-span-2 -mt-2 text-xs text-fg-dim">Con fecha, el próximo paso queda como tarea tuya ligada a este cliente.</p>
        </div>
      )}

      {tipo !== "nota" && (
        <details className="group rounded-xl border border-line px-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-fg-mute">Resultado, duración y fecha</summary>
          <div className="grid gap-4 pb-4 sm:grid-cols-3">
            <div className="min-w-0 sm:col-span-3">
              <label htmlFor="crm-resultado" className={etiqueta}>Resultado</label>
              <input key={`re-${vuelta}`} id="crm-resultado" name="resultado" className={campo} placeholder="Interesado, pidió precio, no contestó…" autoComplete="off" />
            </div>
            {tipo === "llamada" && (
              <div className="min-w-0">
                <label htmlFor="crm-duracion" className={etiqueta}>Minutos</label>
                <input key={`d-${vuelta}`} id="crm-duracion" name="duracionMin" type="number" inputMode="numeric" min={1} max={1440} className={campo} />
              </div>
            )}
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="crm-cuando" className={etiqueta}>Cuándo fue</label>
              <input key={`c-${vuelta}`} id="crm-cuando" name="ocurrioAt" type="datetime-local" className={campo} />
              <p className="mt-1 text-xs text-fg-dim">Vacío = ahora.</p>
            </div>
          </div>
        </details>
      )}

      {tipo === "nota" && (
        <label className="flex min-h-11 items-center gap-3 text-sm text-fg-mute">
          <input type="checkbox" name="fijada" value="1" className="h-5 w-5 accent-[rgb(var(--c-brand))]" />
          Fijarla arriba de la historia
        </label>
      )}

      <Resultado estado={estado} />
      <div className="flex justify-end">
        <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Guardando…" : BOTON[tipo]}</button>
      </div>
    </form>
  );
}

/** Botón para la cabecera de la ficha: lleva al formulario de registro. */
export function BotonRegistrar({ className, tipo }: { className: string; tipo?: TipoInteraccion }) {
  return <button type="button" className={className} onClick={() => abrirRegistro({ tipo })}>Registrar</button>;
}
