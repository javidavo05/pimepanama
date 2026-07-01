import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeDocument, serializePaymentMethod } from "@/lib/serializers";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { DocumentStatusPicker } from "@/components/empresa/document-status-picker";
import { FacturaClientLinker } from "@/components/empresa/factura-client-linker";
import { MarkPaidButton } from "@/components/empresa/mark-paid-button";
import { ReopenDraftButton } from "@/components/empresa/reopen-draft-button";
import { PipelineStatus } from "@/components/empresa/pipeline-status";
import { LinkCotizacionPanel } from "@/components/empresa/link-cotizacion-panel";
import { FacturaBuilder } from "../nueva/factura-builder";

export default async function FacturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const [doc, clients, paymentMethods] = await Promise.all([
    prisma.document.findFirst({
      where: { id, userId: user.id, type: "FACTURA" },
      include: {
        paymentMethod: { select: { name: true } },
        linkedDocument: { select: { id: true, number: true, status: true, projectId: true, project: { select: { id: true, name: true, status: true } } } },
        project: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!doc) notFound();

  const serializedDoc = serializeDocument(doc);
  const isDraft = doc.status === "DRAFT";
  const isLocked = doc.status === "PAID";
  const canMarkPaid = doc.status === "SENT" || doc.status === "ACCEPTED";

  // Linked cotización (via DB FK or JSON content)
  const cotizacion = doc.linkedDocument;
  const project = doc.project ?? cotizacion?.project ?? null;

  // Unlinked cotizaciones for backfill (same client, no linked doc)
  const unlinkedCotizaciones = !doc.linkedDocumentId
    ? await prisma.document.findMany({
        where: {
          userId: user.id,
          type: "COTIZACION",
          linkedDocumentId: null,
          ...(doc.clientId ? { clientId: doc.clientId } : {}),
        },
        select: { id: true, number: true, clientName: true, total: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  if (isDraft) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/empresa/facturas"
              className="text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              ← Facturas
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white/60 font-mono text-sm">
              {doc.number ?? id}
            </span>
            <StatusBadge status={doc.status} />
          </div>
          <PdfDownloadButton
            documentId={doc.id}
            filename={`${doc.number ?? "factura"}.pdf`}
          />
        </div>

        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">
            Estado
          </p>
          <DocumentStatusPicker
            documentId={doc.id}
            currentStatus={doc.status}
          />
        </div>

        <FacturaBuilder
          taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
          currency={user.config?.currency ?? "USD"}
          clients={clients}
          paymentMethods={paymentMethods.map(serializePaymentMethod)}
          mode="edit"
          initialDocument={serializedDoc}
        />
      </div>
    );
  }

  const content = doc.content as {
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxPercent: number;
      discount: number;
    }>;
    notes?: string;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-white text-2xl font-semibold tracking-tight">
              {doc.number ?? "Factura"}
            </h1>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-white/40 text-sm">{doc.clientName ?? doc.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {canMarkPaid && <MarkPaidButton documentId={doc.id} />}
          {!isLocked && <ReopenDraftButton documentId={doc.id} />}
          <PdfDownloadButton documentId={doc.id} filename={`${doc.number ?? "factura"}.pdf`} />
        </div>
      </div>

      <PipelineStatus
        project={project ? { id: project.id, label: project.name, status: project.status, href: `/empresa/proyectos/${project.id}` } : null}
        cotizacion={cotizacion ? { id: cotizacion.id, label: cotizacion.number ?? "Cotización", status: cotizacion.status, href: `/empresa/cotizaciones/${cotizacion.id}` } : null}
        factura={{ id: doc.id, label: doc.number ?? "Factura", status: doc.status }}
        isPaid={doc.status === "PAID"}
      />

      {!doc.linkedDocumentId && (
        <LinkCotizacionPanel
          facturaId={doc.id}
          cotizaciones={unlinkedCotizaciones.map((c) => ({ ...c, total: c.total != null ? Number(c.total) : null }))}
        />
      )}

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            Cliente
          </p>
          <p className="text-white font-medium">{doc.clientName ?? "—"}</p>
          {doc.clientCompany && (
            <p className="text-white/50 text-sm">{doc.clientCompany}</p>
          )}
          {doc.clientRuc && (
            <p className="text-white/40 text-xs mt-1">RUC: {doc.clientRuc}</p>
          )}
          {doc.paymentMethod?.name && (
            <p className="text-white/40 text-xs mt-2">
              Pago: {doc.paymentMethod.name}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
            Total
          </p>
          <p className="text-[#C8A96E] font-mono text-2xl font-semibold">
            {doc.currency}{" "}
            {Number(doc.total ?? 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
          {doc.netAmount != null && Number(doc.netAmount) !== Number(doc.total ?? 0) && (
            <p className="text-green-400/80 font-mono text-sm mt-1">
              Neto: {doc.currency}{" "}
              {Number(doc.netAmount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
          )}
          <p className="text-white/40 text-xs mt-1">
            Emitida:{" "}
            {new Date(doc.issueDate).toLocaleDateString("es-PA")}
          </p>
        </div>
      </div>

      {(content.lineItems?.length ?? 0) > 0 && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">
            Detalle
          </p>
          <div className="space-y-2">
            {content.lineItems?.map((item, i) => {
              const qty = Number(item.quantity) || 0;
              const price = Number(item.unitPrice) || 0;
              const disc = Number(item.discount) || 0;
              const tax = Number(item.taxPercent) || 0;
              const base = qty * price * (1 - disc / 100);
              const lineTotal = base * (1 + tax / 100);
              return (
                <div
                  key={i}
                  className="flex justify-between gap-4 text-sm border-b border-white/[0.04] pb-2 last:border-0"
                >
                  <span className="text-white/70">{item.description || "—"}</span>
                  <span className="text-white/50 font-mono shrink-0">
                    {lineTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {content.notes && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-2">
            Notas
          </p>
          <p className="text-white/60 text-sm whitespace-pre-line">{content.notes}</p>
        </div>
      )}

      {isLocked && (
        <FacturaClientLinker
          documentId={doc.id}
          clients={clients}
          clientId={doc.clientId}
          clientName={doc.clientName}
        />
      )}

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">
          Estado
        </p>
        <DocumentStatusPicker
          documentId={doc.id}
          currentStatus={doc.status}
          locked={isLocked}
        />
      </div>
    </div>
  );
}
