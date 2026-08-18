import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod, serializeDocument, serializeLead } from "@/lib/serializers";
import { CotizacionBuilder } from "../nueva/cotizacion-builder";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { ConvertToInvoiceButton } from "@/components/empresa/convert-to-invoice-button";
import { PipelineStatus } from "@/components/empresa/pipeline-status";
import { LinkFacturaPanel } from "@/components/empresa/link-factura-panel";
import { DocumentAuditHistory } from "@/components/empresa/document-audit-history";
import { getQuoteLinkedInvoiceId } from "@/lib/quote-to-invoice";
import { computeQuoteBalance, syncQuoteInvoiceBalance } from "@/lib/quote-balance";
import { QuoteBalanceBanner } from "@/components/empresa/quote-balance-banner";
import Link from "next/link";

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const [doc, clients, paymentMethods, leads] = await Promise.all([
    prisma.document.findFirst({
      where: { id, userId: user.id, type: "COTIZACION" },
      include: {
        linkedDocument: { select: { id: true, number: true, status: true, total: true, amountPaid: true } },
        project: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
    prisma.lead.findMany({ where: { userId: user.id, status: { notIn: ["GANADO", "PERDIDO"] } }, orderBy: { name: "asc" } }),
  ]);

  if (!doc) notFound();

  if (doc.linkedDocumentId || getQuoteLinkedInvoiceId(doc.content)) {
    await syncQuoteInvoiceBalance(doc.id, user.id);
  }

  const serializedDoc = serializeDocument(doc);
  const serializedMethods = paymentMethods.map(serializePaymentMethod);

  const netAmount = serializedDoc.netAmount;
  const gross = serializedDoc.total ?? 0;
  // Prefer DB FK over JSON fallback
  const linkedInvoiceId = doc.linkedDocumentId ?? getQuoteLinkedInvoiceId(doc.content);
  const linkedFactura = doc.linkedDocument;
  const project = doc.project;
  const quoteBalance = linkedFactura
    ? computeQuoteBalance(Number(doc.total ?? 0), linkedFactura)
    : null;

  // Facturas sin vincular para rellenar hacia atrás (mismo cliente)
  const unlinkedFacturas = !linkedInvoiceId
    ? (
        await prisma.document.findMany({
          where: {
            userId: user.id,
            type: "FACTURA",
            linkedDocumentId: null,
            ...(doc.clientId ? { clientId: doc.clientId } : {}),
          },
          select: { id: true, number: true, clientName: true, total: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      ).map((f) => ({ ...f, total: f.total != null ? Number(f.total) : null }))
    : [];

  const auditLogs = await prisma.documentAuditLog.findMany({
    where: { documentId: doc.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {doc.status === "ACCEPTED" && (
        <div className="flex items-center justify-between gap-4 bg-[#C8A96E]/[0.06] border border-[#C8A96E]/20 rounded-xl px-5 py-4">
          <div>
            <p className="text-[#C8A96E] text-sm font-medium">
              {linkedInvoiceId ? "Factura vinculada" : "Cotización aceptada"}
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              {linkedInvoiceId
                ? "Esta cotización ya tiene una factura asociada."
                : "Al aceptar se crea una factura en borrador. También puede crearla manualmente."}
            </p>
          </div>
          <ConvertToInvoiceButton
            quoteId={doc.id}
            quoteStatus={doc.status}
            linkedInvoiceId={linkedInvoiceId}
            variant="banner"
          />
        </div>
      )}

      <PipelineStatus
        current="cotizacion"
        project={
          project
            ? { id: project.id, label: project.name, status: project.status, href: `/empresa/proyectos/${project.id}` }
            : null
        }
        cotizacion={{
          id: doc.id,
          label: doc.number ?? "Cotización",
          status: doc.status,
          amount: doc.total != null ? Number(doc.total) : null,
        }}
        factura={
          linkedFactura
            ? {
                id: linkedFactura.id,
                label: linkedFactura.number ?? "Factura",
                status: linkedFactura.status,
                amount: linkedFactura.total != null ? Number(linkedFactura.total) : null,
                href: `/empresa/facturas/${linkedFactura.id}`,
              }
            : null
        }
        collection={
          linkedFactura?.total != null && Number(linkedFactura.total) > 0
            ? {
                total: Number(linkedFactura.total),
                collected:
                  linkedFactura.status === "PAID"
                    ? Number(linkedFactura.total)
                    : Number(linkedFactura.amountPaid ?? 0),
                currency: doc.currency,
              }
            : null
        }
        actions={{
          project: project ? null : "/empresa/proyectos/nuevo",
          factura: linkedFactura ? null : `/empresa/facturas/nueva?cobrar=${doc.id}`,
        }}
      />

      {quoteBalance && (
        <QuoteBalanceBanner
          balance={quoteBalance}
          quoteNumber={doc.number}
          invoiceNumber={linkedFactura?.number}
        />
      )}

      {!linkedInvoiceId && (
        <LinkFacturaPanel cotizacionId={doc.id} facturas={unlinkedFacturas} />
      )}

      {/* Quick summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/empresa/cotizaciones" className="text-white/55 hover:text-white/60 text-sm transition-colors">
            ← Cotizaciones
          </Link>
          <span className="text-white/50">/</span>
          <span className="text-white/60 font-mono text-sm">{doc.number ?? id}</span>
          <StatusBadge status={doc.status} />
        </div>
        <div className="flex items-center gap-3">
          {netAmount !== null && netAmount !== gross && (
            <div className="text-right">
              <p className="text-white/55 text-xs">Neto recibido</p>
              <p className="text-green-400 font-mono text-sm font-semibold">
                ${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      </div>

      <CotizacionBuilder
        taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
        currency={user.config?.currency ?? "USD"}
        clients={clients}
        leads={leads.map(serializeLead)}
        paymentMethods={serializedMethods}
        mode="edit"
        initialDocument={serializedDoc}
      />

      <DocumentAuditHistory logs={auditLogs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))} />
    </div>
  );
}
