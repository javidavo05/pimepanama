/** Lecturas del Pulso para /empresa y el portal. */
import { prisma } from "@/lib/prisma";
import { secretoDe } from "./firma";

export async function sistemasDelEquipo(userId: string) {
  return prisma.monitoredSystem.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, key: true, url: true, healthUrl: true, status: true, statusDetail: true, statusChangedAt: true, lastSeenAt: true, lastLatencyMs: true, appVersion: true, active: true, client: { select: { id: true, name: true, company: true, brandLine: true } }, project: { select: { id: true, name: true } }, _count: { select: { incidents: { where: { resolvedAt: null } } } } },
  });
}

export async function sistemaDelEquipo(userId: string, id: string) {
  return prisma.monitoredSystem.findFirst({
    where: { id, userId },
    include: { client: { select: { id: true, name: true, company: true, brandLine: true } }, project: { select: { id: true, name: true } }, incidents: { orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { lastSeenAt: "desc" }], take: 40 } },
  });
}

/** Para el portal: solo lo visible y sin detalle técnico. */
export async function sistemasDelCliente(clientId: string) {
  return prisma.monitoredSystem.findMany({
    where: { clientId, active: true, portalVisible: true, status: { not: "sin_senal" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, url: true, status: true, statusChangedAt: true, lastSeenAt: true, projectId: true },
  });
}

export function credencialesDe(s: { key: string; secretVersion: number }) {
  const maestro = process.env.PIME_PULSO_SECRET?.trim();
  return { key: s.key, secreto: maestro ? secretoDe(maestro, s.key, s.secretVersion) : null };
}
