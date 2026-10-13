"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/empresa/link";
import type { Client } from "@prisma/client";
import { markSchedulePaidAction } from "@/app/(empresa)/empresa/actions";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { PdfPreviewFrame } from "@/components/empresa/document-builder/pdf-preview-frame";
import { FREQUENCY_ADJECTIVE } from "@/lib/financing";
import { ClientsPanel } from "./clients-panel";
import { ProjectEditForm, type EditSection } from "./project-edit-form";
import { DeliverablesPanel } from "./deliverables-panel";
import { ContractsPanel } from "./contracts-panel";
import { RepoPanel } from "./repo-panel";
import type { EstadoRepo } from "@/lib/github/estado-repo";
import { FichaTabs, type FichaTab } from "@/components/empresa/clientes/ficha-tabs";
import { useTaskStore } from "@/components/empresa/tasks/task-store";
import {
  PROJECT_STATUS_COLOR,
  PROJECT_STATUS_LABEL,
  fmtUSD,
  type Project,
} from "./types";
import { ActionRow, btn } from "@/components/empresa/page-header";
import { fechaCorta } from "@/lib/format-datetime";

// Acciones de texto de las tarjetas (+ agregar, editar, + Factura…): en el
// celular crecen a 44 px de alto para el dedo; desde tablet vuelven a ser
// enlaces compactos.
const MINI_ACTION =
  "inline-flex items-center justify-center min-h-11 sm:min-h-8 px-2 sm:px-0 text-brand-fg text-xs sm:text-[10px] hover:text-brand-fg transition-colors disabled:opacity-40";

const SCHEDULE_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-info/15 text-info border-info/20",
  OVERDUE: "bg-danger/15 text-danger border-danger/20",
  PAID: "bg-ok/15 text-ok border-ok/20",
  CANCELLED: "bg-fill-2 text-fg-faint border-line",
};

const DOC_TYPE_PATH: Record<string, string> = {
  FACTURA: "facturas", COTIZACION: "cotizaciones", BITACORA: "bitacoras", CORREO: "correos",
};

/** Pestañas del detalle, en orden. «resumen» es la de entrada: sin ?tab= en la URL. */
export const PESTANAS = ["resumen", "tareas", "reuniones", "fases", "dinero", "facturas", "repo", "tickets", "clientes"] as const;
export type Tab = (typeof PESTANAS)[number];

export function ProjectDetailClient({
  project,
  allClients,
  initialTab,
  queLeFalta,
  alertas,
  repoInicial,
  counts,
  tasksPanel,
  reunionesPanel,
  fasesPanel,
  dineroPanel,
  facturasPanel,
  facturasCount = 0,
  ordenesPanel,
  horasPanel,
  repoExtra,
  ticketsPanel,
}: {
  project: Project;
  allClients: Client[];
  initialTab: string;
  /** Barra «Qué le falta» (va arriba de las pestañas). */
  queLeFalta: React.ReactNode;
  /** Estado del repo ya armado en el servidor (sin llamar a GitHub). */
  repoInicial?: EstadoRepo | null;
  /** Pestañas donde hay un requisito pendiente: llevan un punto de aviso. */
  alertas: Partial<Record<Tab, boolean>>;
  counts: { reuniones: number; tickets: number };
  tasksPanel: React.ReactNode;
  reunionesPanel: React.ReactNode;
  fasesPanel: React.ReactNode;
  /** Dinero del proyecto (servidor): presupuesto, facturado, cobrado, por cobrar y el botón «Cobrar». */
  dineroPanel?: React.ReactNode;
  /** Facturas del proyecto y las demás del cliente, con su PDF (servidor). */
  facturasPanel?: React.ReactNode;
  facturasCount?: number;
  ordenesPanel: React.ReactNode;
  horasPanel: React.ReactNode;
  /** Verificación con GitHub y plataformas (servidor). */
  repoExtra: React.ReactNode;
  ticketsPanel: React.ReactNode;
}) {
  const router = useRouter();
  const { tasks } = useTaskStore();
  const openTaskCount = tasks.filter((t) => t.projectId === project.id && !t.parentId && !t.completed).length;
  const [editing, setEditing] = useState<EditSection | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const allSchedules = project.documents.flatMap((d) => d.paymentSchedules);
  const totalScheduled = allSchedules.reduce((s, sc) => s + sc.amount, 0);
  const totalPaid = allSchedules.filter((s) => s.status === "PAID").reduce((s, sc) => s + sc.amount, 0);
  const mainClient = project.clients[0] ?? null;
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

  const tabs: FichaTab[] = [
    { key: "resumen", label: "Resumen" },
    { key: "tareas", label: "Tareas", count: openTaskCount },
    { key: "reuniones", label: "Reuniones", count: counts.reuniones, alert: alertas.reuniones },
    { key: "fases", label: "Fases y entregables", count: project.deliverables.filter((d) => !d.completed).length, alert: alertas.fases },
    { key: "dinero", label: "Dinero", alert: alertas.dinero },
    { key: "facturas", label: "Facturas", count: facturasCount },
    { key: "repo", label: "Repo y plataformas", alert: alertas.repo },
    { key: "tickets", label: "Tickets", count: counts.tickets },
    { key: "clientes", label: "Clientes", count: project.clients.length, alert: alertas.clientes },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <h1 className="text-fg text-2xl font-semibold tracking-tight truncate min-w-0">{project.name}</h1>
            <span className={`px-2 py-1 text-xs rounded border shrink-0 ${PROJECT_STATUS_COLOR[project.status]}`}>
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
          </div>
          {project.clients.length === 0 ? (
            <p className="text-warn text-sm">Sin cliente asignado</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {project.clients.map((c, i) => (
                <span key={c.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-fg-ghost">·</span>}
                  <Link
                    href={`/empresa/clientes/${c.id}`}
                    className="inline-flex items-center min-h-11 sm:min-h-8 text-fg-dim hover:text-brand-fg transition-colors"
                  >
                    {c.name}{c.company ? ` — ${c.company}` : ""}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
        {!editing && (
          <ActionRow>
            <button type="button" onClick={() => setEditing("form")} className={btn.secondary}>
              Editar proyecto
            </button>
          </ActionRow>
        )}
      </div>

      {editing && (
        <ProjectEditForm
          project={project}
          allClients={allClients}
          focusSection={editing}
          onClose={() => setEditing(null)}
        />
      )}


      {queLeFalta}

      <FichaTabs
        label="Secciones del proyecto"
        initial={initialTab}
        tabs={tabs}
        panels={{
          resumen: (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Description / Scope */}
          <div className="bg-panel border border-line rounded-xl p-6 space-y-4">
            {!project.description && !project.scope ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-fg-faint text-sm">Sin descripción ni alcance.</p>
                <button
                  type="button"
                  onClick={() => setEditing("form")}
                  className={MINI_ACTION}
                >
                  + agregar
                </button>
              </div>
            ) : (
              <>
                {project.description && (
                  <div>
                    <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-2">Descripción</p>
                    <p className="text-fg-mute text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
                  </div>
                )}
                {project.scope && (
                  <div>
                    <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-2">Alcance</p>
                    <p className="text-fg-mute text-sm leading-relaxed whitespace-pre-wrap">{project.scope}</p>
                  </div>
                )}
                {project.aiSummary && (
                  <div className="border-t border-line pt-4">
                    <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-2">Resumen IA</p>
                    <p className="text-fg-dim text-sm">{project.aiSummary}</p>
                  </div>
                )}
              </>
            )}
          </div>

              </div>
              <div className="space-y-4 min-w-0">
          {/* Fechas y presupuesto */}
          <div className="bg-panel border border-line rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-fg-faint text-[10px] uppercase tracking-widest">Resumen</p>
              <button
                type="button"
                onClick={() => setEditing("form")}
                className={MINI_ACTION}
              >
                editar
              </button>
            </div>
            <div>
              <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-1">Presupuesto</p>
              {project.totalBudget != null ? (
                <p className="text-sand-fg font-mono text-lg font-semibold">${fmtUSD(project.totalBudget)}</p>
              ) : (
                <p className="text-fg-ghost text-sm">Sin definir</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-1">Inicio</p>
                <p className="text-fg-dim text-sm">
                  {project.startDate ? fechaCorta(project.startDate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-fg-dim text-[10px] uppercase tracking-widest mb-1">Fin estimado</p>
                <p className="text-fg-dim text-sm">
                  {project.endDate ? fechaCorta(project.endDate) : "—"}
                </p>
              </div>
            </div>
            {project.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-line">
                {project.aiTags.map((t) => (
                  <span key={t} className="px-2 py-1 text-[10px] rounded border border-line text-fg-dim">{t}</span>
                ))}
              </div>
            )}
          </div>

              </div>
            </div>
          ),
          tareas: tasksPanel,
          facturas: facturasPanel,
          reuniones: reunionesPanel,
          fases: (
            <div className="space-y-6">
              {fasesPanel}
              <DeliverablesPanel projectId={project.id} deliverables={project.deliverables} />
            </div>
          ),
          dinero: (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6 min-w-0">
                {dineroPanel}
                <div id="acuerdos" tabIndex={-1} className="space-y-6 scroll-mt-4 outline-none">
          {/* Documentos vinculados */}
          <div className="bg-panel border border-line rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-2 sm:py-4 border-b border-line flex items-center justify-between gap-3">
              <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Documentos</h3>
              <div className="flex items-center gap-1 sm:gap-3">
                <Link href={`/empresa/cotizaciones/nueva?projectId=${project.id}${mainClient ? `&clientId=${mainClient.id}` : ""}`}
                  className={MINI_ACTION}>
                  + Cotización
                </Link>
              </div>
            </div>
            {project.documents.length === 0 ? (
              <div className="px-6 py-6 text-fg-faint text-sm text-center">Sin documentos vinculados</div>
            ) : (
              <div className="divide-y divide-line">
                {project.documents.map((doc) => (
                  <Link key={doc.id}
                    href={`/empresa/${DOC_TYPE_PATH[doc.type] ?? "facturas"}/${doc.id}`}
                    className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 hover:bg-fill transition-colors group">
                    <div className="min-w-0">
                      <span className="text-fg-mute text-sm font-mono group-hover:text-brand-fg transition-colors">
                        {doc.number ?? doc.type}
                      </span>
                      <span className="text-fg-dim text-xs ml-2">{doc.clientName}</span>
                      {doc.type === "COTIZACION" && doc.status === "ACCEPTED" && !doc.linkedDocumentId && (
                        <span className="ml-2 text-[10px] text-warn border border-warn/30 rounded px-2 py-1">⚠ Sin factura</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {doc.total != null && (
                        <span className="text-fg-faint text-sm font-mono">${fmtUSD(doc.total)}</span>
                      )}
                      <span className="text-fg-faint text-[10px]">{fechaCorta(doc.issueDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

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

                </div>
          {/* Plan de pagos */}
          {allSchedules.length > 0 && (
            <div className="bg-panel border border-line rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-line flex items-center justify-between gap-3">
                <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Plan de pagos</h3>
                <div className="text-right">
                  <span className="text-sand-fg text-xs font-mono">${fmtUSD(totalPaid)}</span>
                  <span className="text-fg-faint text-xs"> / ${fmtUSD(totalScheduled)}</span>
                </div>
              </div>
              <div className="divide-y divide-line">
                {allSchedules.map((sc) => {
                  const isPaid = sc.status === "PAID" || paidIds.has(sc.id);
                  const isOverdue = sc.status === "OVERDUE" && !isPaid;
                  const dueDate = new Date(sc.dueDate);
                  return (
                    <div key={sc.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 py-3">
                      <div className="flex-1 min-w-0 basis-40">
                        <p className="text-fg-mute text-sm truncate">{sc.description}</p>
                        <p className={`text-xs mt-1 ${isOverdue ? "text-danger" : "text-fg-dim"}`}>
                          {isOverdue ? "Vencido — " : ""}{fechaCorta(dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-fg-dim text-sm font-mono">${fmtUSD(sc.amount)}</span>
                        <span className={`px-2 py-1 text-[10px] rounded border ${SCHEDULE_STATUS_COLOR[isPaid ? "PAID" : sc.status]}`}>
                          {isPaid ? "Pagado" : sc.status === "OVERDUE" ? "Vencido" : sc.status === "PENDING" ? "Pendiente" : sc.status}
                        </span>
                        {!isPaid && sc.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(sc.id)}
                            disabled={payingId === sc.id}
                            className={`${MINI_ACTION} !text-ok`}>
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
                {ordenesPanel}
          {/* Propuesta comercial (PDF, estilo design-system) */}
          <div className="bg-panel border border-line rounded-xl overflow-hidden">
            {/* En el celular el título va arriba y los dos botones debajo, en
                columnas iguales; desde tablet, todo en una fila. */}
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Propuesta comercial</h3>
              <ActionRow>
                <button
                  type="button"
                  onClick={handleGenerateProposal}
                  disabled={generatingProposal}
                  className={btn.secondary}
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
              </ActionRow>
            </div>
            {proposalError && (
              <div className="px-6 pb-4 text-danger text-xs">{proposalError}</div>
            )}
            {!project.hasProposal && (
              <div className="px-6 pb-6 text-fg-faint text-sm">
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

              </div>
              <div className="space-y-4 min-w-0">
          {/* Financiación */}
          <div className="bg-panel border border-line rounded-xl p-6 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-fg-faint text-[10px] uppercase tracking-widest">Financiación</p>
              <button
                type="button"
                onClick={() => setEditing("financing")}
                className={MINI_ACTION}
              >
                {plan ? "editar" : "+ agregar"}
              </button>
            </div>
            {plan ? (
              <>
                <p className="text-fg-mute text-sm">
                  Abono <span className="font-mono text-sand-fg">${fmtUSD(plan.downPayment)}</span>
                  {" + "}
                  {plan.installments} cuotas {FREQUENCY_ADJECTIVE[plan.frequency]}
                </p>
                <p className="text-fg-faint text-xs">
                  Total ${fmtUSD(plan.total)}
                  {plan.firstDueDate && ` · primera cuota ${fechaCorta(plan.firstDueDate)}`}
                </p>
              </>
            ) : (
              <p className="text-fg-ghost text-sm">Sin plan de financiación.</p>
            )}
          </div>
                {horasPanel}
              </div>
            </div>
          ),
          repo: (
            <div className="space-y-6">
              <RepoPanel projectId={project.id} inicial={repoInicial} />
              {repoExtra}
            </div>
          ),
          tickets: ticketsPanel,
          clientes: (
            <div className="max-w-2xl">
              <ClientsPanel projectId={project.id} clients={project.clients} allClients={allClients} />
            </div>
          ),
        }}
      />
    </>
  );
}
