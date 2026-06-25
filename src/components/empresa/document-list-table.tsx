import Link from "next/link";
import type { Document } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  FACTURA: "Factura",
  COTIZACION: "Cotización",
  BITACORA: "Bitácora",
  CORREO: "Correo",
};

const TYPE_COLORS: Record<string, string> = {
  FACTURA: "#3B82F6",
  COTIZACION: "#8B5CF6",
  BITACORA: "#10B981",
  CORREO: "#F59E0B",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-white/40 bg-white/[0.04]",
  SENT: "text-blue-400 bg-blue-500/10",
  ACCEPTED: "text-green-400 bg-green-500/10",
  REJECTED: "text-red-400 bg-red-500/10",
  PAID: "text-[#C8A96E] bg-[#C8A96E]/10",
  CANCELLED: "text-white/30 bg-white/[0.03]",
};

interface DocumentListTableProps {
  documents: Document[];
  showType?: boolean;
  editBasePath?: string;
}

export function DocumentListTable({
  documents,
  showType = false,
  editBasePath,
}: DocumentListTableProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-16 text-white/30 text-sm">
        No hay documentos aún.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-white/40 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Número
            </th>
            {showType && (
              <th className="text-left text-white/40 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
                Tipo
              </th>
            )}
            <th className="text-left text-white/40 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Cliente
            </th>
            <th className="text-right text-white/40 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Total
            </th>
            <th className="text-left text-white/40 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Estado
            </th>
            <th className="text-left text-white/40 text-xs uppercase tracking-widest font-medium pb-3">
              Fecha
            </th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {documents.map((doc) => {
            const basePath =
              editBasePath ?? `/empresa/${doc.type.toLowerCase()}s`;
            return (
              <tr key={doc.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-4">
                  <span className="text-white/70 font-mono text-xs">
                    {doc.number ?? "—"}
                  </span>
                </td>
                {showType && (
                  <td className="py-3 pr-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{
                        color: TYPE_COLORS[doc.type],
                        backgroundColor: `${TYPE_COLORS[doc.type]}15`,
                      }}
                    >
                      {TYPE_LABELS[doc.type]}
                    </span>
                  </td>
                )}
                <td className="py-3 pr-4">
                  <div>
                    <p className="text-white/80 font-medium truncate max-w-[200px]">
                      {doc.clientName ?? doc.title}
                    </p>
                    {doc.clientCompany && (
                      <p className="text-white/30 text-xs truncate max-w-[200px]">
                        {doc.clientCompany}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right">
                  {doc.total ? (
                    <span className="text-white/70 font-mono text-xs">
                      {doc.currency}{" "}
                      {Number(doc.total).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[doc.status]}`}
                  >
                    {STATUS_LABELS[doc.status]}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-white/40 text-xs">
                    {new Date(doc.issueDate).toLocaleDateString("es-PA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`${basePath}/${doc.id}`}
                      className="text-white/40 hover:text-white/80 text-xs transition-colors"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/api/empresa/documents/${doc.id}/pdf`}
                      target="_blank"
                      className="text-[#C8A96E] hover:text-[#d4b87a] text-xs font-medium transition-colors"
                    >
                      PDF
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
