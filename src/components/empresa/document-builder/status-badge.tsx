import type { DocumentStatus } from "@prisma/client";

const CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "text-white/50 bg-white/[0.05] border-white/10" },
  SENT: { label: "Enviado", className: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  ACCEPTED: { label: "Aceptado", className: "text-green-400 bg-green-500/10 border-green-500/20" },
  REJECTED: { label: "Rechazado", className: "text-red-400 bg-red-500/10 border-red-500/20" },
  PAID: { label: "Pagado", className: "text-[#C8A96E] bg-[#C8A96E]/10 border-[#C8A96E]/20" },
  CANCELLED: { label: "Cancelado", className: "text-white/30 bg-white/[0.03] border-white/[0.05]" },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}
