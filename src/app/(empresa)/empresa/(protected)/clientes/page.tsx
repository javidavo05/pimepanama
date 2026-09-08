import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { computeClientStats } from "@/lib/client-stats";

export const metadata = { title: "Clientes — Pime Suite" };

export default async function ClientesPage() {
  const user = await getEmpresaUser();

  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: {
      documents: {
        where: { type: { in: ["COTIZACION", "FACTURA"] } },
        select: { type: true, status: true, total: true, netAmount: true },
      },
    },
  });

  const stats = clients.map((c) => ({
    ...c,
    ...computeClientStats(c.documents),
  }));

  const totalGross = stats.reduce((s, c) => s + c.gross, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-fg-dim text-sm mt-1">
            {clients.length} clientes · Ingresos (facturas pagadas):{" "}
            <span className="text-brand-fg font-mono">
              ${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <Link
          href="/empresa/cotizaciones/importar"
          className="px-4 py-2.5 bg-fill hover:bg-fill-2 border border-line text-fg-mute text-sm rounded-lg transition-all"
        >
          ↑ Importar cotización antigua
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-16 text-center">
          <p className="text-fg-dim text-sm">
            Los clientes se crean automáticamente al guardar cotizaciones o facturas con
            &ldquo;Guardar como nuevo cliente&rdquo;, o puedes agregarlos al importar cotizaciones antiguas.
          </p>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-line">
                {[
                  "Cliente",
                  "Empresa",
                  "Cotizaciones",
                  "Facturas",
                  "Pagadas",
                  "Ingresos brutos",
                  "Neto recibido",
                  "",
                ].map((h) => (
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
              {stats.map((c) => (
                <tr key={c.id} className="group hover:bg-fill transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-fg font-medium">{c.name}</p>
                    {c.email && <p className="text-fg-dim text-xs">{c.email}</p>}
                  </td>
                  <td className="px-5 py-4 text-fg-faint text-sm">{c.company ?? "—"}</td>
                  <td className="px-5 py-4 text-fg-faint font-mono text-sm">{c.totalQuotes}</td>
                  <td className="px-5 py-4 text-fg-faint font-mono text-sm">{c.totalInvoices}</td>
                  <td className="px-5 py-4">
                    <span className="text-ok font-mono text-sm">{c.paidInvoices}</span>
                    {c.totalInvoices > 0 && (
                      <span className="text-fg-faint text-xs ml-1">
                        ({Math.round((c.paidInvoices / c.totalInvoices) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-brand-fg font-mono text-sm">
                      ${c.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-ok font-mono text-sm">
                      ${c.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/empresa/clientes/${c.id}`}
                      className="text-fg-dim hover:text-fg-mute text-xs opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                    >
                      Ver historial →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
