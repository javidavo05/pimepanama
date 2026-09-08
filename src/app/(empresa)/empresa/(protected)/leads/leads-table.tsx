"use client";

import Link from "next/link";
import type { SerializedLead } from "@/lib/serializers";
import type { LeadStatus } from "@prisma/client";
import { LeadPriorityBadge } from "@/components/empresa/lead-priority-badge";
import { LEAD_STATUSES, leadStatusMeta } from "@/components/empresa/lead-status";

interface LeadsTableProps {
  leads: SerializedLead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  savingId: string | null;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "2-digit" });

export function LeadsTable({ leads, onStatusChange, savingId }: LeadsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      {/* La tabla scrollea dentro de su caja; la página nunca se va de ancho. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-widest text-fg-faint">
              <th className="px-4 py-3 font-medium">Prospecto</th>
              <th className="px-4 py-3 font-medium">Prioridad</th>
              <th className="px-4 py-3 font-medium">Etapa</th>
              <th className="px-4 py-3 font-medium">Por qué</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 text-right font-medium">Recibido</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-fill"
              >
                <td className="max-w-[260px] px-4 py-3">
                  <Link href={`/empresa/leads/${lead.id}`} className="block group">
                    <p className="truncate text-sm font-medium text-fg group-hover:text-fg">
                      {lead.name}
                    </p>
                    <p className="truncate text-xs text-fg-faint">
                      {lead.company || lead.email || "—"}
                    </p>
                  </Link>
                </td>

                <td className="px-4 py-3">
                  <LeadPriorityBadge priority={lead.priority} />
                </td>

                {/* Cambiar de etapa sin arrastrar: en una lista larga es más
                    rápido que el tablero, y funciona con teclado. */}
                <td className="px-4 py-3">
                  <select
                    value={lead.status}
                    disabled={savingId === lead.id}
                    onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                    aria-label={`Etapa de ${lead.name}`}
                    className={`cursor-pointer rounded border bg-transparent px-2 py-1 text-xs font-medium outline-none transition-colors disabled:opacity-50 ${leadStatusMeta(lead.status).className}`}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-pop text-fg">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="max-w-[320px] px-4 py-3">
                  <p className="truncate text-xs leading-relaxed text-fg-faint" title={lead.priorityReason ?? ""}>
                    {lead.priorityReason || "—"}
                  </p>
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-sand-fg">
                  {lead.estimatedValue != null
                    ? `$${lead.estimatedValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                    : "—"}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-fg-faint">
                  {fecha(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** En pantallas chicas la tabla no cabe: la misma data como lista de tarjetas. */
export function LeadsCardList({ leads }: { leads: SerializedLead[] }) {
  return (
    <div className="space-y-2">
      {leads.map((lead) => {
        const status = leadStatusMeta(lead.status);
        return (
          <Link
            key={lead.id}
            href={`/empresa/leads/${lead.id}`}
            className="block rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-mid"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{lead.name}</p>
                <p className="truncate text-xs text-fg-faint">{lead.company || lead.email || "—"}</p>
              </div>
              <LeadPriorityBadge priority={lead.priority} />
            </div>

            {lead.priorityReason && (
              <p className="mt-2 text-xs leading-relaxed text-fg-faint line-clamp-2">
                {lead.priorityReason}
              </p>
            )}

            <div className="mt-3 flex items-center gap-3">
              <span
                className={`rounded border px-2 py-1 text-[10px] font-medium uppercase tracking-widest ${status.className}`}
              >
                {status.label}
              </span>
              {lead.estimatedValue != null && (
                <span className="font-mono text-xs text-sand-fg">
                  ${lead.estimatedValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              )}
              <span className="ml-auto text-xs text-fg-ghost">{fecha(lead.createdAt)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
