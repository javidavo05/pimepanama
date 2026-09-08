import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Contratos — Pime Suite" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", ACTIVE: "Activo", EXPIRED: "Vencido", TERMINATED: "Terminado",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-fill-2 text-fg-dim border-line",
  ACTIVE: "bg-green-500/15 text-ok border-green-500/20",
  EXPIRED: "bg-fill-2 text-fg-dim border-line-mid",
  TERMINATED: "bg-red-500/15 text-danger border-red-500/20",
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
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-fg-dim text-sm mt-0.5">{contracts.length} contrato{contracts.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/empresa/proyectos/nuevo"
          className="px-4 py-2 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-all">
          + Proyecto y contrato
        </Link>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center space-y-4">
          <p className="text-fg-dim font-medium">No tienes contratos aún</p>
          <p className="text-fg-dim text-sm">
            El contrato se crea junto con su proyecto, en una sola pantalla.
          </p>
          <Link href="/empresa/proyectos/nuevo"
            className="inline-block px-5 py-2 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-all">
            Crear proyecto y contrato
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {contracts.map((c) => (
            <Link key={c.id} href={`/empresa/contratos/${c.id}`}
              className="bg-panel border border-line hover:border-line-mid rounded-xl p-5 flex items-start gap-4 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-sand/10 border border-sand/20 flex items-center justify-center text-lg shrink-0">
                📑
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-fg font-medium truncate group-hover:text-sand-fg transition-colors">{c.title}</h2>
                  <span className={`px-2 py-0.5 text-[10px] rounded border ${STATUS_COLOR[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {c.client && <span className="text-fg-dim">{c.client.name}{c.client.company ? ` — ${c.client.company}` : ""}</span>}
                  {c.project && (
                    <span className="text-brand-fg/50 text-xs">🗂️ {c.project.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-fg-faint text-xs">{c._count.documents} doc.</span>
                  {c.value != null && (
                    <span className="text-sand-fg/60 text-xs font-mono">
                      ${Number(c.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {c.startsAt && (
                    <span className="text-fg-faint text-xs">
                      {new Date(c.startsAt).toLocaleDateString("es-PA")}
                      {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleDateString("es-PA")}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-fg-faint group-hover:text-fg-faint transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
