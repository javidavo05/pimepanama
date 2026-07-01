import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Proyectos — Pime Suite" };
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

export default async function ProyectosPage() {
  const user = await getEmpresaUser();

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      client: { select: { name: true, company: true } },
      _count: { select: { documents: true, contracts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-white/40 text-sm mt-0.5">{projects.length} proyecto{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/empresa/proyectos/nuevo"
          className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all">
          + Nuevo proyecto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-12 text-center space-y-4">
          <p className="text-white/60 font-medium">No tienes proyectos aún</p>
          <p className="text-white/30 text-sm">Crea tu primer proyecto para vincular cotizaciones, contratos y pagos.</p>
          <Link href="/empresa/proyectos/nuevo"
            className="inline-block px-5 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all">
            Crear primer proyecto
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/empresa/proyectos/${p.id}`}
              className="bg-[#0a0a10] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-5 flex items-start gap-4 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#1AA7F0]/10 border border-[#1AA7F0]/20 flex items-center justify-center text-lg shrink-0">
                🗂️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-white font-medium truncate group-hover:text-[#1AA7F0] transition-colors">{p.name}</h2>
                  <span className={`px-2 py-0.5 text-[10px] rounded border ${STATUS_COLOR[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                {(p.client?.name || p.description) && (
                  <p className="text-white/40 text-sm truncate">
                    {p.client ? `${p.client.name}${p.client.company ? ` — ${p.client.company}` : ""}` : p.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-white/25 text-xs">{p._count.documents} doc.</span>
                  <span className="text-white/25 text-xs">{p._count.contracts} contrato{p._count.contracts !== 1 ? "s" : ""}</span>
                  {p.totalBudget && (
                    <span className="text-[#C8A96E]/60 text-xs font-mono">
                      ${Number(p.totalBudget).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {p.startDate && (
                    <span className="text-white/20 text-xs">
                      {new Date(p.startDate).toLocaleDateString("es-PA")}
                      {p.endDate ? ` → ${new Date(p.endDate).toLocaleDateString("es-PA")}` : ""}
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
