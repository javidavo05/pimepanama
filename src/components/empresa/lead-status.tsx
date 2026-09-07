import type { LeadStatus } from "@prisma/client";

export const LEAD_STATUSES: { value: LeadStatus; label: string; className: string }[] = [
  { value: "NUEVO", label: "Nuevo", className: "border-white/[0.12] text-white/60" },
  { value: "CONTACTADO", label: "Contactado", className: "border-blue-500/25 text-blue-400" },
  { value: "COTIZANDO", label: "Cotizando", className: "border-[#C8A96E]/30 text-[#C8A96E]" },
  { value: "NEGOCIACION", label: "Negociación", className: "border-amber-500/30 text-amber-400" },
  { value: "GANADO", label: "Ganado", className: "border-green-500/30 text-green-400" },
  { value: "PERDIDO", label: "Perdido", className: "border-red-500/25 text-red-400" },
];

export function leadStatusMeta(status: LeadStatus) {
  return LEAD_STATUSES.find((s) => s.value === status) ?? LEAD_STATUSES[0];
}
