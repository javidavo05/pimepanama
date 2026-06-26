import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { RevenueChart, buildMonthlyRevenue } from "@/components/empresa/revenue-chart";

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
        where: { type: "COTIZACION" },
        orderBy: { issueDate: "desc" },
        include: { paymentMethod: { select: { name: true } } },
      },
    },
  });

  if (!client) notFound();

  const accepted = client.documents.filter((d) => d.status === "ACCEPTED" || d.status === "PAID");
  const totalGross = accepted.reduce((s, d) => s + Number(d.total ?? 0), 0);
  const totalNet = accepted.reduce((s, d) => s + Number(d.netAmount ?? d.total ?? 0), 0);
  const totalCommission = totalGross - totalNet;
  const acceptanceRate = client.documents.length > 0
    ? Math.round((accepted.length / client.documents.length) * 100)
    : 0;

  const chartData = buildMonthlyRevenue(
    accepted.map((d) => ({ issueDate: d.issueDate, total: d.total, netAmount: d.netAmount }))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40">
        <Link href="/empresa/clientes" className="hover:text-white/70 transition-colors">Clientes</Link>
        <span>/</span>
        <span className="text-white/70">{client.name}</span>
      </div>

      {/* Client header */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-start justify-between">
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
          <Link
            href={`/empresa/cotizaciones/nueva?clientId=${client.id}`}
            className="px-4 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all shrink-0"
          >
            + Nueva cotización
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Cotizaciones", value: client.documents.length, mono: false },
          { label: "Tasa de aceptación", value: `${acceptanceRate}%`, mono: true, color: "text-green-400" },
          { label: "Ingresos brutos", value: `$${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, mono: true, color: "text-[#1AA7F0]" },
          { label: "Neto recibido", value: `$${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, mono: true, color: "text-green-400" },
        ].map(({ label, value, mono, color }) => (
          <div key={label} className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">{label}</p>
            <p className={`text-xl font-semibold ${mono ? "font-mono" : ""} ${color ?? "text-white"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
          <RevenueChart data={chartData} title="Ingresos por mes (cotizaciones aceptadas)" />
          {totalCommission > 0 && (
            <p className="text-amber-400/60 text-xs mt-3 text-right">
              Comisiones descontadas en total: ${totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}

      {/* Quotation history */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-white/70 text-sm font-medium uppercase tracking-widest">
            Historial de cotizaciones ({client.documents.length})
          </h2>
        </div>
        {client.documents.length === 0 ? (
          <div className="p-10 text-center text-white/30 text-sm">
            Aún no hay cotizaciones para este cliente.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Número", "Fecha", "Total bruto", "Neto", "Método pago", "Estado", ""].map((h) => (
                  <th key={h} className="text-left text-white/30 text-xs uppercase tracking-widest font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {client.documents.map((doc) => (
                <tr key={doc.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-mono text-white/60 text-xs">{doc.number ?? "—"}</td>
                  <td className="px-5 py-3 text-white/40 text-xs">
                    {new Date(doc.issueDate).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}
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
                  <td className="px-5 py-3 text-white/40 text-xs">
                    {doc.paymentMethod?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/empresa/cotizaciones/${doc.id}`}
                      className="text-[#1AA7F0]/60 hover:text-[#1AA7F0] text-xs opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
