import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serializers";
import { LeadsView } from "./leads-view";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Leads — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await getEmpresaUser();

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        className="mb-6"
        title="Leads"
        description="Seguimiento de posibles clientes"
        actions={
          <Link href="/empresa/leads/nuevo" className={btn.primary}>
            + Nuevo lead
          </Link>
        }
      />

      <LeadsView leads={leads.map(serializeLead)} />
    </div>
  );
}
