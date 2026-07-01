import type { Client } from "@prisma/client";

export const PIME_BITACORA_OWNER = "Javier Vallejo";

/** Participantes del cliente a partir del perfil en /empresa/clientes */
export function clientAttendeesFromProfile(
  client: Pick<Client, "name" | "company" | "email" | "phone">
): string {
  const parts: string[] = [client.name];
  if (client.company?.trim()) {
    parts.push(client.company.trim());
  }
  if (client.email?.trim()) {
    parts.push(client.email.trim());
  }
  return parts.join(", ");
}

/** Equipo Pime por defecto: owner fijo + quien crea la bitácora */
export function defaultPimeAttendees(creatorName?: string | null): string {
  const team = [PIME_BITACORA_OWNER];
  const normalized = creatorName?.trim();
  if (
    normalized &&
    normalized.toLowerCase() !== PIME_BITACORA_OWNER.toLowerCase()
  ) {
    team.push(normalized);
  }
  return team.join(", ");
}

/** Garantiza que Javier Vallejo figure siempre en participantes Pime */
export function ensurePimeOwner(attendees: string | undefined): string {
  const names = (attendees ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasOwner = names.some(
    (n) => n.toLowerCase() === PIME_BITACORA_OWNER.toLowerCase()
  );
  if (!hasOwner) {
    names.unshift(PIME_BITACORA_OWNER);
  }
  return names.join(", ");
}

export function parseAttendeeList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
