/**
 * Sesión de la cuenta del cliente. Toda lectura del portal pasa por aquí y se filtra por el
 * clientId de la persona: un cliente nunca ve datos de otro.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const getPortalUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/cliente/acceso");

  const persona = await prisma.clientUser.findUnique({
    where: { supabaseUid: claims.sub },
    include: { client: { select: { id: true, name: true, company: true, brandLine: true, archivedAt: true, userId: true, email: true, phone: true, ruc: true, logoKey: true } } },
  });
  if (!persona) redirect("/cliente/acceso?aviso=equipo");
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
  return persona;
});

export type PortalUser = Awaited<ReturnType<typeof getPortalUser>>;
