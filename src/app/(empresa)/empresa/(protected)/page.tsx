import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DashboardStatCard } from "@/components/empresa/dashboard-stat-card";
import { DocumentListTable } from "@/components/empresa/document-list-table";

export const metadata = { title: "Dashboard — Pime Suite" };

export default async function EmpresaDashboardPage() {
  const user = await getEmpresaUser();

  const [facturas, cotizaciones, bitacoras, correos, recent, tokensResult] =
    await Promise.all([
      prisma.document.count({ where: { userId: user.id, type: "FACTURA" } }),
      prisma.document.count({ where: { userId: user.id, type: "COTIZACION" } }),
      prisma.document.count({ where: { userId: user.id, type: "BITACORA" } }),
      prisma.document.count({ where: { userId: user.id, type: "CORREO" } }),
      prisma.document.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.aiUsageLog.aggregate({
        where: {
          supabaseUid: user.supabaseUid,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { inputTokens: true, outputTokens: true },
      }),
    ]);

  const totalTokens =
    (tokensResult._sum.inputTokens ?? 0) +
    (tokensResult._sum.outputTokens ?? 0);

  const now = new Date();
  const monthName = now.toLocaleDateString("es-PA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Bienvenido, {user.fullName ?? user.email.split("@")[0]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-xs uppercase tracking-widest">
            Tokens IA — {monthName}
          </p>
          <p className="text-[#C8A96E] font-mono text-xl font-semibold mt-1">
            {totalTokens.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardStatCard
          label="Facturas"
          count={facturas}
          href="/empresa/facturas"
          newHref="/empresa/facturas/nueva"
          color="#3B82F6"
        />
        <DashboardStatCard
          label="Cotizaciones"
          count={cotizaciones}
          href="/empresa/cotizaciones"
          newHref="/empresa/cotizaciones/nueva"
          color="#8B5CF6"
        />
        <DashboardStatCard
          label="Bitácoras"
          count={bitacoras}
          href="/empresa/bitacoras"
          newHref="/empresa/bitacoras/nueva"
          color="#10B981"
        />
        <DashboardStatCard
          label="Correos"
          count={correos}
          href="/empresa/correos"
          newHref="/empresa/correos/nueva"
          color="#F59E0B"
        />
      </div>

      {/* Recent documents */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold">Documentos recientes</h2>
          <div className="flex gap-4">
            {(
              [
                ["facturas", "#3B82F6"],
                ["cotizaciones", "#8B5CF6"],
                ["bitacoras", "#10B981"],
                ["correos", "#F59E0B"],
              ] as const
            ).map(([type, color]) => (
              <Link
                key={type}
                href={`/empresa/${type}/nueva`}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                style={{
                  color,
                  borderColor: `${color}30`,
                  backgroundColor: `${color}10`,
                }}
              >
                + {type.slice(0, -1)}
              </Link>
            ))}
          </div>
        </div>
        <DocumentListTable documents={recent} showType />
      </div>
    </div>
  );
}
