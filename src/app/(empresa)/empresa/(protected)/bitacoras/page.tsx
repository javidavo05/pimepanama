import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentListTable } from "@/components/empresa/document-list-table";

export const metadata = { title: "Bitácoras — Pime Suite" };

export default async function BitacorasPage() {
  const user = await getEmpresaUser();
  const documents = await prisma.document.findMany({
    where: { userId: user.id, type: "BITACORA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Bitácoras</h1>
          <p className="text-white/40 text-sm mt-1">{documents.length} registros</p>
        </div>
        <Link href="/empresa/bitacoras/nueva" className="px-4 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] text-[#030611] text-sm font-semibold rounded-lg transition-all">
          + Nueva bitácora
        </Link>
      </div>
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
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
