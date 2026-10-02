import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { LazyRevenueChart as RevenueChart } from "@/components/empresa/revenue-chart-lazy";
import { buildMonthlyRevenue } from "@/lib/revenue-helpers";
import { computeClientStats } from "@/lib/client-stats";
import { filterPaidInvoices, effectiveInvoiceAmount } from "@/lib/invoice-revenue";
import type { DocumentStatus } from "@prisma/client";
import { ActionRow, btn } from "@/components/empresa/page-header";

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
    paidInvoices.map((d) => ({ issueDate: d.issueDate, ...effectiveInvoiceAmount(d) }))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-fg-dim min-w-0">
        <Link
          href="/empresa/clientes"
          className="inline-flex items-center min-h-11 sm:min-h-8 shrink-0 hover:text-fg-mute transition-colors"
        >
          Clientes
        </Link>
        <span>/</span>
        <span className="text-fg-mute truncate min-w-0">{client.name}</span>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6">
        {/* En el celular los dos botones bajan debajo de los datos, en columnas
            iguales; desde tablet quedan a la derecha. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-fg text-2xl font-semibold break-words">{client.name}</h1>
            {client.company && <p className="text-fg-faint text-sm mt-1">{client.company}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 [&>span]:break-all">
              {client.ruc && <span className="text-fg-dim text-xs font-mono">RUC: {client.ruc}</span>}
              {client.email && <span className="text-fg-dim text-xs">{client.email}</span>}
              {client.phone && <span className="text-fg-dim text-xs">{client.phone}</span>}
              {client.address && <span className="text-fg-dim text-xs">{client.address}</span>}
            </div>
          </div>
          <ActionRow>
            <Link href={`/empresa/cotizaciones/nueva?clientId=${client.id}`} className={btn.primary}>
              + Cotización
            </Link>
            <Link href={`/empresa/facturas/nueva?clientId=${client.id}`} className={btn.accent}>
              + Factura
            </Link>
          </ActionRow>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Cotizaciones", value: String(stats.totalQuotes), mono: false },
          {
            label: "Cotiz. aceptadas",
            value: `${stats.acceptedQuotes} (${stats.quoteAcceptanceRate}%)`,
            mono: true,
            color: "text-fg-mute",
          },
          { label: "Facturas", value: String(stats.totalInvoices), mono: false },
          {
            label: "Facturas pagadas",
            value: String(stats.paidInvoices),
            mono: true,
            color: "text-ok",
          },
          {
            label: "Ingresos brutos",
            value: `$${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            mono: true,
            color: "text-brand-fg",
          },
        ].map(({ label, value, mono, color }) => (
          <div key={label} className="bg-panel border border-line rounded-xl p-4 min-w-0">
            <p className="text-fg-dim text-xs uppercase tracking-widest mb-2">{label}</p>
            <p className={`text-lg font-semibold break-words ${mono ? "font-mono" : ""} ${color ?? "text-fg"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-panel border border-line rounded-xl p-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-fg-dim text-xs uppercase tracking-widest">Neto recibido (facturas pagadas)</p>
        <p className="text-ok font-mono text-xl font-semibold">
          ${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {chartData.length > 0 && (
        <div className="bg-panel border border-line rounded-2xl p-6">
          <RevenueChart data={chartData} title="Ingresos por mes (facturas pagadas)" />
          {totalCommission > 0 && (
            <p className="text-warn text-xs mt-3 text-right">
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
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-line">
        <h2 className="text-fg-mute text-sm font-medium uppercase tracking-widest">{title}</h2>
      </div>
      {documents.length === 0 ? (
        <div className="p-10 text-center text-fg-dim text-sm">{emptyMessage}</div>
      ) : (
        <>
        {/* Celular: una tarjeta por documento. Siete columnas no caben en
            390 px y la tabla cortaba el neto por el borde. */}
        <ul className="sm:hidden divide-y divide-line">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`${basePath}/${doc.id}`}
                className="block px-4 py-3 space-y-2 hover:bg-fill transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-fg-mute text-sm truncate min-w-0">{doc.number ?? "—"}</span>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-fg-dim">
                    {new Date(doc.issueDate).toLocaleDateString("es-PA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-right font-mono text-fg-dim text-sm">
                    ${Number(doc.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-fg-dim truncate min-w-0">{doc.paymentMethod?.name ?? "—"}</span>
                  <span className="text-right font-mono">
                    {doc.netAmount ? (
                      <span className="text-ok">
                        Neto ${Number(doc.netAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-fg-faint">Neto —</span>
                    )}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {/* Desde tablet, la tabla; si aún no cabe, se desplaza dentro de su caja. */}
        <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {["Número", "Fecha", "Total bruto", "Neto", "Método pago", "Estado", ""].map((h) => (
                <th
                  key={h}
                  className="text-left text-fg-dim text-xs uppercase tracking-widest font-medium px-5 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {documents.map((doc) => (
              <tr key={doc.id} className="group hover:bg-fill transition-colors">
                <td className="px-5 py-3 font-mono text-fg-dim text-xs">{doc.number ?? "—"}</td>
                <td className="px-5 py-3 text-fg-dim text-xs">
                  {new Date(doc.issueDate).toLocaleDateString("es-PA", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-5 py-3 font-mono text-fg-dim text-sm">
                  ${Number(doc.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3 font-mono text-sm">
                  {doc.netAmount ? (
                    <span className="text-ok">
                      ${Number(doc.netAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-fg-faint">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-fg-dim text-xs">{doc.paymentMethod?.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`${basePath}/${doc.id}`}
                    className="inline-flex items-center min-h-8 px-2 -mx-2 whitespace-nowrap text-brand-fg hover:text-brand-fg text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                  >
                    {doc.status === "PAID" && basePath.includes("facturas") ? "Ver →" : "Abrir →"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </>
      )}
    </div>
  );
}
