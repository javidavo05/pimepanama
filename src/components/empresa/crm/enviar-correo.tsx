"use client";

/**
 * Escribirle a un cliente desde su ficha: elige el contacto, opcionalmente una plantilla que pre-llena asunto y
 * mensaje (con el nombre y la empresa ya puestos) y envía. Sale por Resend y queda como interacción «correo»
 * saliente en el historial del cliente.
 *
 * Uso en la ficha: <EnviarCorreo clientId={c.id} contactos={contactosConCorreo} correoCliente={c.email} />
 */
import { useActionState, useEffect, useState } from "react";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";
import { datosCorreoClienteAction, enviarCorreoClienteAction, type PlantillaBreve } from "@/app/(empresa)/empresa/(protected)/acciones-correo";
import { primerNombre, rellenarTexto, VARIABLES } from "@/lib/crm/correo";

export type ContactoCorreo = { id: string; nombre: string; email: string; principal?: boolean };

type Datos = { plantillas: PlantillaBreve[]; empresa: string; miNombre: string };

export function EnviarCorreo({ clientId, contactos, correoCliente }: { clientId: string; contactos: ContactoCorreo[]; correoCliente?: string | null }) {
  const opciones = [
    ...[...contactos].sort((a, b) => Number(!!b.principal) - Number(!!a.principal)).map((c) => ({ id: c.id, nombre: c.nombre, email: c.email })),
    ...(correoCliente && !contactos.some((c) => c.email.toLowerCase() === correoCliente.toLowerCase()) ? [{ id: "cliente", nombre: "Correo del cliente", email: correoCliente }] : []),
  ];
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargaError, setCargaError] = useState(false);
  const [contactoId, setContactoId] = useState(opciones[0]?.id ?? "");
  const [plantillaId, setPlantillaId] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [estado, accion, enviando] = useActionState(enviarCorreoClienteAction, null);

  useEffect(() => {
    if (!abierto || datos) return;
    let vivo = true;
    datosCorreoClienteAction(clientId)
      .then((d) => { if (vivo) { if (d) setDatos(d); else setCargaError(true); } })
      .catch(() => { if (vivo) setCargaError(true); });
    return () => { vivo = false; };
  }, [abierto, datos, clientId]);

  useEffect(() => {
    if (estado?.ok) { setAsunto(""); setCuerpo(""); setPlantillaId(""); }
  }, [estado]);

  function usarPlantilla(id: string) {
    setPlantillaId(id);
    const p = datos?.plantillas.find((x) => x.id === id);
    if (!p || !datos) return;
    const c = opciones.find((o) => o.id === contactoId);
    const nombre = c && c.id !== "cliente" ? c.nombre : "";
    const v = { nombre: primerNombre(nombre), contacto: nombre, empresa: datos.empresa, mi_nombre: datos.miNombre };
    setAsunto(rellenarTexto(p.asunto, v).trim());
    // El mensaje conserva los saltos de línea: se rellena variable por variable.
    setCuerpo(p.cuerpo.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (t, k: string) => (k in v ? v[k as keyof typeof v] : t)));
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className={btn.secondary}>
        Escribir un correo
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-panel p-4 grid gap-4" aria-labelledby="enviar-correo-titulo">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="enviar-correo-titulo" className="text-fg font-semibold">Escribir un correo</h2>
          <p className="text-fg-dim text-sm">Sale desde el correo de Pime y queda en el historial del cliente.</p>
        </div>
        <button type="button" onClick={() => setAbierto(false)} className="inline-flex items-center justify-center min-h-11 min-w-11 px-3 rounded-lg text-sm text-fg-dim hover:text-fg">Cerrar</button>
      </div>

      {opciones.length === 0 ? (
        <p className="rounded-lg border border-line bg-fill px-3 py-3 text-sm text-fg-dim">
          Este cliente no tiene ningún contacto con correo. Agrega un contacto con su correo en la ficha y vuelve a abrir este panel.
        </p>
      ) : (
        <form action={accion} className="grid gap-4">
          <input type="hidden" name="clientId" value={clientId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="ec-para" className={etiqueta}>Para</label>
              <select id="ec-para" name="contactoId" value={contactoId} onChange={(e) => setContactoId(e.target.value)} className={campo}>
                {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre} · {o.email}</option>)}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="ec-plantilla" className={etiqueta}>Plantilla</label>
              <select id="ec-plantilla" value={plantillaId} onChange={(e) => usarPlantilla(e.target.value)} className={campo} disabled={!datos || !datos.plantillas.length}>
                <option value="">{!datos ? (cargaError ? "No se pudieron cargar" : "Cargando plantillas…") : datos.plantillas.length ? "Sin plantilla" : "Todavía no hay plantillas"}</option>
                {datos?.plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <p className="text-fg-faint text-xs mt-2">Llena el asunto y el mensaje con los datos de este cliente. Puedes cambiarlos.</p>
            </div>
          </div>
          <div>
            <label htmlFor="ec-asunto" className={etiqueta}>Asunto</label>
            <input id="ec-asunto" name="asunto" required maxLength={200} value={asunto} onChange={(e) => setAsunto(e.target.value)} className={campo} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="ec-cuerpo" className={etiqueta}>Mensaje</label>
            <textarea id="ec-cuerpo" name="cuerpo" required rows={8} maxLength={20000} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} className={`${campo} py-3 min-h-40 leading-relaxed`} />
            <p className="text-fg-faint text-xs mt-2">
              Deja una línea en blanco entre párrafos. Puedes usar {VARIABLES.map((v) => `{{${v.clave}}}`).join(", ")}: se cambian al enviar.
            </p>
          </div>
          {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
          {estado?.ok && estado.mensaje && <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok [overflow-wrap:anywhere]" role="status">{estado.mensaje}</p>}
          <div className="grid sm:flex sm:justify-end">
            <button type="submit" className={btn.primary} disabled={enviando}>{enviando ? "Enviando…" : "Enviar correo"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
