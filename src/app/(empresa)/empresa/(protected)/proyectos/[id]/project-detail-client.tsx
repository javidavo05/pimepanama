"use client";

import { useState } from "react";
import Link from "next/link";
import { markSchedulePaidAction } from "@/app/(empresa)/empresa/actions";

interface Schedule {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  reminderSent: boolean;
}

interface Document {
  id: string;
  type: string;
  number: string | null;
  status: string;
  total: number | null;
  issueDate: string;
  clientName: string | null;
  linkedDocumentId: string | null;
  paymentSchedules: Schedule[];
}

interface Contract {
  id: string;
  title: string;
  status: string;
  responsibilities: string | null;
  terms: string | null;
  value: number | null;
  startsAt: string | null;
  endsAt: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number | null;
  aiSummary: string | null;
  aiTags: string[];
  createdAt: string;
  client: { id: string; name: string; company: string | null } | null;
  contracts: Contract[];
  documents: Document[];
}

const CONTRACT_STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-white/[0.05] text-white/30 border-white/[0.08]",
  ACTIVE: "bg-green-500/15 text-green-400 border-green-500/20",
  EXPIRED: "bg-white/[0.05] text-white/40 border-white/[0.10]",
  TERMINATED: "bg-red-500/15 text-red-400 border-red-500/20",
};
const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", ACTIVE: "Activo", EXPIRED: "Vencido", TERMINATED: "Terminado",
};

const SCHEDULE_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  OVERDUE: "bg-red-500/15 text-red-400 border-red-500/20",
  PAID: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-white/[0.05] text-white/25 border-white/[0.08]",
};

const DOC_TYPE_PATH: Record<string, string> = {
  FACTURA: "facturas", COTIZACION: "cotizaciones", BITACORA: "bitacoras", CORREO: "correos",
};

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProjectDetailClient({ project }: { project: Project }) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  const allSchedules = project.documents.flatMap((d) => d.paymentSchedules);
  const totalScheduled = allSchedules.reduce((s, sc) => s + sc.amount, 0);
  const totalPaid = allSchedules.filter((s) => s.status === "PAID").reduce((s, sc) => s + sc.amount, 0);

  async function handleMarkPaid(id: string) {
    setPayingId(id);
    try {
      await markSchedulePaidAction(id);
      setPaidIds((prev) => new Set([...prev, id]));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main column */}
      <div className="lg:col-span-2 space-y-5">

        {/* Description / Scope */}
        {(project.description || project.scope) && (
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
            {project.description && (
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Descripción</p>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            {project.scope && (
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Alcance</p>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{project.scope}</p>
              </div>
            )}
            {project.aiSummary && (
              <div className="border-t border-white/[0.05] pt-4">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">Resumen IA</p>
                <p className="text-white/60 text-sm">{project.aiSummary}</p>
              </div>
            )}
          </div>
        )}

        {/* Documentos vinculados */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Documentos</h3>
            <Link href={`/empresa/cotizaciones/nueva?projectId=${project.id}`}
              className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors">
              + Cotización →
            </Link>
          </div>
          {project.documents.length === 0 ? (
            <div className="px-5 py-6 text-white/25 text-sm text-center">Sin documentos vinculados</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {project.documents.map((doc) => (
                <Link key={doc.id}
                  href={`/empresa/${DOC_TYPE_PATH[doc.type] ?? "facturas"}/${doc.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                  <div>
                    <span className="text-white/70 text-sm font-mono group-hover:text-[#1AA7F0] transition-colors">
                      {doc.number ?? doc.type}
                    </span>
                    <span className="text-white/30 text-xs ml-2">{doc.clientName}</span>
                    {doc.type === "COTIZACION" && doc.status === "ACCEPTED" && !doc.linkedDocumentId && (
                      <span className="ml-2 text-[10px] text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">⚠ Sin factura</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.total != null && (
                      <span className="text-white/50 text-sm font-mono">${fmtUSD(doc.total)}</span>
                    )}
                    <span className="text-white/25 text-[10px]">{new Date(doc.issueDate).toLocaleDateString("es-PA")}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Plan de pagos */}
        {allSchedules.length > 0 && (
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Plan de pagos</h3>
              <div className="text-right">
                <span className="text-[#C8A96E] text-xs font-mono">${fmtUSD(totalPaid)}</span>
                <span className="text-white/25 text-xs"> / ${fmtUSD(totalScheduled)}</span>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {allSchedules.map((sc) => {
                const isPaid = sc.status === "PAID" || paidIds.has(sc.id);
                const isOverdue = sc.status === "OVERDUE" && !isPaid;
                const dueDate = new Date(sc.dueDate);
                return (
                  <div key={sc.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-sm truncate">{sc.description}</p>
                      <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-400" : "text-white/30"}`}>
                        {isOverdue ? "Vencido — " : ""}{dueDate.toLocaleDateString("es-PA")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-white/60 text-sm font-mono">${fmtUSD(sc.amount)}</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded border ${SCHEDULE_STATUS_COLOR[isPaid ? "PAID" : sc.status]}`}>
                        {isPaid ? "Pagado" : sc.status === "OVERDUE" ? "Vencido" : sc.status === "PENDING" ? "Pendiente" : sc.status}
                      </span>
                      {!isPaid && sc.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleMarkPaid(sc.id)}
                          disabled={payingId === sc.id}
                          className="text-[10px] text-green-400/60 hover:text-green-400 transition-colors disabled:opacity-40">
                          ✓ Pagado
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Fechas y presupuesto */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-3">
          {project.totalBudget != null && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Presupuesto</p>
              <p className="text-[#C8A96E] font-mono text-lg font-semibold">${fmtUSD(project.totalBudget)}</p>
            </div>
          )}
          {project.startDate && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Inicio</p>
              <p className="text-white/60 text-sm">{new Date(project.startDate).toLocaleDateString("es-PA")}</p>
            </div>
          )}
          {project.endDate && (
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Fin estimado</p>
              <p className="text-white/60 text-sm">{new Date(project.endDate).toLocaleDateString("es-PA")}</p>
            </div>
          )}
          {project.aiTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-white/[0.05]">
              {project.aiTags.map((t) => (
                <span key={t} className="px-2 py-0.5 text-[10px] rounded border border-white/[0.08] text-white/30">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Contratos */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium">Contratos</p>
            <Link href={`/empresa/contratos/nuevo?projectId=${project.id}`}
              className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors">+ nuevo</Link>
          </div>
          {project.contracts.length === 0 ? (
            <div className="px-4 py-4 text-white/25 text-xs">Sin contratos</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {project.contracts.map((c) => (
                <Link key={c.id} href={`/empresa/contratos/${c.id}`}
                  className="block px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-white/70 text-sm truncate">{c.title}</p>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded border ${CONTRACT_STATUS_COLOR[c.status]}`}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  {c.value != null && (
                    <p className="text-[#C8A96E]/60 text-xs font-mono">${fmtUSD(c.value)}</p>
                  )}
                  {c.responsibilities && (
                    <p className="text-white/30 text-xs mt-1 truncate">{c.responsibilities}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
