import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serializers";
import { LeadDetailClient } from "./lead-detail-client";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const lead = await prisma.lead.findFirst({
    where: { id, userId: user.id },
    include: {
      convertedClient: { select: { id: true, name: true } },
      documents: {
        select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, title: true },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!lead) notFound();

  const serialized = {
    ...serializeLead(lead),
    convertedClient: lead.convertedClient,
    documents: lead.documents.map((d) => ({
      ...d,
      total: d.total != null ? Number(d.total) : null,
      issueDate: d.issueDate.toISOString(),
    })),
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Link href="/empresa/leads" className="text-white/60 hover:text-white/70 transition-colors">Leads</Link>
        <span className="text-white/50">/</span>
        <span className="text-white/60 truncate max-w-xs">{lead.name}</span>
      </div>

      <LeadDetailClient lead={serialized} />
    </div>
  );
}
