import { getPortalUser } from "@/lib/portal/sesion";
import { pendientesDeDocumentos } from "@/lib/portal/datos";
import { esperaMiFirma, puedeAceptarPropuesta } from "@/lib/portal/documentos";
import { DocumentosNav } from "@/components/portal/documentos-nav";

/** Marco de Documentos: las pestañas con lo que espera a la persona (propuestas por aceptar, contratos por firmar). */
export default async function DocumentosLayout({ children }: { children: React.ReactNode }) {
  const p = await getPortalUser();
  const d = await pendientesDeDocumentos(p.clientId);
  const propuestas = d.propuestas.filter((x) => puedeAceptarPropuesta({ status: "SENT", validUntil: x.validUntil }, "principal").ok).length;
  const contratos = d.contratos.filter((c) => esperaMiFirma({ ...c, clientEmail: c.signingRequest?.clientEmail }, p.email)).length;
  return (
    <>
      <DocumentosNav pendientes={{ "/cliente/propuestas": propuestas, "/cliente/contratos": contratos }} />
      {children}
    </>
  );
}
