import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import type { FinancingPlan } from "@/lib/financing";
import { ProjectDetailClient } from "./project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const [project, allClients] = await Promise.all([
    prisma.project.findFirst({
      where: { id, userId: user.id },
      include: {
        client: { select: { id: true, name: true, company: true } },
        clients: { include: { client: { select: { id: true, name: true, company: true } } } },
        deliverables: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        meetings: {
          select: {
            id: true, title: true, status: true, meetingDate: true,
            durationMs: true, contextSummary: true,
            actionItems: { select: { taskId: true } },
          },
          orderBy: { meetingDate: "desc" },
        },
        contracts: { orderBy: { createdAt: "desc" } },
        documents: {
          select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, clientName: true, linkedDocumentId: true, paymentSchedules: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  // Los clientes del proyecto viven en ProjectClient; `client` es el espejo
  // legacy del principal y solo se usa como respaldo si la tabla está vacía.
  const projectClients = project.clients.length > 0
    ? project.clients.map((pc) => pc.client)
    : project.client
      ? [project.client]
      : [];

  const serialized = {
    ...project,
    totalBudget: project.totalBudget != null ? Number(project.totalBudget) : null,
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    hasProposal: project.proposalContent != null,
    financingPlan: (project.financingPlan as FinancingPlan | null) ?? null,
    clients: projectClients,
    meetings: project.meetings.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      meetingDate: m.meetingDate.toISOString(),
      durationMs: m.durationMs,
      contextSummary: m.contextSummary,
      actionItemCount: m.actionItems.length,
      openItemCount: m.actionItems.filter((i) => !i.taskId).length,
    })),
    deliverables: project.deliverables.map((d) => ({
      ...d,
      dueDate: d.dueDate?.toISOString() ?? null,
      completedAt: d.completedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    contracts: project.contracts.map((c) => ({
      ...c,
      value: c.value != null ? Number(c.value) : null,
      signedAt: c.signedAt?.toISOString() ?? null,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    documents: project.documents.map((d) => ({
      ...d,
      total: d.total != null ? Number(d.total) : null,
      issueDate: d.issueDate.toISOString(),
      paymentSchedules: d.paymentSchedules.map((s) => ({
        ...s,
        amount: Number(s.amount),
        dueDate: s.dueDate.toISOString(),
        paidAt: s.paidAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
    })),
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Link href="/empresa/proyectos" className="text-white/60 hover:text-white/70 transition-colors">Proyectos</Link>
        <span className="text-white/50">/</span>
        <span className="text-white/60 truncate max-w-xs">{project.name}</span>
      </div>

      <ProjectDetailClient project={serialized} allClients={allClients} />
    </div>
  );
}
