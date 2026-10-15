import Link from "next/link";
import { getPortalUser } from "@/lib/portal/sesion";
import { ticketsDelCliente } from "@/lib/portal/datos";
import { TICKET_ABIERTOS, TICKET_ESTADO_LABEL, TICKET_TIPO_LABEL, type TicketEstado, type TicketTipo } from "@/lib/portal/estados";
import { Encabezado, Etiqueta, Fila, Swap, Tarjeta, TituloSeccion, Vacio, btnPrincipal, haceCuanto } from "@/components/portal/ui";
import { IconMas } from "@/components/portal/iconos";

export const metadata = { title: "Tickets" };

export default async function TicketsCliente() {
  const p = await getPortalUser();
  const tickets = await ticketsDelCliente(p.clientId);
  const abiertos = tickets.filter((t) => TICKET_ABIERTOS.includes(t.status as TicketEstado));
  const cerrados = tickets.filter((t) => !TICKET_ABIERTOS.includes(t.status as TicketEstado));
  const fila = (t: (typeof tickets)[number], i: number) => (
    <Fila key={t.id} i={i} tono={t.status === "esperando_cliente" ? "aviso" : t.status === "resuelto" || t.status === "cerrado" ? "ok" : "marca"} href={`/cliente/tickets/${t.id}`} titulo={t.title}
      detalle={`${t.number} · ${TICKET_TIPO_LABEL[t.kind as TicketTipo] ?? t.kind}${t.project ? ` · ${t.project.name}` : ""} · ${haceCuanto(t.updatedAt)}`}
      derecha={<Etiqueta tono={t.status === "esperando_cliente" ? "aviso" : t.status === "resuelto" || t.status === "cerrado" ? "ok" : "marca"}>{TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</Etiqueta>} />
  );
  return (
    <>
      <Encabezado eyebrow="Soporte y pedidos" titulo="Tickets" detalle="Cada problema, cambio o idea nueva va en un ticket. Ves cada respuesta de Pime y el estado en todo momento."
        accion={<Link href="/cliente/tickets/nuevo" className={btnPrincipal}><IconMas data-gira="" /><Swap>Abrir un ticket</Swap></Link>} />
      {tickets.length === 0 ? (
        <Vacio titulo="Todavía no abriste tickets" texto="Si algo no funciona, quieres un cambio o tienes una idea nueva, ábrelo aquí con capturas. Te respondemos en el mismo ticket." accion={<Link href="/cliente/tickets/nuevo" className={btnPrincipal}>Abrir mi primer ticket</Link>} />
      ) : (
        <>
          <Tarjeta i={1}>
            <TituloSeccion>Abiertos ({abiertos.length})</TituloSeccion>
            {abiertos.length ? <ul className="p-lista divide-y divide-line">{abiertos.map(fila)}</ul> : <p className="text-fg-dim text-sm">No tienes tickets abiertos.</p>}
          </Tarjeta>
          {cerrados.length > 0 && (
            <Tarjeta i={2}>
              <TituloSeccion>Resueltos ({cerrados.length})</TituloSeccion>
              <ul className="p-lista divide-y divide-line">{cerrados.slice(0, 30).map(fila)}</ul>
            </Tarjeta>
          )}
        </>
      )}
    </>
  );
}
