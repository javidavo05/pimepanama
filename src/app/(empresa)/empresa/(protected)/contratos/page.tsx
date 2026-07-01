import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Contratos — Pime Suite" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", ACTIVE: "Activo", EXPIRED: "Vencido", TERMINATED: "Terminado",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-white/[0.05] text-white/30 border-white/[0.08]",
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/20",
  EXPIRED: "bg-white/[0.05] text-white/40 border-white/[0.10]",
  TERMINATED: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default async function ContratosPage() {
  const user = await getEmpresaUser();

  const contracts = await prisma.contract.findMany({
    where: { userId: user.id },
    include: {
      client: { select: { name: true, company: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-white/40 text-sm mt-0.5">{contracts.length} contrato{contracts.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/empresa/contratos/nuevo"
          className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all">
          + Nuevo contrato
        </Link>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-12 text-center space-y-4">
          <p className="text-white/60 font-medium">No tienes contratos aún</p>
          <p className="text-white/30 text-sm">Los contratos definen responsabilidades y se vinculan a proyectos y cotizaciones.</p>
          <Link href="/empresa/contratos/nuevo"
            className="inline-block px-5 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all">
            Crear primer contrato
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {contracts.map((c) => (
            <Link key={c.id} href={`/empresa/contratos/${c.id}`}
              className="bg-[#0a0a10] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-5 flex items-start gap-4 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#C8A96E]/10 border border-[#C8A96E]/20 flex items-center justify-center text-lg shrink-0">
                📑
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-white font-medium truncate group-hover:text-[#C8A96E] transition-colors">{c.title}</h2>
                  <span className={`px-2 py-0.5 text-[10px] rounded border ${STATUS_COLOR[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {c.client && <span className="text-white/40">{c.client.name}{c.client.company ? ` — ${c.client.company}` : ""}</span>}
                  {c.project && (
                    <span className="text-[#1AA7F0]/50 text-xs">🗂️ {c.project.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-white/25 text-xs">{c._count.documents} doc.</span>
                  {c.value != null && (
                    <span className="text-[#C8A96E]/60 text-xs font-mono">
                      ${Number(c.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {c.startsAt && (
                    <span className="text-white/20 text-xs">
                      {new Date(c.startsAt).toLocaleDateString("es-PA")}
                      {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleDateString("es-PA")}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
