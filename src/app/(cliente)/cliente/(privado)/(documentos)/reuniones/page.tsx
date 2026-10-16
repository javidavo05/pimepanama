import { getPortalUser } from "@/lib/portal/sesion";
import { reunionesCompartidas } from "@/lib/portal/datos";
import { minutaParaCliente } from "@/lib/portal/documentos";
import { Encabezado, Fila, Tarjeta, TituloSeccion, Vacio, fechaCorta } from "@/components/portal/ui";

export const metadata = { title: "Reuniones" };

export default async function ReunionesCliente() {
  const p = await getPortalUser();
  const reuniones = await reunionesCompartidas(p.clientId);
  return (
    <>
      <Encabezado eyebrow="Documentos" titulo="Reuniones" detalle="Las minutas de nuestras reuniones: de qué se habló, qué se decidió y qué sigue. Sirven de constancia de lo acordado." />
      <Tarjeta i={1}>
        <TituloSeccion>Minutas compartidas</TituloSeccion>
        {reuniones.length === 0 ? (
          <Vacio titulo="Todavía no hay minutas" texto="Después de cada reunión, Pime comparte aquí la minuta con las decisiones y los próximos pasos para que los tengas a mano." />
        ) : (
          <ul className="p-lista divide-y divide-line">
            {reuniones.map((r, i) => {
              const m = minutaParaCliente(r.executiveMinutes);
              const resumen = m?.agenda || m?.decisiones[0] || "La minuta se está preparando.";
              return <Fila key={r.id} i={i} href={`/cliente/reuniones/${r.id}`} titulo={r.title} detalle={`${fechaCorta(r.meetingDate)}${r.project?.name ? ` · ${r.project.name}` : ""} · ${resumen}`} />;
            })}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}
