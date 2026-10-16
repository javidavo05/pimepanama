/** El equipo de la empresa para elegir responsables: el dueño y sus miembros activos. */
import { prisma } from "@/lib/prisma";

export async function equipoDeLaEmpresa(ownerId: string): Promise<{ id: string; nombre: string }[]> {
  const gente = await prisma.empresaUser.findMany({
    where: { OR: [{ id: ownerId }, { ownerId, activo: true }] },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, fullName: true },
  });
  return gente.map((g) => ({ id: g.id, nombre: g.fullName || g.email }));
}
