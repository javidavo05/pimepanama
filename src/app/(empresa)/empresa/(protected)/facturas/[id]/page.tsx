import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeDocument, serializePaymentMethod } from "@/lib/serializers";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { PdfPreviewFrame } from "@/components/empresa/document-builder/pdf-preview-frame";
import { InvoiceStatusControl } from "@/components/empresa/invoice-status-control";
import { CollapsibleCard } from "@/components/empresa/collapsible-card";
import { CollectRow } from "@/components/empresa/collect-row";
import { PipelineStatus } from "@/components/empresa/pipeline-status";
import { LinkCotizacionPanel } from "@/components/empresa/link-cotizacion-panel";
import { LinkContractPanel } from "@/components/empresa/link-contract-panel";
import { CreateRetroactiveLeadButton } from "@/components/empresa/create-retroactive-lead-button";
import { DocumentAuditHistory } from "@/components/empresa/document-audit-history";
import { computeQuoteBalance } from "@/lib/quote-balance";
import { QuoteBalanceBanner } from "@/components/empresa/quote-balance-banner";
import { FacturaBuilder } from "../nueva/factura-builder";

function money(currency: string, n: number) {
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function FacturaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { id } = await params;
  const { editar } = await searchParams;
  const user = await getEmpresaUser();

  // clients y paymentMethods solo los usa el formulario de edición.
  const isEditing = editar === "1";

  const [doc, clients, paymentMethods] = await Promise.all([
    prisma.document.findFirst({
      where: { id, userId: user.id, type: "FACTURA" },
      include: {
        paymentMethod: { select: { name: true } },
        linkedDocument: { select: { id: true, number: true, status: true, total: true, projectId: true, project: { select: { id: true, name: true, status: true } } } },
        project: { select: { id: true, name: true, status: true } },
      },
    }),
    isEditing
      ? prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    isEditing
      ? prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  if (!doc) notFound();

  // Sin sync aquí: los saldos ya se concilian al registrar un cobro y al abrir
  // Cuentas por Cobrar. Hacerlo en cada visita costaba ~2 s de viajes al pooler.
  const total = Number(doc.total ?? 0);
  const paid = Number(doc.amountPaid ?? 0);
  const outstanding = Math.max(0, Math.round((total - paid) * 100) / 100);
  const isPaid = doc.status === "PAID";
  const isClosed = doc.status === "CANCELLED" || doc.status === "REJECTED";
  const canCollect = !isPaid && !isClosed && total > 0;

  const cotizacion = doc.linkedDocument;
  const project = doc.project ?? cotizacion?.project ?? null;
  const quoteBalance = cotizacion ? computeQuoteBalance(Number(cotizacion.total ?? 0), doc) : null;

  // En paralelo: en serie eran tres viajes de ~600 ms cada uno.
  const [unlinkedCotizaciones, availableContracts, auditLogs] = await Promise.all([
    doc.linkedDocumentId
      ? Promise.resolve([])
      : prisma.document.findMany({
          where: {
            userId: user.id,
            type: "COTIZACION",
            linkedDocumentId: null,
            ...(doc.clientId ? { clientId: doc.clientId } : {}),
          },
          select: { id: true, number: true, clientName: true, total: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
    doc.contractId
      ? Promise.resolve([])
      : prisma.contract.findMany({
          where: { userId: user.id, ...(doc.clientId ? { clientId: doc.clientId } : {}) },
          select: { id: true, title: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
    prisma.documentAuditLog.findMany({
      where: { documentId: doc.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const content = doc.content as {
    lineItems?: Array<{ description: string; quantity: number; unitPrice: number; taxPercent: number; discount: number }>;
    notes?: string;
  };

  const pendingLinks =
    (!doc.linkedDocumentId ? 1 : 0) + (!doc.contractId ? 1 : 0) + (!doc.leadId ? 1 : 0);

  // ── Modo edición ───────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/empresa/facturas/${doc.id}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fill hover:bg-fill-2 border border-line text-fg-dim hover:text-fg text-sm transition-all"
          >
            ← Volver a la factura
          </Link>
          <span className="text-fg-ghost font-mono text-sm">{doc.number ?? id}</span>
        </div>
        <FacturaBuilder
          taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
          currency={user.config?.currency ?? "USD"}
          clients={clients}
          paymentMethods={paymentMethods.map(serializePaymentMethod)}
          mode="edit"
          initialDocument={serializeDocument(doc)}
        />
      </div>
    );
  }

  // ── Vista de lectura ───────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Barra de acciones — todo lo importante arriba y siempre a la vista */}
      <div className="sticky top-16 md:top-4 z-30 bg-pop/95 backdrop-blur-md border border-line rounded-xl px-4 py-3 shadow-lg shadow-black/40">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/empresa/facturas" className="text-fg-faint hover:text-fg-soft text-sm transition-colors">
            ← Facturas
          </Link>
          <h1 className="text-fg text-lg font-semibold tracking-tight font-mono">{doc.number ?? "Factura"}</h1>

          <InvoiceStatusControl documentId={doc.id} currentStatus={doc.status} />

          {canCollect && (
            <CollectRow
              kind="invoice"
              documentId={doc.id}
              scheduleId={null}
              outstanding={outstanding}
              currency={doc.currency}
              willCreateInvoice={false}
            />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Link
              href={`/empresa/facturas/${doc.id}?editar=1`}
              className="px-3 py-2 rounded-lg bg-fill hover:bg-fill-2 border border-line text-fg-dim hover:text-fg text-sm transition-all"
            >
              ✎ Editar
            </Link>
            <PdfDownloadButton documentId={doc.id} filename={`${doc.number ?? "factura"}.pdf`} />
          </div>

        </div>
      </div>

      {/* Cliente + montos */}
      <div className="bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-fg-faint text-[10px] uppercase tracking-widest mb-1">Cliente</p>
            <p className="text-fg font-medium">{doc.clientName ?? "—"}</p>
            {doc.clientCompany && <p className="text-fg-faint text-sm">{doc.clientCompany}</p>}
            {doc.clientRuc && <p className="text-fg-faint text-xs mt-1">RUC: {doc.clientRuc}</p>}
          </div>
          <div className="text-right">
            <p className="text-fg-faint text-[10px] uppercase tracking-widest mb-1">Emitida</p>
            <p className="text-fg-mute text-sm">{new Date(doc.issueDate).toLocaleDateString("es-PA")}</p>
            {doc.dueDate && (
              <>
                <p className="text-fg-faint text-[10px] uppercase tracking-widest mt-2 mb-1">
                  {paid > 0 && !isPaid ? "Vence el saldo" : "Vence"}
                </p>
                <p className="text-fg-mute text-sm">{new Date(doc.dueDate).toLocaleDateString("es-PA")}</p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-line">
          <div>
            <p className="text-fg-faint text-[10px] uppercase tracking-widest mb-1.5">Total</p>
            <p className="text-sand-fg font-mono text-xl font-semibold">{money(doc.currency, total)}</p>
          </div>
          <div>
            <p className="text-fg-faint text-[10px] uppercase tracking-widest mb-1.5">Cobrado</p>
            <p className={`font-mono text-xl font-semibold ${paid > 0 ? "text-ok" : "text-fg-ghost"}`}>
              {money(doc.currency, paid)}
            </p>
          </div>
          <div>
            <p className="text-fg-faint text-[10px] uppercase tracking-widest mb-1.5">Saldo</p>
            <p className={`font-mono text-xl font-semibold ${outstanding > 0 ? "text-warn" : "text-fg-ghost"}`}>
              {money(doc.currency, outstanding)}
            </p>
          </div>
        </div>

        {doc.paymentMethod?.name && (
          <p className="text-fg-faint text-xs mt-4">Método de pago: {doc.paymentMethod.name}</p>
        )}
        {doc.netAmount != null && Number(doc.netAmount) !== total && (
          <p className="text-ok font-mono text-xs mt-1">
            Neto tras comisión: {money(doc.currency, Number(doc.netAmount))}
          </p>
        )}

        {isClosed && (
          <p className="text-fg-faint text-xs mt-4 bg-fill border border-line rounded-lg px-3 py-2">
            Factura {doc.status === "CANCELLED" ? "cancelada" : "rechazada"} — fuera de Cuentas por Cobrar.
          </p>
        )}
        {outstanding > 0 && !isClosed && (
          <p className="text-warn text-xs mt-4">
            Saldo vivo en{" "}
            <Link href="/empresa/cuentas-por-cobrar" className="underline hover:text-warn-soft">
              Cuentas por Cobrar
            </Link>
            .
          </p>
        )}
      </div>

      {quoteBalance && (
        <QuoteBalanceBanner balance={quoteBalance} quoteNumber={cotizacion?.number} invoiceNumber={doc.number} />
      )}

      <PipelineStatus
        current="factura"
        project={
          project
            ? { id: project.id, label: project.name, status: project.status, href: `/empresa/proyectos/${project.id}` }
            : null
        }
        cotizacion={
          cotizacion
            ? {
                id: cotizacion.id,
                label: cotizacion.number ?? "Cotización",
                status: cotizacion.status,
                amount: cotizacion.total != null ? Number(cotizacion.total) : null,
                href: `/empresa/cotizaciones/${cotizacion.id}`,
              }
            : null
        }
        factura={{ id: doc.id, label: doc.number ?? "Factura", status: doc.status, amount: total }}
        collection={total > 0 ? { total, collected: paid, currency: doc.currency } : null}
        actions={{
          project: project ? null : "/empresa/proyectos/nuevo",
          cotizacion: cotizacion ? null : `/empresa/facturas/${doc.id}`,
        }}
      />

      {/* Detalle */}
      {(content.lineItems?.length ?? 0) > 0 && (
        <div className="bg-panel border border-line rounded-xl p-5">
          <p className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-3">Detalle</p>
          <div className="space-y-2">
            {content.lineItems?.map((item, i) => {
              const qty = Number(item.quantity) || 0;
              const price = Number(item.unitPrice) || 0;
              const disc = Number(item.discount) || 0;
              const tax = Number(item.taxPercent) || 0;
              const lineTotal = qty * price * (1 - disc / 100) * (1 + tax / 100);
              return (
                <div key={i} className="flex justify-between gap-4 text-sm border-b border-line pb-2 last:border-0">
                  <span className="text-fg-mute">{item.description || "—"}</span>
                  <span className="text-fg-faint font-mono shrink-0">
                    {lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
          {content.notes && (
            <p className="text-fg-dim text-xs whitespace-pre-line mt-4 pt-4 border-t border-line">
              {content.notes}
            </p>
          )}
        </div>
      )}

      {/* Secundario — plegado para que no empuje lo importante */}
      <CollapsibleCard title="Vista previa del PDF">
        <PdfPreviewFrame url={`/api/empresa/documents/${doc.id}/pdf`} refreshKey={doc.updatedAt.toISOString()} />
      </CollapsibleCard>

      {pendingLinks > 0 && (
        <CollapsibleCard
          title="Vínculos"
          meta={`${pendingLinks} sin vincular`}
        >
          <div className="space-y-3 pt-2">
            {!doc.linkedDocumentId && (
              <LinkCotizacionPanel
                facturaId={doc.id}
                cotizaciones={unlinkedCotizaciones.map((c) => ({ ...c, total: c.total != null ? Number(c.total) : null }))}
              />
            )}
            {!doc.contractId && (
              <LinkContractPanel
                documentId={doc.id}
                contracts={availableContracts}
                createHref={`/empresa/contratos/nuevo?${new URLSearchParams({
                  ...(doc.clientId ? { clientId: doc.clientId } : {}),
                  ...(doc.projectId ? { projectId: doc.projectId } : {}),
                  linkDocumentId: doc.id,
                  returnTo: `/empresa/facturas/${doc.id}`,
                }).toString()}`}
              />
            )}
            {!doc.leadId && (
              <div className="bg-fill border border-line rounded-xl p-4 flex items-center justify-between gap-4">
                <p className="text-fg-dim text-xs">Sin lead vinculado — útil para el historial del pipeline de CRM.</p>
                <CreateRetroactiveLeadButton documentId={doc.id} />
              </div>
            )}
          </div>
        </CollapsibleCard>
      )}

      {auditLogs.length > 0 && (
        <CollapsibleCard title="Historial de cambios" meta={`${auditLogs.length}`}>
          <div className="pt-3">
            <DocumentAuditHistory bare logs={auditLogs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))} />
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
}
