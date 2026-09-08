import type { DocumentStatus } from "@prisma/client";

const CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "text-fg-faint bg-fill-2 border-line-mid" },
  SENT: { label: "Enviado", className: "text-info bg-info/10 border-info/20" },
  ACCEPTED: { label: "Aceptado", className: "text-ok bg-ok/10 border-ok/20" },
  REJECTED: { label: "Rechazado", className: "text-danger bg-danger/10 border-danger/20" },
  PAID: { label: "Pagado", className: "text-sand-fg bg-sand/10 border-sand/20" },
  PARTIALLY_PAID: { label: "Pago parcial", className: "text-warn bg-warn/10 border-warn/20" },
  CANCELLED: { label: "Cancelado", className: "text-fg-dim bg-fill border-line" },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}
