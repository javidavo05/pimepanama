import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { calcGptCost, fmtCost } from "@/lib/ai-pricing";
import { DashboardStatCard } from "@/components/empresa/dashboard-stat-card";
import { DocumentListTable } from "@/components/empresa/document-list-table";
import { DashboardRevenueChart } from "@/components/empresa/revenue-chart";
import { buildMonthlyRevenue, buildYearlyRevenue } from "@/lib/revenue-helpers";

export const metadata = { title: "Dashboard — Pime Suite" };

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function EmpresaDashboardPage() {
  const user = await getEmpresaUser();

  const [facturas, cotizaciones, bitacoras, correos, recent, tokensResult, acceptedDocs] =
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
      prisma.document.findMany({
        where: {
          userId: user.id,
          status: { in: ["ACCEPTED", "PAID"] },
          total: { not: null },
        },
        select: { issueDate: true, total: true, netAmount: true, type: true },
        orderBy: { issueDate: "asc" },
      }),
    ]);

  const inputTokens = tokensResult._sum.inputTokens ?? 0;
  const outputTokens = tokensResult._sum.outputTokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const aiCostUSD = calcGptCost(inputTokens, outputTokens);

  const now = new Date();
  const monthName = now.toLocaleDateString("es-PA", { month: "long", year: "numeric" });

  // Economic KPIs
  const totalBruto = acceptedDocs.reduce((s, d) => s + Number(d.total ?? 0), 0);
  const totalNeto = acceptedDocs.reduce((s, d) => s + Number(d.netAmount ?? d.total ?? 0), 0);
  const totalComisiones = totalBruto - totalNeto;
  const acceptedCotizaciones = acceptedDocs.filter((d) => d.type === "COTIZACION").length;
  const tasaCierre = cotizaciones > 0 ? Math.round((acceptedCotizaciones / cotizaciones) * 100) : 0;

  // Chart data
  const monthlyData = buildMonthlyRevenue(acceptedDocs);
  const yearlyData = buildYearlyRevenue(acceptedDocs);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">
            Bienvenido, {user.fullName ?? user.email.split("@")[0]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/30 text-xs uppercase tracking-widest">Tokens IA — {monthName}</p>
          <p className="text-[#C8A96E] font-mono text-xl font-semibold mt-1">
            {totalTokens.toLocaleString()}
          </p>
          <p className="text-white/20 text-xs font-mono mt-0.5" title={`$${aiCostUSD.toFixed(6)} (entrada: ${inputTokens.toLocaleString()} × $0.0000025 + salida: ${outputTokens.toLocaleString()} × $0.000010)`}>
            costo est. {fmtCost(aiCostUSD)}
          </p>
        </div>
      </div>

      {/* Doc type stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardStatCard label="Facturas" count={facturas} href="/empresa/facturas" newHref="/empresa/facturas/nueva" color="#3B82F6" />
        <DashboardStatCard label="Cotizaciones" count={cotizaciones} href="/empresa/cotizaciones" newHref="/empresa/cotizaciones/nueva" color="#8B5CF6" />
        <DashboardStatCard label="Bitácoras" count={bitacoras} href="/empresa/bitacoras" newHref="/empresa/bitacoras/nueva" color="#10B981" />
        <DashboardStatCard label="Correos" count={correos} href="/empresa/correos" newHref="/empresa/correos/nueva" color="#F59E0B" />
      </div>

      {/* Economic KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Ingresos brutos", value: `$${fmtUSD(totalBruto)}`, color: "text-[#1AA7F0]", sub: "acumulado total" },
          { label: "Neto recibido", value: `$${fmtUSD(totalNeto)}`, color: "text-green-400", sub: "después de comisiones" },
          { label: "Comisiones", value: `$${fmtUSD(totalComisiones)}`, color: "text-amber-400", sub: "pagadas a pasarelas" },
          { label: "Tasa de cierre", value: `${tasaCierre}%`, color: "text-[#6344E8]", sub: `${acceptedCotizaciones} de ${cotizaciones} cot.` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-3">{label}</p>
            <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-white/20 text-xs mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue timeline chart */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <DashboardRevenueChart monthlyData={monthlyData} yearlyData={yearlyData} />
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
                style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}
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
