import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentListTable } from "@/components/empresa/document-list-table";
import { PageHeader, btn } from "@/components/empresa/page-header";

export const metadata = { title: "Bitácoras — Pime Suite" };

export default async function BitacorasPage() {
  const user = await getEmpresaUser();
  const documents = await prisma.document.findMany({
    where: { userId: user.id, type: "BITACORA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Bitácoras"
        description={`${documents.length} registros`}
        actions={
          <Link href="/empresa/bitacoras/nueva" className={btn.accent}>
            + Nueva bitácora
          </Link>
        }
      />
      <div className="md:bg-panel md:border md:border-line md:rounded-2xl md:p-6">
        <DocumentListTable
          documents={documents}
          editBasePath="/empresa/bitacoras"
          showDelete
          deleteRedirect="/empresa/bitacoras"
          deleteLabel="la bitácora"
        />
      </div>
    </div>
  );
}
