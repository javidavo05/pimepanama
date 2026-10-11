import { getPortalUser } from "@/lib/portal/sesion";
import { NavPortal } from "@/components/portal/nav";

export const dynamic = "force-dynamic";

/** Marco de la cuenta: cabecera con el logo de la línea del cliente, navegación y contenido. */
export default async function PrivadoLayout({ children }: { children: React.ReactNode }) {
  const persona = await getPortalUser();
  const linea = persona.client.brandLine === "premium" ? "premium" : "normal";
  return (
    <div className="portal-app" data-linea={linea}>
      <NavPortal linea={linea} empresa={persona.client.company || persona.client.name} persona={persona.fullName || persona.email} />
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-6 sm:pt-8 pb-32 sm:pb-16 space-y-8">{children}</main>
    </div>
  );
}
