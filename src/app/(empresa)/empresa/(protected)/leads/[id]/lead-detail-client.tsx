"use client";

import { useState } from "react";
import Link from "@/components/empresa/link";
import { useRouter } from "next/navigation";
import { updateLeadStatusAction, updateLeadAction } from "@/app/(empresa)/empresa/actions";
import type { LeadStatus, LeadPriority } from "@prisma/client";
import { LEAD_PRIORITIES } from "@/components/empresa/lead-priority-badge";
import { DatosLeadForm } from "./datos-lead-form";
import { btn } from "@/components/empresa/page-header";

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
  priority: LeadPriority;
  priorityReason: string | null;
  estimatedValue: number | null;
  notes: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  etiquetas: string[];
  convertedClientId: string | null;
  convertedClient: { id: string; name: string } | null;
  documents: LeadDocument[];
}

const STATUS_OPTS: { value: LeadStatus; label: string; color: string }[] = [
  { value: "NUEVO", label: "Nuevo", color: "border-line-mid text-fg-faint" },
  { value: "CONTACTADO", label: "Contactado", color: "border-info/30 text-info" },
  { value: "COTIZANDO", label: "Cotizando", color: "border-sand/30 text-sand-fg" },
  { value: "NEGOCIACION", label: "Negociación", color: "border-warn/30 text-warn" },
  { value: "GANADO", label: "Ganado", color: "border-ok/30 text-ok" },
  { value: "PERDIDO", label: "Perdido", color: "border-danger/30 text-danger" },
];

const DOC_TYPE_PATH: Record<string, string> = {
  FACTURA: "facturas", COTIZACION: "cotizaciones", BITACORA: "bitacoras", CORREO: "correos",
};

export function LeadDetailClient({ lead: initialLead }: { lead: Lead }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingPriority, setSavingPriority] = useState(false);

  async function handlePriorityChange(priority: LeadPriority) {
    if (priority === lead.priority) return;
    const previous = lead;
    setLead((prev) => ({ ...prev, priority, priorityReason: null }));
    setSavingPriority(true);
    try {
      await updateLeadAction(lead.id, { priority });
    } catch {
      setLead(previous);
      setNotice(null);
    } finally {
      setSavingPriority(false);
    }
  }

  async function handleStatusChange(status: LeadStatus) {
    if (status === lead.status) return;
    setSavingStatus(true);
    try {
      const updated = await updateLeadStatusAction(lead.id, status);
      setLead((prev) => ({ ...prev, status: updated.status, convertedClientId: updated.convertedClientId }));
      if (status === "GANADO" && !lead.convertedClientId) {
        setNotice("Quedó como cliente: se usó el que ya tenía su correo o se creó uno nuevo con sus datos.");
        router.refresh();
      }
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-fg text-2xl font-semibold tracking-tight break-words">{lead.name}</h1>
          {lead.company && <p className="text-fg-dim text-sm mt-1 break-words">{lead.company}</p>}
        </div>
        <Link href={`/empresa/ventas/nueva?leadId=${lead.id}`} className={btn.primary}>Nueva oportunidad</Link>
      </div>

      {(notice || lead.convertedClientId) && (
        <div className="bg-ok/[0.08] border border-ok/20 rounded-lg px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-ok text-sm">✓ {notice ?? "Este lead ya fue convertido a cliente."}</span>
          {lead.convertedClient && (
            <Link href={`/empresa/clientes/${lead.convertedClient.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-ok hover:text-ok text-xs font-medium">
              Ver perfil de cliente →
            </Link>
          )}
        </div>
      )}

      {/* Status */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-4">Etapa</h3>
        {/* Cuadrícula de columnas iguales: los chips sueltos se partían en filas
            disparejas. Dos columnas en el celular, tres desde tablet. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={savingStatus}
              onClick={() => handleStatusChange(opt.value)}
              className={`min-h-11 sm:min-h-8 min-w-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
                lead.status === opt.value ? `${opt.color} bg-fill` : "border-line text-fg-dim hover:text-fg-dim"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prioridad */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-4">Prioridad</h3>
        <div className="grid grid-cols-3 gap-2">
          {LEAD_PRIORITIES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={savingPriority}
              onClick={() => handlePriorityChange(opt.value)}
              className={`min-h-11 sm:min-h-8 min-w-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
                lead.priority === opt.value
                  ? `${opt.className} bg-fill`
                  : "border-line text-fg-dim hover:text-fg-dim"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-fg-faint text-xs mt-4 leading-relaxed">
          {lead.priorityReason
            ? `Clasificada por IA — ${lead.priorityReason}`
            : "Definida a mano."}
        </p>
      </div>

      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-3">Agendar seguimiento</h3>
        <a
          href={`/agendar?leadId=${lead.id}${lead.email ? `&email=${encodeURIComponent(lead.email)}` : ""}${lead.name ? `&name=${encodeURIComponent(lead.name)}` : ""}`}
          target="_blank"
          rel="noreferrer"
          className="flex sm:inline-flex items-center justify-center min-h-11 sm:min-h-8 px-4 py-2 bg-sand/15 border border-sand/30 text-sand-fg text-sm font-medium rounded-lg hover:bg-sand/20 transition-all"
        >
          Abrir PimeBook →
        </a>
      </div>

      {/* Datos: todo se edita aquí (contacto, valor, seguimiento, motivo de pérdida, etiquetas y notas). */}
      <div className="bg-panel border border-line rounded-xl p-4 sm:p-6">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-1">Datos del lead</h3>
        <p className="text-fg-faint text-xs mb-4">Lo que cambies aquí se copia al cliente cuando el lead se gana.</p>
        <DatosLeadForm lead={lead} />
      </div>

      {/* Cotizaciones */}
      <div className="bg-panel border border-line rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Cotizaciones</h3>
          <Link href={`/empresa/cotizaciones/nueva?leadId=${lead.id}`}
            className="inline-flex items-center justify-center min-h-11 sm:min-h-8 px-3 py-1.5 bg-brand/10 border border-brand/25 text-brand-fg text-xs font-medium rounded-lg hover:bg-brand/15 transition-all">
            + Crear cotización
          </Link>
        </div>
        {lead.documents.length === 0 ? (
          <p className="text-fg-faint text-sm text-center py-4">Sin cotizaciones aún</p>
        ) : (
          <div className="space-y-1.5">
            {lead.documents.map((doc) => (
              <Link key={doc.id} href={`/empresa/${DOC_TYPE_PATH[doc.type] ?? doc.type.toLowerCase()}/${doc.id}`}
                className="flex items-center justify-between gap-2 px-3 py-2 min-h-11 sm:min-h-8 rounded-lg hover:bg-fill transition-colors group">
                <span className="text-fg-dim text-sm group-hover:text-fg truncate min-w-0">{doc.number ?? doc.title}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {doc.total != null && <span className="text-fg-dim text-xs font-mono">${doc.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                  <span className="px-1.5 py-0.5 rounded text-[9px] border border-line-mid text-fg-dim">{doc.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
