import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalUser } from "@/lib/portal/sesion";
import { dinero, propuestaDelCliente } from "@/lib/portal/datos";
import { estadoPropuesta, lineasDePropuesta, puedeAceptarPropuesta } from "@/lib/portal/documentos";
import { Cifra, Encabezado, Etiqueta, Tarjeta, TituloSeccion, btnSecundario, fechaCorta } from "@/components/portal/ui";
import { IconAtras, IconDescargar } from "@/components/portal/iconos";
import { AceptarPropuesta } from "./aceptar";

export const metadata = { title: "Propuesta" };

export default async function PropuestaCliente({ params }: { params: Promise<{ id: string }> }) {
  const p = await getPortalUser();
  const { id } = await params;
  const x = await propuestaDelCliente(p.clientId, id);
  if (!x) notFound();
  const e = estadoPropuesta(x);
  const lineas = lineasDePropuesta(x.content);
  const puede = puedeAceptarPropuesta(x, p.role);
  const notas = typeof (x.content as { notes?: unknown } | null)?.notes === "string" ? String((x.content as { notes: string }).notes).trim() : "";

  return (
    <>
      <Link href="/cliente/propuestas" className="p-in group inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-fg-dim hover:text-fg transition-colors"><IconAtras width={16} height={16} className="transition-transform group-hover:-translate-x-1" />Propuestas</Link>
      <Encabezado eyebrow={x.number ? `Propuesta ${x.number}` : "Propuesta"} titulo={x.title}
        detalle={[x.project?.name, `Emitida el ${fechaCorta(x.issueDate)}`, x.validUntil && x.status !== "ACCEPTED" ? `válida hasta el ${fechaCorta(x.validUntil)}` : null].filter(Boolean).join(" · ")}
        accion={<Etiqueta tono={e.tono}>{e.texto}</Etiqueta>} />

      <Tarjeta i={1}>
        <TituloSeccion accion={<a href={`/api/cliente/propuestas/${x.id}`} className={`${btnSecundario} min-h-11 px-4`}><IconDescargar width={18} height={18} />PDF</a>}>
          <span className="flex items-baseline gap-3 flex-wrap">Total <span className="text-fg text-2xl font-extrabold"><Cifra texto={dinero(x.total)} moneda demora={200} /></span></span>
        </TituloSeccion>
        {lineas.length > 0 ? (
          <ol className="divide-y divide-line">
            {lineas.map((l, i) => (
              <li key={i} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-fg font-semibold whitespace-pre-line [overflow-wrap:anywhere]">{l.descripcion}</p>
                  {l.cantidad !== 1 && <p className="text-fg-faint text-xs tabular-nums">{l.cantidad} × {dinero(l.precio)}</p>}
                </div>
                <p className="text-fg font-semibold tabular-nums shrink-0">{dinero(l.total)}</p>
              </li>
            ))}
          </ol>
        ) : <p className="text-fg-dim text-sm">El detalle completo está en el PDF.</p>}
        {notas && <p className="mt-4 text-fg-mute text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{notas}</p>}
      </Tarjeta>

      <Tarjeta i={2}>
        <TituloSeccion>Tu respuesta</TituloSeccion>
        {x.status === "ACCEPTED" ? (
          <p className="text-fg-mute text-sm leading-relaxed">La aceptó <b className="text-fg">{x.aceptadaPor ?? "tu equipo"}</b>{x.aceptadaAt ? ` el ${fechaCorta(x.aceptadaAt)}` : ""}. El equipo de Pime ya está al tanto y te escribe con los siguientes pasos.</p>
        ) : puede.ok ? (
          <AceptarPropuesta propuestaId={x.id} total={dinero(x.total)} />
        ) : (
          <div className="space-y-4">
            <p className="text-fg-mute text-sm leading-relaxed">{puede.motivo}</p>
            <Link href="/cliente/tickets/nuevo" className={btnSecundario}>Escribirle a Pime</Link>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
