import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { calcGptCost, fmtCost } from "@/lib/ai-pricing";
import { DashboardStatCard } from "@/components/empresa/dashboard-stat-card";
import { DocumentListTable } from "@/components/empresa/document-list-table";
import { DashboardRevenueChart } from "@/components/empresa/revenue-chart";
import { buildMonthlyRevenue, buildYearlyRevenue } from "@/lib/revenue-helpers";
import {
  PAID_INVOICE_REVENUE_SELECT,
  paidInvoiceWhere,
  sumInvoiceRevenue,
} from "@/lib/invoice-revenue";

export const metadata = { title: "Dashboard — Pime Suite" };

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function EmpresaDashboardPage() {
  const user = await getEmpresaUser();

  const [facturas, cotizaciones, bitacoras, correos, recent, tokensResult, paidInvoices, acceptedCotizaciones, arDocs, activeProjects, overdueSchedules] =
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
        where: paidInvoiceWhere(user.id),
        select: PAID_INVOICE_REVENUE_SELECT,
        orderBy: { issueDate: "asc" },
      }),
      prisma.document.count({
        where: { userId: user.id, type: "COTIZACION", status: "ACCEPTED" },
      }),
      prisma.document.findMany({
        where: { userId: user.id, type: { in: ["FACTURA", "COTIZACION"] }, status: { in: ["SENT", "ACCEPTED"] }, total: { not: null, gt: 0 } },
        select: { type: true, total: true, content: true, linkedDocumentId: true },
      }),
      prisma.project.count({ where: { userId: user.id, status: "ACTIVE" } }),
      prisma.paymentSchedule.count({ where: { userId: user.id, status: "OVERDUE" } }),
    ]);

  const inputTokens = tokensResult._sum.inputTokens ?? 0;
  const outputTokens = tokensResult._sum.outputTokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const aiCostUSD = calcGptCost(inputTokens, outputTokens);

  const now = new Date();
  const monthName = now.toLocaleDateString("es-PA", { month: "long", year: "numeric" });

  // Economic KPIs — solo facturas pagadas (fuente de verdad)
  const { gross: totalBruto, net: totalNeto, commission: totalComisiones } = sumInvoiceRevenue(paidInvoices);
  const tasaCierre = cotizaciones > 0 ? Math.round((acceptedCotizaciones / cotizaciones) * 100) : 0;

  // Chart data
  const monthlyData = buildMonthlyRevenue(paidInvoices);
  const yearlyData = buildYearlyRevenue(paidInvoices);

  const totalPorCobrar = arDocs
    .filter((d) => {
      if (d.type === "COTIZACION") {
        if (d.linkedDocumentId) return false;
        const c = d.content as Record<string, unknown> | null;
        return !c?.linkedInvoiceId;
      }
      return true;
    })
    .reduce((s, d) => s + Number(d.total ?? 0), 0);

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

      {/* Proyectos + AR KPIs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Link href="/empresa/cuentas-por-cobrar"
          className="bg-[#0a0a10] border border-white/[0.06] hover:border-[#1AA7F0]/20 rounded-2xl p-5 transition-all group">
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-3">Cuentas por cobrar</p>
          <p className="font-mono text-2xl font-semibold text-[#1AA7F0]">${fmtUSD(totalPorCobrar)}</p>
          <p className="text-white/20 text-xs mt-1.5 group-hover:text-white/40 transition-colors">facturas + cotizaciones enviadas →</p>
        </Link>
        <Link href="/empresa/proyectos"
          className="bg-[#0a0a10] border border-white/[0.06] hover:border-green-500/20 rounded-2xl p-5 transition-all group">
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-3">Proyectos activos</p>
          <p className="font-mono text-2xl font-semibold text-green-400">{activeProjects}</p>
          <p className="text-white/20 text-xs mt-1.5 group-hover:text-white/40 transition-colors">en curso →</p>
        </Link>
        <Link href="/empresa/cuentas-por-cobrar"
          className={`bg-[#0a0a10] border rounded-2xl p-5 transition-all group ${overdueSchedules > 0 ? "border-red-500/20 hover:border-red-500/40" : "border-white/[0.06] hover:border-white/[0.12]"}`}>
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-3">Pagos vencidos</p>
          <p className={`font-mono text-2xl font-semibold ${overdueSchedules > 0 ? "text-red-400" : "text-white/30"}`}>{overdueSchedules}</p>
          <p className={`text-xs mt-1.5 ${overdueSchedules > 0 ? "text-red-400/50" : "text-white/20"} group-hover:opacity-80 transition-opacity`}>
            {overdueSchedules > 0 ? "requieren atención →" : "al día"}
          </p>
        </Link>
      </div>

      {/* Economic KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Ingresos brutos", value: `$${fmtUSD(totalBruto)}`, color: "text-[#1AA7F0]", sub: "facturas pagadas" },
          { label: "Neto recibido", value: `$${fmtUSD(totalNeto)}`, color: "text-green-400", sub: "facturas pagadas" },
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
