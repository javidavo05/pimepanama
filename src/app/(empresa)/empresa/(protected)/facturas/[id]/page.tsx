import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import type { DocumentStatus } from "@prisma/client";
import { updateDocumentAction } from "@/app/(empresa)/empresa/actions";

export default async function FacturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();
  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id, type: "FACTURA" },
  });
  if (!doc) notFound();

  const statuses: DocumentStatus[] = [
    "DRAFT", "SENT", "ACCEPTED", "PAID", "REJECTED", "CANCELLED",
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-white text-2xl font-semibold tracking-tight">
              {doc.number ?? "Factura"}
            </h1>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-white/40 text-sm">{doc.clientName ?? doc.title}</p>
        </div>
        <PdfDownloadButton
          documentId={doc.id}
          filename={`${doc.number ?? "factura"}.pdf`}
        />
      </div>

      {/* Info card */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Cliente</p>
          <p className="text-white font-medium">{doc.clientName ?? "—"}</p>
          {doc.clientCompany && <p className="text-white/50 text-sm">{doc.clientCompany}</p>}
          {doc.clientRuc && <p className="text-white/40 text-xs mt-1">RUC: {doc.clientRuc}</p>}
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Total</p>
          <p className="text-[#C8A96E] font-mono text-2xl font-semibold">
            {doc.currency}{" "}
            {Number(doc.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-white/40 text-xs mt-1">
            Emitida: {new Date(doc.issueDate).toLocaleDateString("es-PA")}
          </p>
        </div>
      </div>

      {/* Change status */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <p className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">
          Cambiar estado
        </p>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <form key={s} action={async () => {
              "use server";
              await updateDocumentAction(id, { status: s });
            }}>
              <button
                type="submit"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  doc.status === s
                    ? "bg-[#C8A96E]/10 border-[#C8A96E]/30 text-[#C8A96E]"
                    : "border-white/[0.07] text-white/40 hover:text-white/70 hover:border-white/20"
                }`}
              >
                {s}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
