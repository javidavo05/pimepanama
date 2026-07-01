import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { ProjectDetailClient } from "./project-detail-client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activo", PAUSED: "Pausado", COMPLETED: "Completado", CANCELLED: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/20",
  PAUSED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CANCELLED: "bg-white/[0.05] text-white/30 border-white/[0.08]",
};

export default async function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { id: true, name: true, company: true } },
      contracts: { orderBy: { createdAt: "desc" } },
      documents: {
        select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, clientName: true, linkedDocumentId: true, paymentSchedules: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) notFound();

  const serialized = {
    ...project,
    totalBudget: project.totalBudget != null ? Number(project.totalBudget) : null,
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
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
        <Link href="/empresa/proyectos" className="text-white/40 hover:text-white/70 transition-colors">Proyectos</Link>
        <span className="text-white/20">/</span>
        <span className="text-white/60 truncate max-w-xs">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-white text-2xl font-semibold tracking-tight">{project.name}</h1>
            <span className={`px-2 py-0.5 text-xs rounded border ${STATUS_COLOR[project.status]}`}>
              {STATUS_LABEL[project.status]}
            </span>
          </div>
          {project.client && (
            <Link href={`/empresa/clientes/${project.client.id}`}
              className="text-white/40 text-sm hover:text-[#1AA7F0] transition-colors">
              {project.client.name}{project.client.company ? ` — ${project.client.company}` : ""}
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/empresa/contratos/nuevo?projectId=${project.id}&clientId=${project.clientId ?? ""}`}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs font-medium rounded-lg hover:text-white hover:border-white/20 transition-all">
            + Contrato
          </Link>
        </div>
      </div>

      <ProjectDetailClient project={serialized} />
    </div>
  );
}
