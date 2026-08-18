import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeDocument } from "@/lib/serializers";
import { BitacoraBuilder } from "../nueva/bitacora-builder";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";

export default async function EditarBitacoraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const [doc, clients] = await Promise.all([
    prisma.document.findFirst({
      where: { id, userId: user.id, type: "BITACORA" },
    }),
    prisma.client.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!doc) notFound();

  const serializedDoc = serializeDocument(doc);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/empresa/bitacoras"
            className="text-white/55 hover:text-white/60 text-sm transition-colors"
          >
            ← Bitácoras
          </Link>
          <span className="text-white/50">/</span>
          <span className="text-white/60 font-mono text-sm">
            {doc.number ?? id}
          </span>
          <StatusBadge status={doc.status} />
        </div>
        <PdfDownloadButton
          documentId={doc.id}
          filename={`${doc.number ?? "bitacora"}.pdf`}
        />
      </div>

      <BitacoraBuilder
        clients={clients}
        creatorName={user.fullName}
        mode="edit"
        initialDocument={serializedDoc}
      />

    </div>
  );
}
