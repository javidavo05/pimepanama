/**
 * Dinero de un proyecto en una sola tarjeta: presupuesto, facturado, cobrado y por cobrar, sus facturas
 * y el botón «Cobrar». Reemplaza los totales que solo miraban cuotas.
 */
import Link from "@/components/empresa/link";
import { dineroDeProyecto } from "@/lib/motor/cobros";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import type { DocumentStatus } from "@prisma/client";
import { BotonCobrar } from "./asistente-cobrar";

const usd = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (d: Date) => new Date(d).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Panama" });

export async function DineroProyecto({ userId, projectId, clientes, clienteId }: { userId: string; projectId: string; clientes: { id: string; nombre: string }[]; clienteId: string | null }) {
  const d = await dineroDeProyecto(userId, projectId);
  if (!d) return null;
  const pct = d.presupuesto > 0 ? Math.min(100, (d.cobrado / d.presupuesto) * 100) : 0;
  return (
    <section className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-fg text-base font-semibold tracking-tight">Dinero del proyecto</h2>
          <p className="text-fg-dim text-sm">{d.presupuesto > 0 ? `Cobrado ${Math.round(pct)} % de ${usd(d.presupuesto)}` : "Sin presupuesto: cárgalo con las fases y sus precios."}</p>
        </div>
        {clienteId ? (
          <BotonCobrar clientes={clientes} clienteInicial={clienteId} proyectoInicial={projectId} className="inline-flex items-center justify-center min-h-11 px-6 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hi" />
        ) : (
          <p className="text-warn text-sm">Asígnale un cliente para poder cobrar.</p>
        )}
      </div>
      {d.presupuesto > 0 && (
        <div className="h-2 rounded-full bg-fill-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Cobrado del presupuesto">
          <div className="h-full rounded-full bg-ok origin-left" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Presupuesto", d.presupuesto, "text-fg"], ["Facturado", d.facturado, "text-fg"], ["Cobrado", d.cobrado, "text-ok"], ["Por cobrar", d.porCobrar, d.porCobrar > 0 ? "text-warn" : "text-fg-dim"]].map(([k, v, c]) => (
          <div key={k as string} className="rounded-xl bg-fill px-4 py-3 min-w-0">
            <dt className="text-fg-dim text-xs">{k as string}</dt>
            <dd className={`text-sm font-semibold tabular-nums truncate ${c}`}>{usd(v as number)}</dd>
          </div>
        ))}
      </dl>
      {d.sinFacturar > 0.005 && <p className="text-fg-dim text-sm">Falta facturar <b className="text-fg tabular-nums">{usd(d.sinFacturar)}</b> del presupuesto.</p>}
      {d.facturas.length === 0 ? (
        <p className="text-fg-dim text-sm">Todavía no hay facturas. Toca «Cobrar» y elige la fase, el plan de pagos o un monto.</p>
      ) : (
        <ul className="divide-y divide-line">
          {d.facturas.map((f) => (
            <li key={f.id}>
              <Link href={`/empresa/facturas/${f.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                <span className="min-w-0">
                  <span className="block text-fg text-sm font-medium truncate">{f.number ?? "Factura"} · {f.title}</span>
                  <span className="block text-fg-dim text-xs">{fecha(f.issueDate)}{f.falta > 0.005 && f.status !== "DRAFT" ? ` · falta ${usd(f.falta)}` : ""}</span>
                </span>
                <span className="flex items-center gap-3"><span className="text-fg text-sm tabular-nums">{usd(f.total)}</span><StatusBadge status={f.status as DocumentStatus} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
