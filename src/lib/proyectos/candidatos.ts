/** Proyectos de un equipo con sus clientes, para sugerir a qué proyecto va una reunión. */
import { prisma } from "@/lib/prisma";
import type { ProyectoCandidato } from "./sugerir-proyecto";

export async function proyectosCandidatos(userId: string): Promise<(ProyectoCandidato & { status: string })[]> {
  const rows = await prisma.project.findMany({
    where: { userId },
    select: { id: true, name: true, status: true, clientId: true, client: { select: { name: true, company: true } }, clients: { select: { client: { select: { id: true, name: true, company: true } } } } },
    orderBy: { name: "asc" },
  });
  return rows.map((p) => {
    const cs = p.clients.length ? p.clients.map((c) => c.client) : p.client && p.clientId ? [{ id: p.clientId, ...p.client }] : [];
    return { id: p.id, name: p.name, status: p.status, clientIds: cs.map((c) => c.id), clientNames: cs.flatMap((c) => [c.name, c.company].filter((x): x is string => !!x)) };
  });
}
