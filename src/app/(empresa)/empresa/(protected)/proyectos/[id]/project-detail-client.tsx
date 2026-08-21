"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Client } from "@prisma/client";
import { markSchedulePaidAction } from "@/app/(empresa)/empresa/actions";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { PdfPreviewFrame } from "@/components/empresa/document-builder/pdf-preview-frame";
import { FREQUENCY_ADJECTIVE } from "@/lib/financing";
import { ClientsPanel } from "./clients-panel";
import { ProjectEditForm } from "./project-edit-form";
import { DeliverablesPanel } from "./deliverables-panel";
import { ContractsPanel } from "./contracts-panel";
import {
  PROJECT_STATUS_COLOR,
  PROJECT_STATUS_LABEL,
  fmtUSD,
  type Project,
} from "./types";

const SCHEDULE_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  OVERDUE: "bg-red-500/15 text-red-400 border-red-500/20",
  PAID: "bg-green-500/15 text-green-400 border-green-500/20",
  CANCELLED: "bg-white/[0.05] text-white/50 border-white/[0.08]",
};

const DOC_TYPE_PATH: Record<string, string> = {
  FACTURA: "facturas", COTIZACION: "cotizaciones", BITACORA: "bitacoras", CORREO: "correos",
};

export function ProjectDetailClient({
  project,
  allClients,
}: {
  project: Project;
  allClients: Client[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const allSchedules = project.documents.flatMap((d) => d.paymentSchedules);
  const totalScheduled = allSchedules.reduce((s, sc) => s + sc.amount, 0);
  const totalPaid = allSchedules.filter((s) => s.status === "PAID").reduce((s, sc) => s + sc.amount, 0);
  const mainClient = project.clients[0] ?? null;
  const clientsPanel = (
    <ClientsPanel projectId={project.id} clients={project.clients} allClients={allClients} />
  );
  const plan = project.financingPlan;

  async function handleMarkPaid(id: string) {
    setPayingId(id);
    try {
      await markSchedulePaidAction(id);
      setPaidIds((prev) => new Set([...prev, id]));
    } finally {
      setPayingId(null);
    }
  }

  async function handleGenerateProposal() {
    setGeneratingProposal(true);
    setProposalError(null);
    try {
      const res = await fetch(`/api/empresa/projects/${project.id}/ai-expand-proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Error generando la propuesta");
      }
      router.refresh();
    } catch (err) {
      setProposalError(err instanceof Error ? err.message : "Error generando la propuesta");
    } finally {
      setGeneratingProposal(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-white text-2xl font-semibold tracking-tight truncate">{project.name}</h1>
            <span className={`px-2 py-0.5 text-xs rounded border shrink-0 ${PROJECT_STATUS_COLOR[project.status]}`}>
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
          </div>
          {project.clients.length === 0 ? (
            <p className="text-amber-400/80 text-sm">Sin cliente asignado</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {project.clients.map((c, i) => (
                <span key={c.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-white/25">·</span>}
                  <Link
                    href={`/empresa/clientes/${c.id}`}
                    className="text-white/60 hover:text-[#1AA7F0] transition-colors"
                  >
                    {c.name}{c.company ? ` — ${c.company}` : ""}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs font-medium rounded-lg hover:text-white hover:border-white/20 transition-all shrink-0"
          >
            Editar proyecto
          </button>
        )}
      </div>

      {editing && (
        <ProjectEditForm
          project={project}
          allClients={allClients}
          onClose={() => setEditing(false)}
        />
      )}

      {/* Sin cliente el proyecto no factura: el aviso va a ancho completo,
          no escondido en la barra lateral. */}
      {project.clients.length === 0 && (
        <div className="mb-5">{clientsPanel}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description / Scope */}
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
            {!project.description && !project.scope ? (
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-sm">Sin descripción ni alcance.</p>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors"
                >
                  + agregar
                </button>
              </div>
            ) : (
              <>
                {project.description && (
                  <div>
                    <p className="text-white/60 text-[10px] uppercase tracking-widest mb-2">Descripción</p>
                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
                  </div>
                )}
                {project.scope && (
                  <div>
                    <p className="text-white/60 text-[10px] uppercase tracking-widest mb-2">Alcance</p>
                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{project.scope}</p>
                  </div>
                )}
                {project.aiSummary && (
                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-white/60 text-[10px] uppercase tracking-widest mb-2">Resumen IA</p>
                    <p className="text-white/60 text-sm">{project.aiSummary}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Entregables */}
          <DeliverablesPanel projectId={project.id} deliverables={project.deliverables} />

          {/* Contratos */}
          <ContractsPanel
            projectId={project.id}
            projectName={project.name}
            clientId={mainClient?.id ?? null}
            defaults={{
              value: project.totalBudget,
              startsAt: project.startDate,
              endsAt: project.endDate,
              description: project.description,
            }}
            contracts={project.contracts}
          />

          {/* Propuesta comercial (PDF, estilo design-system) */}
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Propuesta comercial</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateProposal}
                  disabled={generatingProposal}
                  className="text-[#1AA7F0]/70 text-[10px] hover:text-[#1AA7F0] transition-colors disabled:opacity-40"
                >
                  {generatingProposal ? "Generando…" : project.hasProposal ? "↻ Regenerar con IA" : "✦ Generar con IA"}
                </button>
                {project.hasProposal && (
                  <PdfDownloadButton
                    url={`/api/empresa/projects/${project.id}/proposal-pdf`}
                    filename={`Propuesta-${project.name}.pdf`}
                    label="Descargar"
                  />
                )}
              </div>
            </div>
            {proposalError && (
              <div className="px-5 pb-4 text-red-400 text-xs">{proposalError}</div>
            )}
            {!project.hasProposal && (
              <div className="px-5 pb-5 text-white/50 text-sm">
                Genera el contenido de la propuesta con IA (portada, fases, inversión y cierre en el estilo de Pime) para poder descargarla.
              </div>
            )}
          </div>

          {project.hasProposal && (
            <PdfPreviewFrame
              url={`/api/empresa/projects/${project.id}/proposal-pdf`}
              refreshKey={project.updatedAt}
              title="Vista previa de la propuesta"
            />
          )}

          {/* Documentos vinculados */}
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Documentos</h3>
              <div className="flex items-center gap-3">
                <Link href={`/empresa/cotizaciones/nueva?projectId=${project.id}${mainClient ? `&clientId=${mainClient.id}` : ""}`}
                  className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors">
                  + Cotización
                </Link>
                <Link href={`/empresa/facturas/nueva?projectId=${project.id}${mainClient ? `&clientId=${mainClient.id}` : ""}`}
                  className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors">
                  + Factura
                </Link>
              </div>
            </div>
            {project.documents.length === 0 ? (
              <div className="px-5 py-6 text-white/50 text-sm text-center">Sin documentos vinculados</div>
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
                      <span className="text-white/55 text-xs ml-2">{doc.clientName}</span>
                      {doc.type === "COTIZACION" && doc.status === "ACCEPTED" && !doc.linkedDocumentId && (
                        <span className="ml-2 text-[10px] text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5">⚠ Sin factura</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.total != null && (
                        <span className="text-white/50 text-sm font-mono">${fmtUSD(doc.total)}</span>
                      )}
                      <span className="text-white/50 text-[10px]">{new Date(doc.issueDate).toLocaleDateString("es-PA")}</span>
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
                  <span className="text-white/50 text-xs"> / ${fmtUSD(totalScheduled)}</span>
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
                        <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-400" : "text-white/55"}`}>
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
          {project.clients.length > 0 && clientsPanel}

          {/* Fechas y presupuesto */}
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Resumen</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors"
              >
                editar
              </button>
            </div>
            <div>
              <p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Presupuesto</p>
              {project.totalBudget != null ? (
                <p className="text-[#C8A96E] font-mono text-lg font-semibold">${fmtUSD(project.totalBudget)}</p>
              ) : (
                <p className="text-white/35 text-sm">Sin definir</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Inicio</p>
                <p className="text-white/60 text-sm">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString("es-PA") : "—"}
                </p>
              </div>
              <div>
                <p className="text-white/55 text-[10px] uppercase tracking-widest mb-1">Fin estimado</p>
                <p className="text-white/60 text-sm">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString("es-PA") : "—"}
                </p>
              </div>
            </div>
            {project.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-white/[0.05]">
                {project.aiTags.map((t) => (
                  <span key={t} className="px-2 py-0.5 text-[10px] rounded border border-white/[0.08] text-white/55">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Financiación */}
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Financiación</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors"
              >
                {plan ? "editar" : "+ agregar"}
              </button>
            </div>
            {plan ? (
              <>
                <p className="text-white/70 text-sm">
                  Abono <span className="font-mono text-[#C8A96E]">${fmtUSD(plan.downPayment)}</span>
                  {" + "}
                  {plan.installments} cuotas {FREQUENCY_ADJECTIVE[plan.frequency]}
                </p>
                <p className="text-white/45 text-xs">
                  Total ${fmtUSD(plan.total)}
                  {plan.firstDueDate && ` · primera cuota ${new Date(plan.firstDueDate).toLocaleDateString("es-PA")}`}
                </p>
              </>
            ) : (
              <p className="text-white/35 text-sm">Sin plan de financiación.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
