import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serializers";
import { ContractForm } from "../nuevo/contract-form";

export const dynamic = "force-dynamic";

export default async function ContratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const [contract, clients, projects] = await Promise.all([
    prisma.contract.findFirst({
      where: { id, userId: user.id },
      include: {
        client: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, name: true } },
        documents: {
          select: { id: true, type: true, number: true, status: true, total: true, issueDate: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  if (!contract) notFound();

  const serialized = {
    ...contract,
    value: contract.value != null ? Number(contract.value) : null,
    signedAt: contract.signedAt?.toISOString() ?? null,
    startsAt: contract.startsAt?.toISOString() ?? null,
    endsAt: contract.endsAt?.toISOString() ?? null,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
    client: contract.client,
    project: contract.project,
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Link href="/empresa/contratos" className="text-white/40 hover:text-white/70 transition-colors">Contratos</Link>
        <span className="text-white/20">/</span>
        <span className="text-white/60 truncate max-w-xs">{contract.title}</span>
      </div>

      <ContractForm
        clients={clients}
        projects={projects.map(serializeProject)}
        mode="edit"
        initial={serialized}
      />

      {contract.documents.length > 0 && (
        <div className="mt-6 bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05]">
            <h3 className="text-white/50 text-xs uppercase tracking-widest font-medium">Documentos vinculados</h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {contract.documents.map((d) => (
              <Link key={d.id}
                href={`/empresa/${d.type === "FACTURA" ? "facturas" : "cotizaciones"}/${d.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors text-sm">
                <span className="text-white/60 font-mono">{d.number ?? d.type}</span>
                <span className="text-white/30 text-xs">{new Date(d.issueDate).toLocaleDateString("es-PA")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
