/** Lectura y escritura de Platform en el servidor: serializar y validar lo que manda el navegador. */
import type { Platform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normEmail, normSlot } from "@/lib/platforms-seed";
import { hasPlatformVault } from "@/lib/platform-vault-shared";
import type { SerializedPlatform } from "./tipos";

export function serializarPlataforma(p: Platform): SerializedPlatform {
  return {
    id: p.id,
    name: p.name,
    accessUrl: p.accessUrl,
    linkUrl: p.linkUrl,
    supabaseEmail: p.supabaseEmail,
    supabaseSlot: p.supabaseSlot,
    vercelEmail: p.vercelEmail,
    githubEmail: p.githubEmail,
    brevoEmail: p.brevoEmail,
    notes: p.notes,
    hasConfidential: hasPlatformVault(p.confidentialVault),
    sortOrder: p.sortOrder,
    clientId: p.clientId,
    projectId: p.projectId,
    githubAccountId: p.githubAccountId,
    githubRepo: p.githubRepo,
    vercelProjectId: p.vercelProjectId,
    vercelProjectName: p.vercelProjectName,
    supabaseProjectRef: p.supabaseProjectRef,
  };
}

const TEXT_FIELDS = ["name", "accessUrl", "linkUrl", "notes", "githubRepo", "vercelProjectId", "vercelProjectName", "supabaseProjectRef"] as const;
const EMAIL_FIELDS = ["supabaseEmail", "vercelEmail", "githubEmail", "brevoEmail"] as const;

function texto(v: unknown, max = 2000): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

export class DatosInvalidos extends Error {}

/**
 * Convierte el cuerpo de la petición en datos de Platform. Solo toca los campos presentes. Comprueba que el
 * cliente, el proyecto y la cuenta de GitHub sean del mismo usuario, y que el proyecto sea de ese cliente.
 */
export async function datosDePlataforma(userId: string, body: Record<string, unknown>, actual?: Platform | null) {
  const data: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) if (k in body) data[k] = texto(body[k]);
  for (const k of EMAIL_FIELDS) if (k in body) data[k] = normEmail(body[k] == null ? null : String(body[k]));
  if ("supabaseSlot" in body) data.supabaseSlot = normSlot(body.supabaseSlot);
  if ("sortOrder" in body && typeof body.sortOrder === "number") data.sortOrder = Math.round(body.sortOrder);
  if ("name" in body && !data.name) throw new DatosInvalidos("La plataforma necesita un nombre.");
  if (data.githubRepo && !/^[\w.-]+\/[\w.-]+$/.test(String(data.githubRepo))) throw new DatosInvalidos("El repo va como dueño/nombre.");

  const clientId = "clientId" in body ? texto(body.clientId, 64) : (actual?.clientId ?? null);
  const projectId = "projectId" in body ? texto(body.projectId, 64) : (actual?.projectId ?? null);

  const [cliente, proyecto, cuentaGh] = await Promise.all([
    "clientId" in body && clientId ? prisma.client.findFirst({ where: { id: clientId, userId }, select: { id: true } }) : null,
    ("projectId" in body || "clientId" in body) && projectId
      ? prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true, clientId: true, clients: { select: { clientId: true } } } })
      : null,
    "githubAccountId" in body && body.githubAccountId ? prisma.githubAccount.findFirst({ where: { id: String(body.githubAccountId), userId }, select: { id: true } }) : null,
  ]);

  if ("clientId" in body) {
    if (clientId && !cliente) throw new DatosInvalidos("Ese cliente no existe.");
    data.clientId = clientId;
  }
  if ("projectId" in body || "clientId" in body) {
    if (projectId && !proyecto) throw new DatosInvalidos("Ese proyecto no existe.");
    const delCliente = proyecto && clientId && (proyecto.clientId === clientId || proyecto.clients.some((c) => c.clientId === clientId));
    // Un proyecto que no es del cliente elegido (o sin cliente) se suelta en vez de fallar.
    data.projectId = delCliente ? projectId : null;
  }
  if ("githubAccountId" in body) {
    if (body.githubAccountId && !cuentaGh) throw new DatosInvalidos("Esa cuenta de GitHub no existe.");
    data.githubAccountId = cuentaGh?.id ?? null;
  }
  return data;
}
