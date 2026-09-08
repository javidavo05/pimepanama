import type { LeadPriority } from "@prisma/client";

export const LEAD_PRIORITIES: { value: LeadPriority; label: string; className: string }[] = [
  // Solo ALTA gasta saturación: si los tres niveles gritan, ninguno destaca y
  // el tablero vuelve a ser una lista plana.
  { value: "ALTA", label: "Alta", className: "border-warn/30 bg-warn/10 text-warn" },
  { value: "MEDIA", label: "Media", className: "border-line-mid text-fg-dim" },
  { value: "BAJA", label: "Baja", className: "border-line text-fg-ghost" },
];

/** Orden para listar: primero lo que hay que atender. */
export function priorityRank(p: LeadPriority): number {
  return p === "ALTA" ? 0 : p === "MEDIA" ? 1 : 2;
}

export function LeadPriorityBadge({ priority }: { priority: LeadPriority }) {
  const meta = LEAD_PRIORITIES.find((p) => p.value === priority) ?? LEAD_PRIORITIES[1];

  return (
    <span
      className={`shrink-0 rounded border px-2 py-1 text-[10px] font-medium uppercase leading-none tracking-widest ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
