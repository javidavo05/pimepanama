import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentListTable } from "@/components/empresa/document-list-table";

export const metadata = { title: "Facturas — Pime Suite" };

export default async function FacturasPage() {
  const user = await getEmpresaUser();
  const documents = await prisma.document.findMany({
    where: { userId: user.id, type: "FACTURA" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Facturas</h1>
          <p className="text-white/60 text-sm mt-1">{documents.length} documentos</p>
        </div>
        <Link
          href="/empresa/facturas/nueva"
          className="px-4 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] text-[#030611] text-sm font-semibold rounded-lg transition-all"
        >
          + Nueva factura
        </Link>
      </div>
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <DocumentListTable documents={documents} editBasePath="/empresa/facturas" />
      </div>
    </div>
  );
}
