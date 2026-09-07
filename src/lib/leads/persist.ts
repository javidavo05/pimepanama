import type { Lead, LeadPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PersistLeadInput = {
  userId: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  message: string;
  locale?: "es" | "en";
  /** Cuándo llegó de verdad. Por defecto, ahora. */
  receivedAt?: Date;
  priority?: LeadPriority;
  priorityReason?: string | null;
  estimatedValue?: number | null;
};

function stamp(date: Date): string {
  return date.toLocaleString("es-PA", { timeZone: "America/Panama" });
}

/**
 * Guarda un contacto del formulario público como Lead. Es el único lugar que
 * decide qué pasa cuando alguien escribe dos veces: se le anexa el mensaje a la
 * ficha que ya existe en vez de duplicarla, para que el historial quede junto.
 */
export async function persistLead(input: PersistLeadInput): Promise<{ lead: Lead; repeat: boolean }> {
  const receivedAt = input.receivedAt ?? new Date();
  const entry = `[${stamp(receivedAt)}] Formulario web (${input.locale ?? "es"}):\n${input.message}`;

  const existing = await prisma.lead.findFirst({
    where: { userId: input.userId, email: { equals: input.email, mode: "insensitive" } },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        notes: [existing.notes, entry].filter(Boolean).join("\n\n"),
        company: existing.company ?? (input.company || null),
        phone: existing.phone ?? (input.phone || null),
        // Un lead dado por perdido que vuelve a escribir es una oportunidad viva.
        status: existing.status === "PERDIDO" ? "NUEVO" : existing.status,
        // La prioridad solo sube: si ya estaba en ALTA, un mensaje flojo no la baja.
        ...(input.priority && rank(input.priority) > rank(existing.priority)
          ? { priority: input.priority, priorityReason: input.priorityReason ?? null }
          : {}),
        ...(input.estimatedValue != null && existing.estimatedValue == null
          ? { estimatedValue: input.estimatedValue }
          : {}),
      },
    });
    return { lead, repeat: true };
  }

  const lead = await prisma.lead.create({
    data: {
      userId: input.userId,
      name: input.name,
      email: input.email,
      company: input.company || null,
      phone: input.phone || null,
      source: "WEB",
      status: "NUEVO",
      priority: input.priority ?? "MEDIA",
      priorityReason: input.priorityReason ?? null,
      estimatedValue: input.estimatedValue ?? null,
      notes: entry,
      createdAt: receivedAt,
    },
  });
  return { lead, repeat: false };
}

function rank(p: LeadPriority): number {
  return p === "ALTA" ? 3 : p === "MEDIA" ? 2 : 1;
}
