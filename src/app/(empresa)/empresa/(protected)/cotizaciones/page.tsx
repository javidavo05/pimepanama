import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentListTable } from "@/components/empresa/document-list-table";
import { getQuoteLinkedInvoiceId } from "@/lib/quote-to-invoice";
import { openQuoteWhere } from "@/lib/quote-list";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Cotizaciones — Pime Suite" };

export default async function CotizacionesPage() {
  const user = await getEmpresaUser();
  const documents = await prisma.document.findMany({
    where: openQuoteWhere(user.id),
    orderBy: { createdAt: "desc" },
  });

  const linkedInvoices = Object.fromEntries(
    documents.map((d) => [d.id, d.linkedDocumentId ?? getQuoteLinkedInvoiceId(d.content)])
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Cotizaciones"
        description={`${documents.length} ${documents.length === 1 ? "activa" : "activas"}`}
        actions={
          <Link href="/empresa/cotizaciones/nueva" className={btn.accent}>
            + Nueva cotización
          </Link>
        }
      />
      <div className="md:bg-panel md:border md:border-line md:rounded-2xl md:p-6">
        <DocumentListTable
          documents={documents}
          editBasePath="/empresa/cotizaciones"
          linkedInvoices={linkedInvoices}
          emptyMessage="No hay cotizaciones activas. Las pagadas están en Facturas o en el historial del cliente."
        />
      </div>
    </div>
  );
}
