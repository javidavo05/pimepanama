import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";

export default async function BitacoraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();
  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id, type: "BITACORA" },
  });
  if (!doc) notFound();

  const content = doc.content as Record<string, string>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">{doc.title}</h1>
          <p className="text-white/40 text-sm mt-1">
            {new Date(doc.issueDate).toLocaleDateString("es-PA", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <PdfDownloadButton documentId={doc.id} filename={`${doc.number ?? "bitacora"}.pdf`} />
      </div>

      {content.attendees && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Participantes</p>
          <div className="flex flex-wrap gap-2">
            {content.attendees.split(",").map((a) => (
              <span key={a} className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/70 text-xs">
                {a.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {[
        ["agenda", "Resumen / Agenda"],
        ["decisions", "Acuerdos y Decisiones"],
        ["actionItems", "Tareas Pendientes"],
        ["nextMeeting", "Próxima Reunión"],
      ].map(([key, label]) =>
        content[key] ? (
          <div key={key} className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
            <p className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-3">{label}</p>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{content[key]}</p>
          </div>
        ) : null
      )}
    </div>
  );
}
