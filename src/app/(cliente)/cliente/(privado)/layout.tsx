import { getPortalUser } from "@/lib/portal/sesion";
import { NavPortal } from "@/components/portal/nav";
import { PortalVivo } from "@/components/portal/vivo";
import { SimboloContorno } from "@/components/portal/marca";
import { AvisoRevision } from "@/components/portal/aviso-revision";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Marco de la cuenta: cabecera con el logo de la línea del cliente, navegación y contenido. */
export default async function PrivadoLayout({ children }: { children: React.ReactNode }) {
  const persona = await getPortalUser();
  const linea = persona.client.brandLine === "premium" ? "premium" : "normal";
  const empresa = persona.client.company || persona.client.name;
  // Vista de revisión del equipo: franja arriba de cada pantalla y «Salir» vuelve a la ficha sin cerrar la sesión.
  const revision = persona.vista
    ? await prisma.client.findUnique({ where: { id: persona.clientId }, select: { portalReviewedAt: true, portalReviewedBy: true } })
    : null;
  return (
    <div className="portal-app p-fondo" data-linea={linea}>
      <SimboloContorno className="p-marca-agua" />
      <NavPortal linea={linea} vista={!!persona.vista} empresa={empresa} persona={persona.fullName || persona.email} logo={persona.client.logoKey ? `/api/cliente/logo?v=${encodeURIComponent(persona.client.logoKey.slice(-12))}` : null} />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 pb-32 sm:pb-16 space-y-8">
        {persona.vista && <AvisoRevision empresa={empresa} revisadaAt={revision?.portalReviewedAt ?? null} revisadaPor={revision?.portalReviewedBy ?? null} sinPersonas={persona.id.startsWith("revision-")} />}
        {children}
      </main>
      <PortalVivo />
    </div>
  );
}
