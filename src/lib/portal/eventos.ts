/** Línea de tiempo del cliente. Nunca rompe la acción que la llama: si falla, solo lo anota en el log. */
import { prisma } from "@/lib/prisma";

export type Evento = {
  userId: string;
  clientId: string;
  projectId?: string | null;
  entityType: string;
  entityId?: string | null;
  kind: string;
  title: string;
  detail?: string | null;
  /** Dónde quedó el cambio en el sistema del cliente (enlace «Ver el cambio»). */
  url?: string | null;
  visibility?: "interno" | "cliente";
  actorType?: "cliente" | "pime" | "sistema" | "github";
  actorClientUserId?: string | null;
  actorEmpresaUserId?: string | null;
};

export async function registrarEvento(e: Evento): Promise<void> {
  try {
    await prisma.activityEvent.create({ data: { ...e, visibility: e.visibility ?? "interno", actorType: e.actorType ?? "pime" } });
  } catch (err) {
    console.error("[portal] evento sin guardar", e.kind, err);
  }
}
