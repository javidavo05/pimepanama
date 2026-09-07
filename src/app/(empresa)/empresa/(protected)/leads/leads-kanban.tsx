"use client";

import Link from "next/link";
import { useState } from "react";
import type { SerializedLead } from "@/lib/serializers";
import type { LeadStatus } from "@prisma/client";
import { LeadPriorityBadge, priorityRank } from "@/components/empresa/lead-priority-badge";
import { LEAD_STATUSES } from "@/components/empresa/lead-status";

interface LeadsKanbanProps {
  leads: SerializedLead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
}

/**
 * Vista de arrastrar y soltar. Sirve para mover unos pocos leads entre etapas;
 * para leer muchos de un vistazo está la tabla, que es la vista por defecto.
 */
export function LeadsKanban({ leads, onStatusChange }: LeadsKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {LEAD_STATUSES.map((col) => {
        const items = leads
          .filter((l) => l.status === col.value)
          .sort(
            (a, b) =>
              priorityRank(a.priority) - priorityRank(b.priority) ||
              +new Date(b.updatedAt) - +new Date(a.updatedAt)
          );

        return (
          <div
            key={col.value}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setDraggingId(null);
              if (id) onStatusChange(id, col.value);
            }}
            className="min-h-[200px] rounded-xl border border-white/[0.06] bg-[#0a0a10] p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span
                className={`text-xs font-medium uppercase tracking-widest ${col.className.split(" ").slice(1).join(" ")}`}
              >
                {col.label}
              </span>
              <span className="font-mono text-xs text-white/50">{items.length}</span>
            </div>

            <div className="space-y-2">
              {items.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", lead.id);
                    setDraggingId(lead.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={`cursor-grab rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 transition-all hover:border-white/[0.15] active:cursor-grabbing ${
                    draggingId === lead.id ? "opacity-40" : ""
                  }`}
                >
                  <Link href={`/empresa/leads/${lead.id}`} className="block">
                    <p className="truncate text-sm font-medium text-white/85">{lead.name}</p>
                    {lead.company && <p className="truncate text-xs text-white/55">{lead.company}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <LeadPriorityBadge priority={lead.priority} />
                      {lead.estimatedValue != null && (
                        <span className="truncate font-mono text-xs text-[#C8A96E]/70">
                          ${lead.estimatedValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-4 text-center text-xs text-white/40">Sin leads</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
