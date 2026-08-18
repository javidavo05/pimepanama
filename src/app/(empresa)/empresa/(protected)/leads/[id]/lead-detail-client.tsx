"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateLeadStatusAction, updateLeadAction } from "@/app/(empresa)/empresa/actions";
import type { LeadStatus } from "@prisma/client";

interface LeadDocument {
  id: string;
  type: string;
  number: string | null;
  status: string;
  total: number | null;
  issueDate: string;
  title: string;
}

interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  source: string;
  status: LeadStatus;
  estimatedValue: number | null;
  notes: string | null;
  nextFollowUpAt: string | null;
  convertedClientId: string | null;
  convertedClient: { id: string; name: string } | null;
  documents: LeadDocument[];
}

const STATUS_OPTS: { value: LeadStatus; label: string; color: string }[] = [
  { value: "NUEVO", label: "Nuevo", color: "border-white/[0.1] text-white/50" },
  { value: "CONTACTADO", label: "Contactado", color: "border-blue-500/30 text-blue-400" },
  { value: "COTIZANDO", label: "Cotizando", color: "border-[#C8A96E]/30 text-[#C8A96E]" },
  { value: "NEGOCIACION", label: "Negociación", color: "border-amber-500/30 text-amber-400" },
  { value: "GANADO", label: "Ganado", color: "border-green-500/30 text-green-400" },
  { value: "PERDIDO", label: "Perdido", color: "border-red-500/30 text-red-400" },
];

const DOC_TYPE_PATH: Record<string, string> = {
  FACTURA: "facturas", COTIZACION: "cotizaciones", BITACORA: "bitacoras", CORREO: "correos",
};

export function LeadDetailClient({ lead: initialLead }: { lead: Lead }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  async function handleStatusChange(status: LeadStatus) {
    if (status === lead.status) return;
    setSavingStatus(true);
    try {
      const updated = await updateLeadStatusAction(lead.id, status);
      setLead((prev) => ({ ...prev, status: updated.status, convertedClientId: updated.convertedClientId }));
      if (status === "GANADO" && !lead.convertedClientId) {
        setNotice("Se creó un cliente automáticamente a partir de este lead.");
        router.refresh();
      }
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await updateLeadAction(lead.id, { notes });
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-semibold tracking-tight">{lead.name}</h1>
        {lead.company && <p className="text-white/60 text-sm mt-0.5">{lead.company}</p>}
      </div>

      {(notice || lead.convertedClientId) && (
        <div className="bg-green-500/[0.08] border border-green-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-green-400 text-sm">✓ {notice ?? "Este lead ya fue convertido a cliente."}</span>
          {lead.convertedClient && (
            <Link href={`/empresa/clientes/${lead.convertedClient.id}`} className="text-green-400/70 hover:text-green-400 text-xs font-medium">
              Ver perfil de cliente →
            </Link>
          )}
        </div>
      )}

      {/* Status */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">Etapa</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={savingStatus}
              onClick={() => handleStatusChange(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
                lead.status === opt.value ? `${opt.color} bg-white/[0.04]` : "border-white/[0.05] text-white/55 hover:text-white/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">Agendar seguimiento</h3>
        <a
          href={`/agendar?leadId=${lead.id}${lead.email ? `&email=${encodeURIComponent(lead.email)}` : ""}${lead.name ? `&name=${encodeURIComponent(lead.name)}` : ""}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex px-4 py-2 bg-[#C8A96E]/15 border border-[#C8A96E]/30 text-[#C8A96E] text-sm font-medium rounded-lg hover:bg-[#C8A96E]/20 transition-all"
        >
          Abrir PimeBook →
        </a>
      </div>

      {/* Info */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 grid grid-cols-2 gap-4">
        {lead.email && (
          <div><p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Correo</p><p className="text-white/70 text-sm">{lead.email}</p></div>
        )}
        {lead.phone && (
          <div><p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Teléfono</p><p className="text-white/70 text-sm">{lead.phone}</p></div>
        )}
        {(lead.address || lead.city) && (
          <div><p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Dirección</p><p className="text-white/70 text-sm">{[lead.address, lead.city].filter(Boolean).join(", ")}</p></div>
        )}
        {lead.estimatedValue != null && (
          <div><p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Valor estimado</p><p className="text-[#C8A96E] text-sm font-mono">${lead.estimatedValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div>
        )}
        {lead.nextFollowUpAt && (
          <div><p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Próximo seguimiento</p><p className="text-white/70 text-sm">{new Date(lead.nextFollowUpAt).toLocaleDateString("es-PA")}</p></div>
        )}
        <div><p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Fuente</p><p className="text-white/70 text-sm">{lead.source}</p></div>
      </div>

      {/* Notes */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Notas</h3>
          <button onClick={handleSaveNotes} disabled={savingNotes || notes === (lead.notes ?? "")}
            className="text-[#1AA7F0] text-xs font-medium hover:text-[#0E87C8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            {savingNotes ? "Guardando..." : "Guardar"}
          </button>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
          placeholder="Contexto, necesidades, próximos pasos..."
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
      </div>

      {/* Cotizaciones */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Cotizaciones</h3>
          <Link href={`/empresa/cotizaciones/nueva?leadId=${lead.id}`}
            className="px-3 py-1.5 bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 text-[#1AA7F0] text-xs font-medium rounded-lg hover:bg-[#1AA7F0]/15 transition-all">
            + Crear cotización
          </Link>
        </div>
        {lead.documents.length === 0 ? (
          <p className="text-white/50 text-sm text-center py-4">Sin cotizaciones aún</p>
        ) : (
          <div className="space-y-1.5">
            {lead.documents.map((doc) => (
              <Link key={doc.id} href={`/empresa/${DOC_TYPE_PATH[doc.type] ?? doc.type.toLowerCase()}/${doc.id}`}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
                <span className="text-white/60 text-sm group-hover:text-white/85">{doc.number ?? doc.title}</span>
                <div className="flex items-center gap-3">
                  {doc.total != null && <span className="text-white/55 text-xs font-mono">${doc.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                  <span className="px-1.5 py-0.5 rounded text-[9px] border border-white/10 text-white/60">{doc.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
