import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializePaymentMethod, serializeDocument } from "@/lib/serializers";
import { CotizacionBuilder } from "../nueva/cotizacion-builder";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { ConvertToInvoiceButton } from "@/components/empresa/convert-to-invoice-button";
import { PipelineStatus } from "@/components/empresa/pipeline-status";
import { getQuoteLinkedInvoiceId } from "@/lib/quote-to-invoice";
import Link from "next/link";

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const [doc, clients, paymentMethods] = await Promise.all([
    prisma.document.findFirst({
      where: { id, userId: user.id, type: "COTIZACION" },
      include: {
        linkedDocument: { select: { id: true, number: true, status: true } },
        project: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!doc) notFound();

  const serializedDoc = serializeDocument(doc);
  const serializedMethods = paymentMethods.map(serializePaymentMethod);

  const netAmount = serializedDoc.netAmount;
  const gross = serializedDoc.total ?? 0;
  // Prefer DB FK over JSON fallback
  const linkedInvoiceId = doc.linkedDocumentId ?? getQuoteLinkedInvoiceId(doc.content);
  const linkedFactura = doc.linkedDocument;
  const project = doc.project;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {doc.status === "ACCEPTED" && (
        <div className="flex items-center justify-between gap-4 bg-[#C8A96E]/[0.06] border border-[#C8A96E]/20 rounded-xl px-5 py-4">
          <div>
            <p className="text-[#C8A96E] text-sm font-medium">
              {linkedInvoiceId ? "Factura vinculada" : "Cotización aceptada"}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
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
        project={project ? { id: project.id, label: project.name, status: project.status, href: `/empresa/proyectos/${project.id}` } : null}
        cotizacion={{ id: doc.id, label: doc.number ?? "Cotización", status: doc.status }}
        factura={linkedFactura ? { id: linkedFactura.id, label: linkedFactura.number ?? "Factura", status: linkedFactura.status, href: `/empresa/facturas/${linkedFactura.id}` } : null}
        isPaid={doc.status === "PAID"}
      />

      {/* Quick summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/empresa/cotizaciones" className="text-white/30 hover:text-white/60 text-sm transition-colors">
            ← Cotizaciones
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/60 font-mono text-sm">{doc.number ?? id}</span>
          <StatusBadge status={doc.status} />
        </div>
        <div className="flex items-center gap-3">
          {netAmount !== null && netAmount !== gross && (
            <div className="text-right">
              <p className="text-white/30 text-xs">Neto recibido</p>
              <p className="text-green-400 font-mono text-sm font-semibold">
                ${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          <PdfDownloadButton documentId={doc.id} filename={`${doc.number ?? "cotizacion"}.pdf`} />
        </div>
      </div>

      <CotizacionBuilder
        taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
        currency={user.config?.currency ?? "USD"}
        clients={clients}
        paymentMethods={serializedMethods}
        mode="edit"
        initialDocument={serializedDoc}
      />
    </div>
  );
}
