import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serializers";
import { LeadsBoard } from "./leads-board";

export const metadata = { title: "Leads — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await getEmpresaUser();

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-white/60 text-sm mt-0.5">
            {leads.length} prospecto{leads.length !== 1 ? "s" : ""} · seguimiento de posibles clientes
          </p>
        </div>
        <Link href="/empresa/leads/nuevo"
          className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all">
          + Nuevo lead
        </Link>
      </div>

      <LeadsBoard leads={leads.map(serializeLead)} />
    </div>
  );
}
