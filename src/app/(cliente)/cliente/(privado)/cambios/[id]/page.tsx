import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalUser } from "@/lib/portal/sesion";
import { ordenDelCliente, dinero } from "@/lib/portal/datos";
import { FASE_COBRO_LABEL, type FaseCobro } from "@/lib/portal/estados";
import { Encabezado, Etiqueta, Tarjeta, TituloSeccion, fechaCorta } from "@/components/portal/ui";
import { IconAtras } from "@/components/portal/iconos";
import { DecidirOrden } from "./decidir";

export const metadata = { title: "Orden de cambio" };

export default async function OrdenCliente({ params }: { params: Promise<{ id: string }> }) {
  const p = await getPortalUser();
  const { id } = await params;
  const o = await ordenDelCliente(p.clientId, id);
  if (!o) notFound();
  const abierta = o.status === "enviada";
  return (
    <>
      <Link href={`/cliente/proyectos/${o.project.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-fg-dim hover:text-fg"><IconAtras width={16} height={16} />{o.project.name}</Link>
      <Encabezado eyebrow={`Orden de cambio ${o.number}`} titulo={o.title}
        accion={<Etiqueta tono={abierta ? "aviso" : o.status === "aprobada" ? "ok" : "neutro"}>{abierta ? "Espera tu decisión" : o.status === "aprobada" ? `Aprobada el ${fechaCorta(o.decidedAt)}` : o.status === "rechazada" ? "No aprobada" : "Cancelada"}</Etiqueta>} />
      {o.description && <Tarjeta><TituloSeccion>Qué cambia</TituloSeccion><p className="text-fg-mute text-sm leading-relaxed whitespace-pre-line">{o.description}</p></Tarjeta>}
      <Tarjeta>
        <TituloSeccion accion={<span className="text-fg text-lg font-bold tabular-nums">{dinero(o.total)}</span>}>Fases y precio</TituloSeccion>
        {o.phases.length ? (
          <ol className="divide-y divide-line">
            {o.phases.map((f, i) => (
              <li key={f.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><p className="text-fg font-semibold">{i + 1}. {f.name}</p>{f.description && <p className="text-fg-dim text-sm whitespace-pre-line">{f.description}</p>}<p className="text-fg-faint text-xs mt-1">{FASE_COBRO_LABEL[f.billingPoint as FaseCobro] ?? f.billingPoint}{f.estimatedDays ? ` · ~${f.estimatedDays} días` : ""}</p></div>
                <p className="text-fg font-semibold tabular-nums shrink-0">{dinero(f.price)}</p>
              </li>
            ))}
          </ol>
        ) : <p className="text-fg-dim text-sm">Precio total: {dinero(o.total)}.</p>}
      </Tarjeta>
      {abierta ? <Tarjeta><TituloSeccion>Tu decisión</TituloSeccion><DecidirOrden ordenId={o.id} total={dinero(o.total)} /></Tarjeta>
        : o.decisionComment && <Tarjeta><TituloSeccion>Tu comentario</TituloSeccion><p className="text-fg-mute text-sm whitespace-pre-line">{o.decisionComment}</p></Tarjeta>}
    </>
  );
}
