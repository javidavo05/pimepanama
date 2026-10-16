"use client";

/**
 * Armar una campaña: nombre, correo (o desde una plantilla) y a quién le llega, con el conteo en vivo.
 * El conteo usa la misma función que el envío (src/lib/crm/campanas.ts); al enviar se recalcula en el servidor.
 */
import { useActionState, useMemo, useState } from "react";
import Link from "@/components/empresa/link";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { btn } from "@/components/empresa/page-header";
import { DATOS_EJEMPLO, primerNombre } from "@/lib/crm/correo";
import { elegirDestinatarios, type ClienteSegmento, type FiltroCampana } from "@/lib/crm/campanas";
import { guardarCampanaAction } from "../../acciones-campanas";
import { EditorCorreo } from "../editor-correo";

type Plantilla = { id: string; nombre: string; asunto: string; cuerpo: string };
type Props = {
  campana?: { id: string; nombre: string; asunto: string; cuerpo: string; filtro: FiltroCampana };
  inicial?: { asunto: string; cuerpo: string; plantillaId: string };
  clientes: ClienteSegmento[];
  bajas: string[];
  plantillas: Plantilla[];
  equipo: { id: string; nombre: string }[];
  miNombre: string;
  logoUrl: string;
  siteUrl: string;
};

const MOSTRAR = 50;
const distintos = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x && !!x.trim()))].sort((a, b) => a.localeCompare(b, "es"));

export function CampanaForm({ campana, inicial, clientes, bajas, plantillas, equipo, miNombre, logoUrl, siteUrl }: Props) {
  const [estado, accion, guardando] = useActionState(guardarCampanaAction, null);
  const [asunto, setAsunto] = useState(campana?.asunto ?? inicial?.asunto ?? "");
  const [cuerpo, setCuerpo] = useState(campana?.cuerpo ?? inicial?.cuerpo ?? "Hola, {{nombre}}:\n\n\n\nSaludos,\n{{mi_nombre}}");
  const [plantillaId, setPlantillaId] = useState(inicial?.plantillaId ?? "");
  const [f, setF] = useState<FiltroCampana>(campana?.filtro ?? { etiquetas: [], fuente: "", industria: "", responsableId: "", linea: "", proyecto: "" });

  const etiquetas = useMemo(() => distintos(clientes.flatMap((c) => c.etiquetas)), [clientes]);
  const fuentes = useMemo(() => distintos(clientes.map((c) => c.fuente)), [clientes]);
  const industrias = useMemo(() => distintos(clientes.map((c) => c.industria)), [clientes]);
  const { destinatarios, fuera } = useMemo(() => elegirDestinatarios(clientes, f, bajas), [clientes, f, bajas]);
  const primero = destinatarios[0];
  const datosVista = primero ? { nombre: primerNombre(primero.nombre), contacto: primero.nombre, empresa: primero.empresa, mi_nombre: miNombre } : { ...DATOS_EJEMPLO, mi_nombre: miNombre };

  const poner = <K extends keyof FiltroCampana>(k: K, v: FiltroCampana[K]) => setF((x) => ({ ...x, [k]: v }));
  const alternarEtiqueta = (e: string) => poner("etiquetas", f.etiquetas.includes(e) ? f.etiquetas.filter((x) => x !== e) : [...f.etiquetas, e]);
  function usarPlantilla(id: string) {
    setPlantillaId(id);
    const p = plantillas.find((x) => x.id === id);
    if (p) { setAsunto(p.asunto); setCuerpo(p.cuerpo); }
  }
  const quitados = [
    fuera.bajas ? `${fuera.bajas} dado${fuera.bajas === 1 ? "" : "s"} de baja` : "",
    fuera.sinCorreo ? `${fuera.sinCorreo} sin correo` : "",
    fuera.duplicados ? `${fuera.duplicados} correo${fuera.duplicados === 1 ? "" : "s"} repetido${fuera.duplicados === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const n = destinatarios.length;

  return (
    <form action={accion} className="grid gap-8">
      {campana && <input type="hidden" name="id" value={campana.id} />}
      <input type="hidden" name="filtro" value={JSON.stringify(f)} />

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nombre" className={etiqueta}>Nombre de la campaña</label>
          <input id="nombre" name="nombre" required maxLength={120} defaultValue={campana?.nombre} className={campo} placeholder="Ej.: Mantenimiento anual · noviembre" autoComplete="off" />
          <p className="text-fg-faint text-xs mt-2">Solo lo ve el equipo. El cliente ve el asunto.</p>
        </div>
        <div>
          <label htmlFor="plantilla" className={etiqueta}>Empezar desde una plantilla</label>
          <select id="plantilla" value={plantillaId} onChange={(e) => usarPlantilla(e.target.value)} className={campo} disabled={!plantillas.length}>
            <option value="">{plantillas.length ? "Escribir desde cero" : "Todavía no hay plantillas"}</option>
            {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <p className="text-fg-faint text-xs mt-2">Llena el asunto y el mensaje; puedes cambiarlos después.</p>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-fg text-lg font-semibold">A quién le llega</h2>
          <p className="text-fg-dim text-sm">Sin filtros, a todos los clientes. Le llega al contacto principal de cada cliente o, si no tiene, al correo del cliente.</p>
        </div>
        {etiquetas.length > 0 && (
          <div>
            <p className={etiqueta} id="etq-label">Etiquetas del cliente</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="etq-label">
              {etiquetas.map((e) => {
                const on = f.etiquetas.includes(e);
                return (
                  <button key={e} type="button" aria-pressed={on} onClick={() => alternarEtiqueta(e)} className={`inline-flex items-center min-h-11 px-3 rounded-lg border text-sm [overflow-wrap:anywhere] ${on ? "border-brand bg-brand/10 text-fg" : "border-line-mid bg-fill text-fg-dim hover:text-fg"}`}>
                    {e}
                  </button>
                );
              })}
            </div>
            <p className="text-fg-faint text-xs mt-2">Entra quien tenga al menos una de las elegidas.</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="f-fuente" className={etiqueta}>Fuente</label>
            <select id="f-fuente" value={f.fuente} onChange={(e) => poner("fuente", e.target.value)} className={campo}>
              <option value="">Todas</option>
              {fuentes.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-industria" className={etiqueta}>Industria</label>
            <select id="f-industria" value={f.industria} onChange={(e) => poner("industria", e.target.value)} className={campo}>
              <option value="">Todas</option>
              {industrias.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-resp" className={etiqueta}>Responsable</label>
            <select id="f-resp" value={f.responsableId} onChange={(e) => poner("responsableId", e.target.value)} className={campo}>
              <option value="">Cualquiera</option>
              {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-linea" className={etiqueta}>Línea</label>
            <select id="f-linea" value={f.linea} onChange={(e) => poner("linea", e.target.value as FiltroCampana["linea"])} className={campo}>
              <option value="">Normal y Premium</option>
              <option value="normal">Solo Normal</option>
              <option value="premium">Solo Premium</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-proy" className={etiqueta}>Proyecto activo</label>
            <select id="f-proy" value={f.proyecto} onChange={(e) => poner("proyecto", e.target.value as FiltroCampana["proyecto"])} className={campo}>
              <option value="">Con o sin proyecto</option>
              <option value="si">Con un proyecto en curso</option>
              <option value="no">Sin proyecto en curso</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-panel" aria-live="polite">
          <div className="p-4 border-b border-line grid gap-1">
            <p className="text-fg font-semibold">{n === 0 ? "Nadie recibe esta campaña con estos filtros" : `${n} ${n === 1 ? "persona recibe" : "personas reciben"} esta campaña`}</p>
            <p className="text-fg-dim text-xs">
              Quedan fuera solos los clientes internos y archivados{quitados.length ? `, y ${quitados.join(", ")}` : ""}.
            </p>
          </div>
          {n === 0 ? (
            <p className="p-4 text-fg-dim text-sm">Quita algún filtro para sumar gente{clientes.length === 0 ? ", o agrega clientes con correo primero" : ""}.</p>
          ) : (
            <ul className="divide-y divide-line max-h-80 overflow-y-auto">
              {destinatarios.slice(0, MOSTRAR).map((d) => (
                <li key={d.email} className="px-4 py-2 grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4 text-sm">
                  <span className="text-fg min-w-0 [overflow-wrap:anywhere]">{d.nombre} <span className="text-fg-faint">· {d.empresa}</span></span>
                  <span className="text-fg-dim min-w-0 [overflow-wrap:anywhere] sm:text-right">{d.email}</span>
                </li>
              ))}
              {n > MOSTRAR && <li className="px-4 py-3 text-fg-faint text-xs">y {n - MOSTRAR} más.</li>}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-fg text-lg font-semibold">El correo</h2>
          <p className="text-fg-dim text-sm">Al pie va solo el enlace «Darme de baja». La vista previa usa los datos de la primera persona de la lista.</p>
        </div>
        <EditorCorreo asunto={asunto} cuerpo={cuerpo} onAsunto={setAsunto} onCuerpo={setCuerpo} logoUrl={logoUrl} siteUrl={siteUrl} datos={datosVista} conBaja />
      </section>

      {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
      <div className="border-t border-line pt-4 grid gap-2 sm:flex sm:items-center sm:justify-between">
        <p className="text-fg-dim text-xs">Todavía no sale nada: en la siguiente pantalla revisas y confirmas el envío.</p>
        <div className="grid grid-flow-col auto-cols-fr gap-2 sm:flex">
          <Link href={campana ? `/empresa/campanas/${campana.id}` : "/empresa/campanas"} className={btn.secondary}>Cancelar</Link>
          <button type="submit" className={btn.primary} disabled={guardando}>{guardando ? "Guardando…" : "Guardar y revisar el envío"}</button>
        </div>
      </div>
    </form>
  );
}
