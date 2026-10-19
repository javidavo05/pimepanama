/**
 * Sesión de la cuenta del cliente. Toda lectura del portal pasa por aquí y se filtra por el
 * clientId de la persona: un cliente nunca ve datos de otro.
 *
 * Vista de revisión (src/lib/portal/vista.ts): si quien entra es del equipo y eligió un cliente desde su ficha,
 * ve la cuenta de ese cliente como la verá el cliente, con `vista` lleno. Las acciones la rechazan.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { vistaDelEquipo, type Vista } from "./vista";

const CLIENTE_SELECT = { id: true, name: true, company: true, brandLine: true, archivedAt: true, userId: true, email: true, phone: true, ruc: true, logoKey: true } as const;

export const getPortalUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/cliente/acceso");

  const persona = await prisma.clientUser.findUnique({
    where: { supabaseUid: claims.sub },
    include: { client: { select: CLIENTE_SELECT } },
  });
  if (!persona) {
    const vista = await vistaDelEquipo(claims as Parameters<typeof vistaDelEquipo>[0]);
    if (!vista) redirect("/cliente/acceso?aviso=equipo");
    return personaDeRevision(vista);
  }
  if (persona.status !== "activo" || persona.client.archivedAt) redirect("/cliente/acceso?aviso=desactivada");

  // Doble verificación opcional para clientes: si la activó, se la pide en cada sesión nueva.
  if (claims.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2") redirect("/cliente/verificar");
  }

  // Último ingreso, como mucho una escritura por hora.
  if (!persona.lastLoginAt || Date.now() - persona.lastLoginAt.getTime() > 3_600_000) {
    void prisma.clientUser.update({ where: { id: persona.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
  }
  return { ...persona, vista: null as Vista | null };
});

/**
 * La persona con la que se pinta la vista de revisión: la principal del cliente si ya existe (se ve su nombre,
 * como lo verá ella) o, si todavía no hay nadie invitado, una persona de muestra con los datos del cliente.
 */
async function personaDeRevision(vista: Vista) {
  const [client, principal] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: vista.clientId }, select: CLIENTE_SELECT }),
    prisma.clientUser.findFirst({ where: { clientId: vista.clientId, status: { not: "revocado" } }, orderBy: [{ role: "desc" }, { createdAt: "asc" }] }),
  ]);
  const base = principal ?? {
    id: `revision-${client.id}`, userId: client.userId, clientId: client.id, email: client.email ?? "", fullName: client.name, role: "principal", status: "activo",
    supabaseUid: null, invitedAt: null, activatedAt: null, lastLoginAt: null, revokedAt: null, createdAt: new Date(), updatedAt: new Date(),
  };
  return { ...base, status: "activo", client, vista: vista as Vista | null };
}

export type PortalUser = Awaited<ReturnType<typeof getPortalUser>>;
