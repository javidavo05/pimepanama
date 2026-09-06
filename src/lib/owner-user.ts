import { prisma } from "@/lib/prisma";

/**
 * Dueño de los datos que entran por rutas públicas (formulario de contacto,
 * agenda de citas). No hay sesión en esas rutas, así que hay que resolver a qué
 * EmpresaUser cuelga el lead / la cita:
 *
 *   1. el id explícito, si viene;
 *   2. `PIME_OWNER_EMAIL` (o el legacy `BOOKING_OWNER_EMAIL`);
 *   3. el primer usuario OWNER;
 *   4. el usuario más antiguo.
 */
export async function resolveOwnerUserId(explicitUserId?: string | null): Promise<string> {
  if (explicitUserId) {
    const byId = await prisma.empresaUser.findUnique({ where: { id: explicitUserId } });
    if (byId) return byId.id;
  }

  const email = (process.env.PIME_OWNER_EMAIL ?? process.env.BOOKING_OWNER_EMAIL)?.trim();
  if (email) {
    const byEmail = await prisma.empresaUser.findUnique({ where: { email } });
    if (byEmail) return byEmail.id;
  }

  const owner = await prisma.empresaUser.findFirst({
    where: { role: "OWNER" },
    orderBy: { createdAt: "asc" },
  });
  if (owner) return owner.id;

  const first = await prisma.empresaUser.findFirst({ orderBy: { createdAt: "asc" } });
  if (!first) throw new Error("No hay usuario empresa configurado.");
  return first.id;
}
