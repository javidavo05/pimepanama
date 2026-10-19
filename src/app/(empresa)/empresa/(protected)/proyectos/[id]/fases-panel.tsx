import { prisma } from "@/lib/prisma";
import { avanceDeProyecto } from "@/lib/portal/avance";
import { dinero } from "@/lib/portal/datos";
import { AccesosCliente } from "@/components/empresa/clientes/accesos";
import { EnviarOrden, FaseFila, FaseForm, OrdenForm, SincronizarGithub, TipoProyecto } from "@/components/empresa/clientes/fases";

const ORDEN: Record<string, string> = { borrador: "Borrador", enviada: "Espera al cliente", aprobada: "Aprobada", rechazada: "No aprobada", cancelada: "Cancelada" };

const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";

/** Fases, avance y órdenes de cambio del proyecto: lo que alimenta la cuenta del cliente. Una sola ida a la base. */
export async function cargarFases(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true, kind: true, portalVisible: true, repoOwner: true, repoName: true, liveUrl: true,
      accesses: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true, username: true, notes: true, secretEnc: true } },
      phases: { orderBy: { sortOrder: "asc" }, include: { invoice: { select: { number: true } }, changeOrder: { select: { status: true } } } },
      changeOrders: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, title: true, status: true, total: true, decidedAt: true, decisionComment: true } },
    },
  });
}
type Fases = NonNullable<Awaited<ReturnType<typeof cargarFases>>>;

const vigentesDe = (p: Fases) => p.phases.filter((f) => !f.changeOrderId || f.changeOrder?.status === "aprobada");

/** Pestaña «Fases y entregables»: tipo y visibilidad, sincronía con GitHub y las fases con su precio. */
export function FasesPanel({ p }: { p: Fases }) {
  const vigentes = vigentesDe(p);
  const avance = avanceDeProyecto(vigentes);
  const total = vigentes.reduce((a, f) => a + Number(f.price), 0);
  return (
    <section className={`${card} space-y-6`}>
      <div className="min-w-0">
        <h2 className="text-fg text-base font-semibold tracking-tight">Fases, avance y cobro</h2>
        <p className="text-fg-dim text-sm">Lo que ve el cliente en su cuenta · {Math.round(avance)} % · {dinero(total)}</p>
      </div>
      <div id="tipo-proyecto" tabIndex={-1} className="scroll-mt-4 outline-none">
        <TipoProyecto projectId={p.id} kind={p.kind} portalVisible={p.portalVisible} />
      </div>
      <SincronizarGithub projectId={p.id} repo={p.repoOwner && p.repoName ? `${p.repoOwner}/${p.repoName}` : null} sinMarcador={vigentes.filter((f) => !f.githubMilestone && f.progressSource !== "sin_marcador" && f.status !== "hecha").length} />
      {vigentes.length ? (
        <ol className="space-y-3">
          {vigentes.map((f, i) => (
            <FaseFila key={f.id} projectId={p.id} indice={i} f={{ id: f.id, name: f.name, description: f.description, price: Number(f.price), billingPoint: f.billingPoint, status: f.status, progress: Number(f.progress), estimatedDays: f.estimatedDays, githubMilestone: f.githubMilestone, reviewUrl: f.reviewUrl, invoiceId: f.invoiceId, invoiceNumber: f.invoice?.number ?? null }} />
          ))}
        </ol>
      ) : <p className="text-sm text-fg-dim">Sin fases. Agrega las fases con su precio y cuándo se cobran: es lo que el cliente ve y lo que se factura.</p>}
      <details id="agregar-fase" tabIndex={-1} open={!vigentes.length} className="scroll-mt-4 rounded-xl border border-dashed border-line-mid outline-none">
        <summary className="flex items-center cursor-pointer p-4 text-sm font-semibold text-brand-fg min-h-11">+ Agregar fase</summary>
        <div className="p-4 pt-0"><FaseForm projectId={p.id} /></div>
      </details>
      <div id="acceso-cliente" className="space-y-3 border-t border-line pt-6">
        <div><h3 className="text-fg text-sm font-semibold">Acceso del cliente a su sistema</h3><p className="text-fg-dim text-xs">El enlace y los accesos aparecen en la ficha del proyecto en la cuenta del cliente. Las claves se guardan cifradas.</p></div>
        <AccesosCliente projectId={p.id} liveUrl={p.liveUrl} accesos={p.accesses.map((a) => ({ id: a.id, label: a.label, url: a.url, username: a.username, notes: a.notes, conClave: !!a.secretEnc }))} />
      </div>
    </section>
  );
}

/** Órdenes de cambio: cambian el precio del proyecto, por eso viven en la pestaña Dinero. */
export function OrdenesPanel({ p, ordenNueva, ticketId }: { p: Fases; ordenNueva?: boolean; ticketId?: string }) {
  return (
    <section id="ordenes" className={`${card} space-y-3 scroll-mt-4`}>
      <h2 className="text-fg text-base font-semibold tracking-tight">Órdenes de cambio</h2>
      {p.changeOrders.length > 0 ? (
        <ul className="divide-y divide-line">
          {p.changeOrders.map((o) => (
            <li key={o.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 text-sm"><span className="text-fg font-medium">{o.number} · {o.title}</span>{o.decisionComment && <span className="block text-xs text-fg-dim">Cliente: {o.decisionComment}</span>}</span>
              <span className="flex items-center gap-3 text-xs"><span className="font-mono text-fg">{dinero(o.total)}</span><span className="rounded-full bg-fill-2 px-2.5 py-1 font-semibold text-fg-dim">{ORDEN[o.status] ?? o.status}</span>{o.status === "borrador" && <EnviarOrden ordenId={o.id} />}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-dim">Sin órdenes de cambio. Si el cliente pide algo fuera del alcance, cotízalo aquí: al aprobarla, sus fases se suman al proyecto.</p>
      )}
      <OrdenForm projectId={p.id} ticketId={ticketId} abierta={ordenNueva} />
    </section>
  );
}
