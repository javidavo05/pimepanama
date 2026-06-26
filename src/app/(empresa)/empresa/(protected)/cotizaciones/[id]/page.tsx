import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { CotizacionBuilder } from "../nueva/cotizacion-builder";
import { PdfDownloadButton } from "@/components/empresa/document-builder/pdf-download-button";
import { StatusBadge } from "@/components/empresa/document-builder/status-badge";
import Link from "next/link";

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getEmpresaUser();

  const [doc, clients, paymentMethods] = await Promise.all([
    prisma.document.findFirst({ where: { id, userId: user.id, type: "COTIZACION" } }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!doc) notFound();

  const netAmount = doc.netAmount ? Number(doc.netAmount) : null;
  const gross = Number(doc.total ?? 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quick summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/empresa/cotizaciones" className="text-white/30 hover:text-white/60 text-sm transition-colors">
            ← Cotizaciones
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/60 font-mono text-sm">{doc.number ?? id}</span>
          <StatusBadge status={doc.status} />
        </div>
        <div className="flex items-center gap-3">
          {netAmount !== null && netAmount !== gross && (
            <div className="text-right">
              <p className="text-white/30 text-xs">Neto recibido</p>
              <p className="text-green-400 font-mono text-sm font-semibold">
                ${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          <PdfDownloadButton documentId={doc.id} filename={`${doc.number ?? "cotizacion"}.pdf`} />
        </div>
      </div>

      <CotizacionBuilder
        taxRateDefault={Number(user.config?.taxRatePercent ?? 7)}
        currency={user.config?.currency ?? "USD"}
        clients={clients}
        paymentMethods={paymentMethods}
        mode="edit"
        initialDocument={doc}
      />
    </div>
  );
}
