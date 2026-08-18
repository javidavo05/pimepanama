import Link from "next/link";
import type { Document } from "@prisma/client";
import { DocumentRowActions } from "./document-row-actions";
import { ConvertToInvoiceButton } from "./convert-to-invoice-button";

const TYPE_PATHS: Record<string, string> = {
  FACTURA: "facturas",
  COTIZACION: "cotizaciones",
  BITACORA: "bitacoras",
  CORREO: "correos",
};

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

// La lista es el registro de documentos emitidos: PARTIALLY_PAID no es un
// estado del documento sino del cobro, así que se muestra como "Emitida" y el
// avance del cobro va en la columna de monto. El seguimiento vive en Por Cobrar.
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  PAID: "Pagado",
  PARTIALLY_PAID: "Emitida",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-white/60 bg-white/[0.04]",
  SENT: "text-blue-400 bg-blue-500/10",
  ACCEPTED: "text-green-400 bg-green-500/10",
  REJECTED: "text-red-400 bg-red-500/10",
  PAID: "text-[#C8A96E] bg-[#C8A96E]/10",
  PARTIALLY_PAID: "text-blue-400 bg-blue-500/10",
  CANCELLED: "text-white/55 bg-white/[0.03]",
};

/** Nombre del cliente, enlazado a su perfil cuando el documento lo tiene asociado. */
function ClientCell({ doc, truncate = "max-w-[200px]" }: { doc: Document; truncate?: string }) {
  const body = (
    <>
      <p className={`text-white/80 font-medium truncate ${truncate}`}>
        {doc.clientName ?? doc.title}
      </p>
      {doc.clientCompany && (
        <p className={`text-white/55 text-xs truncate ${truncate}`}>{doc.clientCompany}</p>
      )}
    </>
  );

  if (!doc.clientId) return <div>{body}</div>;

  return (
    <Link
      href={`/empresa/clientes/${doc.clientId}`}
      className="block hover:opacity-80 transition-opacity"
      title="Ver perfil del cliente"
    >
      {body}
    </Link>
  );
}

function collectedOf(doc: Document): number {
  if (doc.status === "PAID") return Number(doc.total ?? 0);
  if (doc.status === "PARTIALLY_PAID") return Number(doc.amountPaid ?? 0);
  return 0;
}

/** Muestra el total y, si hay cobro parcial, cuánto se lleva cobrado. */
function AmountCell({ doc, align = "right" }: { doc: Document; align?: "right" | "left" }) {
  const total = Number(doc.total ?? 0);
  const collected = collectedOf(doc);
  const partial = collected > 0 && collected < total - 0.01;

  if (!doc.total) return <span className="text-white/50">—</span>;

  return (
    <div className={align === "right" ? "text-right" : ""}>
      <span className="text-white/70 font-mono text-xs">
        {doc.currency} {total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
      {partial && (
        <p className="text-green-400/80 font-mono text-[10px] mt-0.5">
          cobrado {collected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  );
}

interface DocumentListTableProps {
  documents: Document[];
  showType?: boolean;
  editBasePath?: string;
  showDelete?: boolean;
  deleteRedirect?: string;
  deleteLabel?: string;
  emptyMessage?: string;
  /** quoteId → linked factura id (cotizaciones list) */
  linkedInvoices?: Record<string, string | undefined>;
}

export function DocumentListTable({
  documents,
  showType = false,
  editBasePath,
  showDelete = false,
  deleteRedirect,
  deleteLabel = "esta bitácora",
  emptyMessage = "No hay documentos aún.",
  linkedInvoices,
}: DocumentListTableProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-16 text-white/55 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      {/* Mobile: stacked cards (no hover-only actions, no horizontal scroll) */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => {
          const basePath = editBasePath ?? `/empresa/${TYPE_PATHS[doc.type]}`;
          return (
            <div key={doc.id} className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/70 font-mono text-xs">{doc.number ?? "—"}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium shrink-0 ${STATUS_COLORS[doc.status]}`}>
                  {STATUS_LABELS[doc.status]}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <ClientCell doc={doc} truncate="" />
                </div>
                <div className="shrink-0">
                  <AmountCell doc={doc} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                <div className="flex items-center gap-2">
                  {showType && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
                      style={{ color: TYPE_COLORS[doc.type], backgroundColor: `${TYPE_COLORS[doc.type]}15` }}
                    >
                      {TYPE_LABELS[doc.type]}
                    </span>
                  )}
                  <span className="text-white/60 text-[11px]">
                    {new Date(doc.issueDate).toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {doc.type === "COTIZACION" && (
                    <ConvertToInvoiceButton
                      quoteId={doc.id}
                      quoteStatus={doc.status}
                      linkedInvoiceId={linkedInvoices?.[doc.id]}
                      variant="row"
                    />
                  )}
                  <DocumentRowActions
                    documentId={doc.id}
                    editHref={`${basePath}/${doc.id}`}
                    editLabel={doc.type === "FACTURA" && doc.status === "PAID" ? "Ver" : "Editar"}
                    showDelete={showDelete}
                    deleteRedirect={deleteRedirect ?? basePath}
                    documentLabel={doc.number ? `${deleteLabel} ${doc.number}` : deleteLabel}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-white/60 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Número
            </th>
            {showType && (
              <th className="text-left text-white/60 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
                Tipo
              </th>
            )}
            <th className="text-left text-white/60 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Cliente
            </th>
            <th className="text-right text-white/60 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Total
            </th>
            <th className="text-left text-white/60 text-xs uppercase tracking-widest font-medium pb-3 pr-4">
              Estado
            </th>
            <th className="text-left text-white/60 text-xs uppercase tracking-widest font-medium pb-3">
              Fecha
            </th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {documents.map((doc) => {
            const basePath =
              editBasePath ?? `/empresa/${TYPE_PATHS[doc.type]}`;
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
                  <ClientCell doc={doc} />
                </td>
                <td className="py-3 pr-4 text-right">
                  <AmountCell doc={doc} />
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[doc.status]}`}
                  >
                    {STATUS_LABELS[doc.status]}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-white/60 text-xs">
                    {new Date(doc.issueDate).toLocaleDateString("es-PA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {doc.type === "COTIZACION" && (
                      <ConvertToInvoiceButton
                        quoteId={doc.id}
                        quoteStatus={doc.status}
                        linkedInvoiceId={linkedInvoices?.[doc.id]}
                        variant="row"
                      />
                    )}
                    <DocumentRowActions
                      documentId={doc.id}
                      editHref={`${basePath}/${doc.id}`}
                      editLabel={
                        doc.type === "FACTURA" && doc.status === "PAID"
                          ? "Ver"
                          : "Editar"
                      }
                      showDelete={showDelete}
                      deleteRedirect={deleteRedirect ?? basePath}
                      documentLabel={
                        doc.number
                          ? `${deleteLabel} ${doc.number}`
                          : deleteLabel
                      }
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
