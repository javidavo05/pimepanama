import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentListTable } from "@/components/empresa/document-list-table";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Facturas — Pime Suite" };

export default async function FacturasPage() {
  const user = await getEmpresaUser();
  const documents = await prisma.document.findMany({
    where: { userId: user.id, type: "FACTURA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Facturas"
        description={`${documents.length} documentos`}
        actions={
          <Link href="/empresa/facturas/nueva" className={btn.accent}>
            + Nueva factura
          </Link>
        }
      />
      <div className="md:bg-panel md:border md:border-line md:rounded-2xl md:p-6">
        <DocumentListTable documents={documents} editBasePath="/empresa/facturas" />
      </div>
    </div>
  );
}
