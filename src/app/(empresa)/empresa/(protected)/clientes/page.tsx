import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Clientes — Pime Suite" };

export default async function ClientesPage() {
  const user = await getEmpresaUser();

  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: {
      documents: {
        where: { type: "COTIZACION" },
        select: { status: true, total: true, netAmount: true },
      },
    },
  });

  const stats = clients.map((c) => {
    const accepted = c.documents.filter((d) => d.status === "ACCEPTED" || d.status === "PAID");
    const gross = accepted.reduce((s, d) => s + Number(d.total ?? 0), 0);
    const net = accepted.reduce((s, d) => s + Number(d.netAmount ?? d.total ?? 0), 0);
    return { ...c, totalQuotes: c.documents.length, accepted: accepted.length, gross, net };
  });

  const totalGross = stats.reduce((s, c) => s + c.gross, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-white/40 text-sm mt-1">
            {clients.length} clientes · Ingresos totales:{" "}
            <span className="text-[#1AA7F0] font-mono">
              ${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <Link
          href="/empresa/cotizaciones/importar"
          className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-white/70 text-sm rounded-lg transition-all"
        >
          ↑ Importar cotización antigua
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-16 text-center">
          <p className="text-white/30 text-sm">
            Los clientes se crean automáticamente al guardar cotizaciones con
            &ldquo;Guardar como nuevo cliente&rdquo; o puedes agregarlos al importar cotizaciones antiguas.
          </p>
        </div>
      ) : (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Cliente", "Empresa", "Cotizaciones", "Aceptadas", "Ingresos brutos", "Neto recibido", ""].map((h) => (
                  <th key={h} className="text-left text-white/40 text-xs uppercase tracking-widest font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats.map((c) => (
                <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-white font-medium">{c.name}</p>
                    {c.email && <p className="text-white/30 text-xs">{c.email}</p>}
                  </td>
                  <td className="px-5 py-4 text-white/50 text-sm">{c.company ?? "—"}</td>
                  <td className="px-5 py-4 text-white/50 font-mono text-sm">{c.totalQuotes}</td>
                  <td className="px-5 py-4">
                    <span className="text-green-400 font-mono text-sm">{c.accepted}</span>
                    {c.totalQuotes > 0 && (
                      <span className="text-white/20 text-xs ml-1">
                        ({Math.round((c.accepted / c.totalQuotes) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[#1AA7F0] font-mono text-sm">
                      ${c.gross.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-green-400 font-mono text-sm">
                      ${c.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/empresa/clientes/${c.id}`}
                      className="text-white/30 hover:text-white/70 text-xs opacity-0 group-hover:opacity-100 transition-all"
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
