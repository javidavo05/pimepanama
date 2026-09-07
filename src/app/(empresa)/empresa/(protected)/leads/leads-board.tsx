"use client";

import Link from "next/link";
import { useState } from "react";
import { updateLeadStatusAction } from "@/app/(empresa)/empresa/actions";
import type { SerializedLead } from "@/lib/serializers";
import type { LeadStatus } from "@prisma/client";
import { LeadPriorityBadge, priorityRank } from "@/components/empresa/lead-priority-badge";

interface LeadsBoardProps {
  leads: SerializedLead[];
}

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "NUEVO", label: "Nuevo", color: "border-white/[0.1] text-white/50" },
  { status: "CONTACTADO", label: "Contactado", color: "border-blue-500/25 text-blue-400" },
  { status: "COTIZANDO", label: "Cotizando", color: "border-[#C8A96E]/30 text-[#C8A96E]" },
  { status: "NEGOCIACION", label: "Negociación", color: "border-amber-500/30 text-amber-400" },
  { status: "GANADO", label: "Ganado", color: "border-green-500/30 text-green-400" },
  { status: "PERDIDO", label: "Perdido", color: "border-red-500/25 text-red-400" },
];

export function LeadsBoard({ leads: initialLeads }: LeadsBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function moveLead(id: string, status: LeadStatus) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;

    const previous = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));

    try {
      const updated = await updateLeadStatusAction(id, status);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      if (status === "GANADO" && !lead.convertedClientId) {
        setNotice(`"${lead.name}" se convirtió en cliente automáticamente.`);
        setTimeout(() => setNotice(null), 5000);
      }
    } catch {
      setLeads(previous);
    }
  }

  if (leads.length === 0) {
    return (
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl px-6 py-12 text-center">
        <p className="text-white/70 text-sm font-medium">Todavía no hay prospectos</p>
        <p className="text-white/50 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Cada solicitud del formulario de pimepanama.com entra aquí sola, con su prioridad ya
          clasificada. También podés cargar uno a mano.
        </p>
        <Link
          href="/empresa/leads/nuevo"
          className="inline-flex mt-6 px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all"
        >
          Cargar el primer lead
        </Link>
      </div>
    );
  }

  return (
    <div>
      {notice && (
        <div className="mb-4 bg-green-500/[0.08] border border-green-500/20 rounded-lg px-4 py-2.5 text-green-400 text-sm flex items-center justify-between">
          <span>✓ {notice}</span>
          <button onClick={() => setNotice(null)} className="text-green-400/50 hover:text-green-400">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const items = leads
            .filter((l) => l.status === col.status)
            .sort(
              (a, b) =>
                priorityRank(a.priority) - priorityRank(b.priority) ||
                +new Date(b.updatedAt) - +new Date(a.updatedAt)
            );
          return (
            <div
              key={col.status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setDraggingId(null);
                if (id) moveLead(id, col.status);
              }}
              className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-3 min-h-[200px]"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-xs font-medium uppercase tracking-widest ${col.color.split(" ")[1]}`}>
                  {col.label}
                </span>
                <span className="text-white/50 text-xs font-mono">{items.length}</span>
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
                    className={`bg-white/[0.03] border border-white/[0.07] rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-white/[0.15] transition-all ${draggingId === lead.id ? "opacity-40" : ""}`}
                  >
                    <Link href={`/empresa/leads/${lead.id}`} className="block">
                      {/* El nombre se queda con el ancho completo de la columna:
                          en la grilla de 6 columnas, un badge a su lado lo
                          recortaba a "Jamie It...". La prioridad baja a la fila
                          de metadatos, que casi siempre está vacía. */}
                      <p className="text-white/85 text-sm font-medium truncate">{lead.name}</p>
                      {lead.company && <p className="text-white/55 text-xs truncate">{lead.company}</p>}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <LeadPriorityBadge priority={lead.priority} />
                        <div className="flex items-center gap-2 min-w-0">
                          {lead.estimatedValue != null && (
                            <span className="text-[#C8A96E]/70 text-xs font-mono truncate">
                              ${lead.estimatedValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                            </span>
                          )}
                          {lead.nextFollowUpAt && (
                            <span className="text-white/50 text-[10px] shrink-0">
                              {new Date(lead.nextFollowUpAt).toLocaleDateString("es-PA")}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-white/50 text-xs text-center py-4">Sin leads</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
