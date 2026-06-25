import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";

export default async function CorreoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();
  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id, type: "CORREO" },
  });
  if (!doc) notFound();

  const content = doc.content as Record<string, string>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight truncate max-w-lg">
            {content.subject ?? doc.title}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {content.to} {content.cc && `· CC: ${content.cc}`}
          </p>
        </div>
        <PdfDownloadButton documentId={doc.id} filename={`correo-${doc.id.slice(0, 8)}.pdf`} />
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <div className="border-b border-white/[0.06] pb-4 mb-4 space-y-2">
          <div className="flex gap-3 text-sm">
            <span className="text-white/40 w-12">Para:</span>
            <span className="text-white/80">{content.to ?? "—"}</span>
          </div>
          {content.cc && (
            <div className="flex gap-3 text-sm">
              <span className="text-white/40 w-12">CC:</span>
              <span className="text-white/70">{content.cc}</span>
            </div>
          )}
          <div className="flex gap-3 text-sm">
            <span className="text-white/40 w-12">Asunto:</span>
            <span className="text-white font-medium">{content.subject ?? "—"}</span>
          </div>
        </div>
        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
          {content.body ?? "Sin contenido"}
        </p>
      </div>
    </div>
  );
}
