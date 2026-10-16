import { getPortalUser } from "@/lib/portal/sesion";
import { dinero, propuestasDelCliente } from "@/lib/portal/datos";
import { estadoPropuesta } from "@/lib/portal/documentos";
import { Encabezado, Etiqueta, Fila, Tarjeta, TituloSeccion, Vacio, btnSecundario, fechaCorta } from "@/components/portal/ui";
import Link from "next/link";

export const metadata = { title: "Propuestas" };

export default async function PropuestasCliente() {
  const p = await getPortalUser();
  const propuestas = await propuestasDelCliente(p.clientId);
  return (
    <>
      <Encabezado eyebrow="Documentos" titulo="Propuestas" detalle="Las cotizaciones que Pime te envió, con su PDF. Ábrela para ver el detalle y aceptarla desde aquí." />
      <Tarjeta i={1}>
        <TituloSeccion>Tus propuestas</TituloSeccion>
        {propuestas.length === 0 ? (
          <Vacio titulo="Todavía no hay propuestas" texto="Cuando Pime te envíe una cotización por un proyecto o un cambio, aparece aquí para que la revises y la aceptes sin papeles."
            accion={<Link href="/cliente/tickets/nuevo" className={btnSecundario}>Pedir una propuesta</Link>} />
        ) : (
          <ul className="p-lista divide-y divide-line">
            {propuestas.map((x, i) => {
              const e = estadoPropuesta(x);
              return (
                <Fila key={x.id} i={i} tono={e.tono} href={`/cliente/propuestas/${x.id}`} titulo={x.title}
                  detalle={`${dinero(x.total)} · ${x.number ?? "Propuesta"} · ${x.status === "ACCEPTED" && x.aceptadaAt ? `aceptada el ${fechaCorta(x.aceptadaAt)}` : x.validUntil ? `válida hasta el ${fechaCorta(x.validUntil)}` : `enviada el ${fechaCorta(x.sentAt ?? x.issueDate)}`}`}
                  derecha={<span className="hidden sm:inline-flex"><Etiqueta tono={e.tono}>{e.texto}</Etiqueta></span>} />
              );
            })}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}
