import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentListTable } from "@/components/empresa/document-list-table";
import { getQuoteLinkedInvoiceId } from "@/lib/quote-to-invoice";
import { openQuoteWhere } from "@/lib/quote-list";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Cotizaciones</h1>
          <p className="text-white/60 text-sm mt-1">
            {documents.length} {documents.length === 1 ? "activa" : "activas"}
          </p>
        </div>
        <Link
          href="/empresa/cotizaciones/nueva"
          className="px-4 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] text-[#030611] text-sm font-semibold rounded-lg transition-all"
        >
          + Nueva cotización
        </Link>
      </div>
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
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
