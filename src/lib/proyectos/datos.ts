/**
 * Lo que necesita «Qué le falta» de cada proyecto, en una sola consulta para la lista o para un proyecto.
 * Solo base de datos: nada de GitHub, Vercel ni Supabase (la verificación de GitHub ya guardada basta).
 */
import { prisma } from "@/lib/prisma";
import { fasesVigentes } from "@/lib/portal/datos";
import { completitudProyecto, type Completitud, type DatosCompletitud } from "./completitud";

export async function datosCompletitud(userId: string, projectIds?: string[]): Promise<Map<string, DatosCompletitud>> {
  const rows = await prisma.project.findMany({
    where: { userId, ...(projectIds ? { id: { in: projectIds } } : {}) },
    select: {
      id: true, clientId: true, totalBudget: true, repoOwner: true, repoName: true, githubCheck: true,
      portalVisible: true, financingPlan: true, linkWaived: true,
      clients: { select: { clientId: true } },
      phases: { where: fasesVigentes, select: { price: true } },
      platforms: { select: { id: true, vercelProjectId: true, supabaseProjectRef: true } },
      documents: { where: { type: { in: ["COTIZACION", "FACTURA"] }, status: { not: "CANCELLED" } }, select: { type: true, status: true } },
      _count: { select: { meetings: true, contracts: true } },
    },
  });
  return new Map(
    rows.map((p) => {
      const ids = p.clients.length ? p.clients.map((c) => c.clientId) : p.clientId ? [p.clientId] : [];
      const check = p.githubCheck as { error?: string | null } | null;
      return [
        p.id,
        {
          id: p.id,
          clientes: ids.map((id) => ({ id })),
          fases: p.phases.map((f) => ({ price: Number(f.price) })),
          presupuesto: p.totalBudget != null ? Number(p.totalBudget) : null,
          cotizaciones: p.documents.filter((d) => d.type === "COTIZACION").length,
          contratos: p._count.contracts,
          repo: p.repoOwner && p.repoName ? `${p.repoOwner}/${p.repoName}` : null,
          githubCheck: check && typeof check === "object" ? { error: check.error ?? null } : null,
          plataformas: p.platforms.map((x) => ({ id: x.id, vercel: !!x.vercelProjectId, supabase: !!x.supabaseProjectRef })),
          reuniones: p._count.meetings,
          portalVisible: p.portalVisible,
          // Un borrador no es una factura emitida.
          facturas: p.documents.filter((d) => d.type === "FACTURA" && d.status !== "DRAFT").length,
          planDeCobro: p.financingPlan != null,
          waived: p.linkWaived,
        } satisfies DatosCompletitud,
      ];
    }),
  );
}

export async function completitudDe(userId: string, projectId: string): Promise<Completitud | null> {
  const d = (await datosCompletitud(userId, [projectId])).get(projectId);
  return d ? completitudProyecto(d) : null;
}
