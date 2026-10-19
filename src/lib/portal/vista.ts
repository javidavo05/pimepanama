/**
 * Vista de revisión: el equipo abre la cuenta de un cliente tal como la verá el cliente, en solo lectura, para
 * revisar que todo esté en orden antes de mandarle sus credenciales. Está siempre disponible para cada cliente
 * (con o sin personas invitadas) y no necesita una contraseña aparte: usa la sesión del equipo.
 *
 * La cookie solo dice qué cliente se está mirando; el permiso se vuelve a comprobar en cada pedido con la sesión
 * del equipo (miembro activo, doble verificación hecha y el cliente es de la empresa). Nada se escribe en esta
 * vista: las acciones y subidas del portal la rechazan con SOLO_LECTURA.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { resolverEquipo } from "@/lib/auth/equipo";
import { MFA_COOKIE, sesionVerificada } from "@/lib/auth/mfa";

export const VISTA_COOKIE = "pime_vista_cliente";
/** Cuánto vale una revisión para poder invitar: lo que se revisó hoy, no lo de la semana pasada. */
export const REVISION_VIGENTE_MS = 24 * 3_600_000;
export const SOLO_LECTURA = "Estás en la vista de revisión: aquí nada se guarda ni le llega al cliente.";

export type Vista = { clientId: string; empresaUserId: string; revisor: string };

/** Si la sesión es del equipo y está mirando un cliente suyo, devuelve la vista; si no, null. */
export async function vistaDelEquipo(claims: { sub: string; email?: string; aal?: string; user_metadata?: Record<string, unknown> }): Promise<Vista | null> {
  const jar = await cookies();
  const clientId = jar.get(VISTA_COOKIE)?.value;
  if (!clientId) return null;
  const r = await resolverEquipo(claims);
  if (r.estado !== "equipo") return null;
  if (!sesionVerificada(claims as Parameters<typeof sesionVerificada>[0], jar.get(MFA_COOKIE)?.value)) return null;
  const c = await prisma.client.findFirst({ where: { id: clientId, userId: r.user.id, internal: false }, select: { id: true } });
  if (!c) return null;
  return { clientId: c.id, empresaUserId: r.user.id, revisor: r.user.miembro.fullName || r.user.miembro.email };
}

export const revisionVigente = (at: Date | null | undefined, ahora = Date.now()) => !!at && ahora - at.getTime() < REVISION_VIGENTE_MS;
