import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeDocument } from "@/lib/serializers";
import { BitacoraBuilder } from "../nueva/bitacora-builder";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { ActionRow } from "@/components/empresa/page-header";

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
      {/* En el celular el botón del PDF baja a su propia fila, a lo ancho. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/empresa/bitacoras"
            className="inline-flex items-center min-h-11 sm:min-h-8 shrink-0 text-fg-dim hover:text-fg text-sm transition-colors"
          >
            ← Bitácoras
          </Link>
          <span className="text-fg-faint">/</span>
          <span className="text-fg-dim font-mono text-sm truncate min-w-0">
            {doc.number ?? id}
          </span>
          <StatusBadge status={doc.status} />
        </div>
        <ActionRow>
          <PdfDownloadButton
            documentId={doc.id}
            filename={`${doc.number ?? "bitacora"}.pdf`}
          />
        </ActionRow>
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
