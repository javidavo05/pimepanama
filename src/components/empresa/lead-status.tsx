import type { LeadStatus } from "@prisma/client";

export const LEAD_STATUSES: { value: LeadStatus; label: string; className: string }[] = [
  { value: "NUEVO", label: "Nuevo", className: "border-line-mid text-fg-dim" },
  { value: "CONTACTADO", label: "Contactado", className: "border-info/25 text-info" },
  { value: "COTIZANDO", label: "Cotizando", className: "border-sand/30 text-sand-fg" },
  { value: "NEGOCIACION", label: "Negociación", className: "border-warn/30 text-warn" },
  { value: "GANADO", label: "Ganado", className: "border-ok/30 text-ok" },
  { value: "PERDIDO", label: "Perdido", className: "border-danger/25 text-danger" },
];

export function leadStatusMeta(status: LeadStatus) {
  return LEAD_STATUSES.find((s) => s.value === status) ?? LEAD_STATUSES[0];
}
