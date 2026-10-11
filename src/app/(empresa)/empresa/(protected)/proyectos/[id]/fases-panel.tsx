import { prisma } from "@/lib/prisma";
import { avanceDeProyecto } from "@/lib/portal/avance";
import { dinero } from "@/lib/portal/datos";
import { EnviarOrden, FaseFila, FaseForm, OrdenForm, TipoProyecto } from "@/components/empresa/clientes/fases";

const ORDEN: Record<string, string> = { borrador: "Borrador", enviada: "Espera al cliente", aprobada: "Aprobada", rechazada: "No aprobada", cancelada: "Cancelada" };

/** Fases, avance y órdenes de cambio del proyecto: lo que alimenta la cuenta del cliente. */
export async function FasesPanel({ projectId, userId, ordenNueva, ticketId }: { projectId: string; userId: string; ordenNueva?: boolean; ticketId?: string }) {
  const p = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true, kind: true, portalVisible: true,
      phases: { orderBy: { sortOrder: "asc" }, include: { invoice: { select: { number: true } }, changeOrder: { select: { status: true } } } },
      changeOrders: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, title: true, status: true, total: true, decidedAt: true, decisionComment: true } },
    },
  });
  if (!p) return null;
  const vigentes = p.phases.filter((f) => !f.changeOrderId || f.changeOrder?.status === "aprobada");
  const avance = avanceDeProyecto(vigentes);
  const total = vigentes.reduce((a, f) => a + Number(f.price), 0);
  return (
    <details open className="group mb-6 rounded-2xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-6 min-h-14">
        <span><span className="block text-fg text-base font-semibold">Fases, avance y cobro</span><span className="block text-fg-dim text-sm">Lo que ve el cliente en su cuenta · {Math.round(avance)} % · {dinero(total)}</span></span>
        <span className="text-fg-faint text-sm group-open:rotate-180 transition-transform" aria-hidden>⌄</span>
      </summary>
      <div className="space-y-6 border-t border-line p-4 sm:p-6">
        <TipoProyecto projectId={p.id} kind={p.kind} portalVisible={p.portalVisible} />
        {vigentes.length ? (
          <ol className="space-y-3">
            {vigentes.map((f, i) => (
              <FaseFila key={f.id} projectId={p.id} indice={i} f={{ id: f.id, name: f.name, description: f.description, price: Number(f.price), billingPoint: f.billingPoint, status: f.status, progress: Number(f.progress), estimatedDays: f.estimatedDays, githubMilestone: f.githubMilestone, invoiceId: f.invoiceId, invoiceNumber: f.invoice?.number ?? null }} />
            ))}
          </ol>
        ) : <p className="text-sm text-fg-dim">Sin fases. Agrega las fases con su precio y cuándo se cobran: es lo que el cliente ve y lo que se factura.</p>}
        <details className="rounded-xl border border-dashed border-line-mid"><summary className="cursor-pointer p-4 text-sm font-semibold text-brand-fg min-h-11">+ Agregar fase</summary><div className="p-4 pt-0"><FaseForm projectId={p.id} /></div></details>
        <div id="ordenes" className="space-y-3 border-t border-line pt-6">
          <p className="text-fg text-sm font-semibold">Órdenes de cambio</p>
          {p.changeOrders.length > 0 && (
            <ul className="divide-y divide-line">
              {p.changeOrders.map((o) => (
                <li key={o.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 text-sm"><span className="text-fg font-medium">{o.number} · {o.title}</span>{o.decisionComment && <span className="block text-xs text-fg-dim">Cliente: {o.decisionComment}</span>}</span>
                  <span className="flex items-center gap-3 text-xs"><span className="font-mono text-fg">{dinero(o.total)}</span><span className="rounded-full bg-fill-2 px-2.5 py-1 font-semibold text-fg-dim">{ORDEN[o.status] ?? o.status}</span>{o.status === "borrador" && <EnviarOrden ordenId={o.id} />}</span>
                </li>
              ))}
            </ul>
          )}
          <OrdenForm projectId={p.id} ticketId={ticketId} abierta={ordenNueva} />
        </div>
      </div>
    </details>
  );
}
