/**
 * Gastos del proyecto (producto): cuánto cuesta este mes, en el año y lo que se paga cada mes, con los
 * últimos registrados. Se anotan en Por pagar con el proyecto ya elegido; si sus plataformas usan Vercel o
 * Supabase, se ofrecen como atajo con la categoría y el proveedor puestos.
 */
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { getCategoryLabel } from "@/lib/ledger";
import { fechaDeGasto, totalesGastos, type GastoMin } from "@/lib/gastos/totales";
import { dinero } from "@/lib/portal/datos";
import { fechaCorta } from "@/lib/format-datetime";
import type { ExpenseCategory } from "@prisma/client";

export type GastoFila = GastoMin & { id: string; category: ExpenseCategory };

export function GastosPanel({ projectId, gastos, atajos, principal }: { projectId: string; gastos: GastoFila[]; atajos: string[]; principal: boolean }) {
  const t = totalesGastos(gastos);
  const nuevo = (titulo?: string) => `/empresa/por-pagar?proyecto=${projectId}&nuevo=1${titulo ? `&titulo=${encodeURIComponent(titulo)}` : ""}`;
  const recientes = [...gastos].filter((g) => g.status !== "CANCELLED").sort((a, b) => fechaDeGasto(b).getTime() - fechaDeGasto(a).getTime()).slice(0, 8);
  return (
    <section id="gastos" tabIndex={-1} className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4 min-w-0 scroll-mt-4 outline-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-fg text-base font-semibold tracking-tight">Gastos del proyecto</h2>
          <p className="text-fg-dim text-sm">{t.cantidad ? `${t.cantidad} ${t.cantidad === 1 ? "gasto" : "gastos"}${t.pendiente > 0 ? ` · ${dinero(t.pendiente)} por pagar` : ""}` : "Lo que cuesta mantenerlo: hosting, base de datos, dominios y herramientas."}</p>
        </div>
        <Link href={nuevo()} className={`${principal ? btn.primary : btn.secondary} shrink-0`}>Registrar gasto de este proyecto</Link>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([["Este mes", t.mes], ["Este año", t.anio], ["Recurrente al mes", t.recurrenteMensual]] as const).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-fill px-4 py-3 min-w-0">
            <dt className="text-fg-dim text-xs">{k}</dt>
            <dd className={`text-sm font-semibold tabular-nums truncate ${v > 0 ? "text-fg" : "text-fg-faint"}`}>{dinero(v)}</dd>
          </div>
        ))}
      </dl>
      {recientes.length ? (
        <ul className="divide-y divide-line">
          {recientes.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-3 min-h-12">
              <span className="min-w-0 flex-1">
                <span className="block text-fg text-sm font-medium truncate">{g.title}{g.isRecurring ? <span className="text-brand-fg text-xs font-normal"> · cada mes</span> : null}</span>
                <span className="block text-fg-dim text-xs truncate">{[getCategoryLabel(g.category), g.vendor, fechaCorta(fechaDeGasto(g).toISOString()), g.status === "PENDING" ? "por pagar" : null].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="font-mono text-sm text-fg shrink-0">{dinero(g.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-dim text-sm">Todavía no hay gastos en este proyecto. Anota el primero y aquí verás cuánto cuesta al mes y al año.</p>
      )}
      {atajos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-fg-dim text-xs">Usa</span>
          {atajos.map((a) => (
            <Link key={a} href={nuevo(a)} className="inline-flex items-center min-h-11 sm:min-h-9 px-3 rounded-lg border border-line text-sm text-fg-mute hover:text-fg hover:border-line-mid">
              + {a}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
