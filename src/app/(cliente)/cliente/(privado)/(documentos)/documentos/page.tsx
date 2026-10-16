import Link from "next/link";
import { getPortalUser } from "@/lib/portal/sesion";
import { contratosDelCliente, dinero, pendientesDeDocumentos, propuestasDelCliente } from "@/lib/portal/datos";
import { contratoVisible, esperaMiFirma, estadoPropuesta } from "@/lib/portal/documentos";
import { Encabezado, Etiqueta, Fila, Tarjeta, TituloSeccion } from "@/components/portal/ui";
import { IconFlecha } from "@/components/portal/iconos";

export const metadata = { title: "Documentos" };

/** Resumen de Documentos: lo que espera tu respuesta arriba y luego cada sección con cuánto tiene. */
export default async function DocumentosCliente() {
  const p = await getPortalUser();
  const [propuestas, contratosTodos, d] = await Promise.all([propuestasDelCliente(p.clientId), contratosDelCliente(p.clientId), pendientesDeDocumentos(p.clientId)]);
  const contratos = contratosTodos.filter((c) => contratoVisible(c));
  const porResponder = propuestas.filter((x) => x.status === "SENT" && estadoPropuesta(x).tono === "aviso");
  const porFirmar = contratos.filter((c) => esperaMiFirma({ ...c, clientEmail: c.signingRequest?.clientEmail }, p.email));
  const pendientes = porResponder.length + porFirmar.length;

  const secciones = [
    { href: "/cliente/propuestas", titulo: "Propuestas", n: propuestas.length, texto: propuestas.length ? `${porResponder.length ? `${porResponder.length} por responder · ` : ""}${propuestas.length} en total` : "Las cotizaciones que Pime te envíe" },
    { href: "/cliente/contratos", titulo: "Contratos", n: contratos.length, texto: contratos.length ? `${porFirmar.length ? `${porFirmar.length} por firmar · ` : ""}${contratos.length} en total` : "Tus contratos y su firma" },
    { href: "/cliente/reuniones", titulo: "Reuniones", n: d.reuniones, texto: d.reuniones ? `${d.reuniones} ${d.reuniones === 1 ? "minuta compartida" : "minutas compartidas"}` : "Las minutas de lo que acordamos" },
    { href: "/cliente/archivos", titulo: "Archivos", n: d.archivos, texto: d.archivos ? `${d.archivos} ${d.archivos === 1 ? "archivo" : "archivos"}` : "Lo que compartimos contigo y lo que nos mandas" },
  ];

  return (
    <>
      <Encabezado eyebrow="Tu cuenta con Pime" titulo="Documentos" detalle="Propuestas, contratos, minutas de reunión y archivos de tu cuenta, en un solo lugar. Lo que espera tu respuesta va primero." />

      {pendientes > 0 && (
        <Tarjeta className="p-aviso" i={1}>
          <TituloSeccion accion={<Etiqueta tono="aviso">{pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}</Etiqueta>}>Espera tu respuesta</TituloSeccion>
          <ul className="p-lista divide-y divide-line">
            {porResponder.map((x, i) => <Fila key={x.id} i={i} tono="aviso" href={`/cliente/propuestas/${x.id}`} titulo={`Revisar la propuesta: ${x.title}`} detalle={`${x.number ?? "Propuesta"} · ${dinero(x.total)}`} />)}
            {porFirmar.map((c, i) => <Fila key={c.id} i={porResponder.length + i} tono="aviso" href="/cliente/contratos" titulo={`Firmar el contrato: ${c.title}`} detalle={c.project?.name ?? "Contrato"} />)}
          </ul>
        </Tarjeta>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {secciones.map((s, i) => (
          <Link key={s.href} href={s.href} className="block min-w-0 group">
            <Tarjeta as="div" tocable i={2 + i} className="h-full">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-fg text-lg font-bold tracking-tight">{s.titulo}</p>
                  <p className="text-fg-dim text-sm [overflow-wrap:anywhere]">{s.texto}</p>
                </div>
                <IconFlecha className="p-flecha shrink-0 text-fg-ghost transition-transform group-hover:translate-x-1" />
              </div>
            </Tarjeta>
          </Link>
        ))}
      </div>
    </>
  );
}
