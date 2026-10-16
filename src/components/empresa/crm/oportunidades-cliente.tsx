/**
 * Oportunidades de un cliente (o de un lead) con el acceso a crear una nueva. Componente de servidor: carga
 * sus propios datos, así se pone en la ficha del cliente con una línea:
 *   <OportunidadesCliente clientId={cliente.id} />
 */
import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { btn } from "@/components/empresa/page-header";
import { cierreVencido, fechaLegible, pronosticoPonderado, usd } from "@/lib/crm/embudo";

export async function OportunidadesCliente({ clientId, leadId }: { clientId?: string; leadId?: string }) {
  if (!clientId && !leadId) return null;
  const u = await getEmpresaUser();
  const ops = await prisma.oportunidad.findMany({
    where: { userId: u.id, ...(clientId ? { clientId } : { leadId }) },
    orderBy: [{ estado: "asc" }, { updatedAt: "desc" }],
    take: 30,
    select: { id: true, titulo: true, valor: true, probabilidad: true, estado: true, cierreEsperado: true, motivoPerdida: true, etapa: { select: { nombre: true } } },
  });
  const nueva = `/empresa/ventas/nueva?${clientId ? `clientId=${clientId}` : `leadId=${leadId}`}`;
  const abiertas = ops.filter((o) => o.estado === "abierta");
  const ponderado = pronosticoPonderado(ops.map((o) => ({ valor: Number(o.valor), probabilidad: o.probabilidad, estado: o.estado })));

  return (
    <section className="rounded-xl border border-line bg-panel p-4 sm:p-6" aria-labelledby={`ops-${clientId ?? leadId}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={`ops-${clientId ?? leadId}`} className="text-sm font-semibold text-fg">Oportunidades</h2>
          <p className="mt-1 text-xs text-fg-dim">
            {abiertas.length > 0 ? `${abiertas.length} en curso · pronóstico ${usd(ponderado)}` : "Negocios posibles con su valor y etapa en el embudo."}
          </p>
        </div>
        <Link href={nueva} className={btn.secondary}>Nueva oportunidad</Link>
      </div>
      {ops.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-fg-dim">
          Sin oportunidades todavía. Crea una cuando haya un negocio posible para que entre al pronóstico de ventas.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {ops.map((o) => {
            const vencido = cierreVencido(o.cierreEsperado, o.estado);
            return (
              <li key={o.id}>
                <Link href={`/empresa/ventas/${o.id}`} className="flex min-h-11 flex-col gap-1 py-3 hover:bg-fill sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg [overflow-wrap:anywhere]">{o.titulo}</span>
                    <span className={`block text-xs ${o.estado === "ganada" ? "text-ok" : o.estado === "perdida" ? "text-danger" : "text-fg-dim"}`}>
                      {o.etapa.nombre}
                      {o.estado === "abierta" && ` · ${o.probabilidad} %`}
                      {o.estado === "perdida" && o.motivoPerdida ? ` · ${o.motivoPerdida}` : ""}
                      {o.estado === "abierta" && o.cierreEsperado ? <span className={vencido ? "font-semibold text-danger" : ""}> · {vencido ? "venció" : "cierra"} {fechaLegible(o.cierreEsperado)}</span> : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-sand-fg">{usd(o.valor)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
