import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { RevenueChart } from "@/components/empresa/revenue-chart";
import { buildMonthlyRevenue } from "@/lib/revenue-helpers";
import { computeClientStats } from "@/lib/client-stats";
import { filterPaidInvoices } from "@/lib/invoice-revenue";
import type { DocumentStatus } from "@prisma/client";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const client = await prisma.client.findFirst({
    where: { id, userId: user.id },
    include: {
      documents: {
        where: { type: { in: ["COTIZACION", "FACTURA"] } },
        orderBy: { issueDate: "desc" },
        include: { paymentMethod: { select: { name: true } } },
      },
    },
  });

  if (!client) notFound();

  const quotes = client.documents.filter((d) => d.type === "COTIZACION");
  const invoices = client.documents.filter((d) => d.type === "FACTURA");
  const paidInvoices = filterPaidInvoices(client.documents);
  const stats = computeClientStats(client.documents);

  const totalGross = stats.gross;
  const totalNet = stats.net;
  const totalCommission = totalGross - totalNet;

  const chartData = buildMonthlyRevenue(
    paidInvoices.map((d) => ({
      issueDate: d.issueDate,
      total: d.total,
      netAmount: d.netAmount,
    }))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-white/40">
        <Link href="/empresa/clientes" className="hover:text-white/70 transition-colors">
          Clientes
        </Link>
        <span>/</span>
        <span className="text-white/70">{client.name}</span>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-white text-2xl font-semibold">{client.name}</h1>
            {client.company && <p className="text-white/50 text-sm mt-1">{client.company}</p>}
            <div className="flex flex-wrap gap-4 mt-3">
              {client.ruc && <span className="text-white/30 text-xs font-mono">RUC: {client.ruc}</span>}
              {client.email && <span className="text-white/30 text-xs">{client.email}</span>}
              {client.phone && <span className="text-white/30 text-xs">{client.phone}</span>}
              {client.address && <span className="text-white/30 text-xs">{client.address}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/empresa/cotizaciones/nueva?clientId=${client.id}`}
              className="px-4 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all"
            >
              + Cotización
            </Link>
            <Link
              href={`/empresa/facturas/nueva?clientId=${client.id}`}
              className="px-4 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] text-[#030611] text-sm font-semibold rounded-lg transition-all"
            >
              + Factura
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Cotizaciones", value: String(stats.totalQuotes), mono: false },
          {
            label: "Cotiz. aceptadas",
            value: `${stats.acceptedQuotes} (${stats.quoteAcceptanceRate}%)`,
            mono: true,
            color: "text-white/70",
          },
          { label: "Facturas", value: String(stats.totalInvoices), mono: false },
          {
            label: "Facturas pagadas",
            value: String(stats.paidInvoices),
            mono: true,
            color: "text-green-400",
          },
          {
            label: "Ingresos brutos",
            value: `$${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            mono: true,
            color: "text-[#1AA7F0]",
          },
        ].map(({ label, value, mono, color }) => (
          <div key={label} className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">{label}</p>
            <p className={`text-lg font-semibold ${mono ? "font-mono" : ""} ${color ?? "text-white"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
        <p className="text-white/40 text-xs uppercase tracking-widest">Neto recibido (facturas pagadas)</p>
        <p className="text-green-400 font-mono text-xl font-semibold">
          ${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {chartData.length > 0 && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
          <RevenueChart data={chartData} title="Ingresos por mes (facturas pagadas)" />
          {totalCommission > 0 && (
            <p className="text-amber-400/60 text-xs mt-3 text-right">
              Comisiones descontadas en total: $
              {totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}

      <DocumentHistoryTable
        title={`Facturas (${invoices.length})`}
        documents={invoices}
        basePath="/empresa/facturas"
        emptyMessage="Aún no hay facturas para este cliente."
      />

      <DocumentHistoryTable
        title={`Cotizaciones (${quotes.length})`}
        documents={quotes}
        basePath="/empresa/cotizaciones"
        emptyMessage="Aún no hay cotizaciones para este cliente."
      />
    </div>
  );
}

function DocumentHistoryTable({
  title,
  documents,
  basePath,
  emptyMessage,
}: {
  title: string;
  documents: {
    id: string;
    status: DocumentStatus;
    number: string | null;
    issueDate: Date;
    total: unknown;
    netAmount: unknown;
    paymentMethod: { name: string } | null;
  }[];
  basePath: string;
  emptyMessage: string;
}) {
  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-white/70 text-sm font-medium uppercase tracking-widest">{title}</h2>
      </div>
      {documents.length === 0 ? (
        <div className="p-10 text-center text-white/30 text-sm">{emptyMessage}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {["Número", "Fecha", "Total bruto", "Neto", "Método pago", "Estado", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-white/30 text-xs uppercase tracking-widest font-medium px-5 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {documents.map((doc) => (
              <tr key={doc.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 font-mono text-white/60 text-xs">{doc.number ?? "—"}</td>
                <td className="px-5 py-3 text-white/40 text-xs">
                  {new Date(doc.issueDate).toLocaleDateString("es-PA", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-5 py-3 font-mono text-white/60 text-sm">
                  ${Number(doc.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3 font-mono text-sm">
                  {doc.netAmount ? (
                    <span className="text-green-400">
                      ${Number(doc.netAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-white/40 text-xs">{doc.paymentMethod?.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`${basePath}/${doc.id}`}
                    className="text-[#1AA7F0]/60 hover:text-[#1AA7F0] text-xs opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {doc.status === "PAID" && basePath.includes("facturas") ? "Ver →" : "Abrir →"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
