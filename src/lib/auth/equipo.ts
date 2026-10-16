/**
 * Quién entra a /empresa. Antes cualquier sesión de Supabase recibía un EmpresaUser al primer
 * pedido; con cuentas de clientes eso le abriría el panel a un cliente. Ahora:
 *   - EmpresaUser existente → equipo.
 *   - Persona de un cliente (ClientUser) → nunca es equipo; va a /cliente.
 *   - Correo en EMPRESA_STAFF_EMAILS (lista separada por comas) → se crea su EmpresaUser.
 *   - Correo con invitación vigente (EmpresaInvite) → se crea su EmpresaUser como miembro del dueño que invitó.
 *   - Cualquier otra sesión → sin acceso.
 *
 * Equipo con datos compartidos (migración 0056): un miembro (ownerId = dueño) trabaja sobre los datos del dueño.
 * Por eso `user` es el registro del dueño (su id filtra todos los datos) y `user.miembro` es quién entró de verdad:
 * lo personal (huella, avisos al celular, dispositivos) se guarda con `miembro.id`.
 */
import { prisma } from "@/lib/prisma";
import type { EmpresaUser, CompanyConfig } from "@prisma/client";

export type Miembro = { id: string; email: string; fullName: string | null; area: string; esDueno: boolean };
export type EmpresaUserWithConfig = EmpresaUser & { config: CompanyConfig | null; miembro: Miembro };

const miembroDe = (u: EmpresaUser): Miembro => ({ id: u.id, email: u.email, fullName: u.fullName, area: u.ownerId ? u.area : "dueno", esDueno: !u.ownerId });

/** El registro con el que se leen los datos: el del dueño si es miembro, el propio si es el dueño. */
async function conDatosDeLaEmpresa(u: EmpresaUser & { config: CompanyConfig | null }): Promise<EmpresaUserWithConfig | null> {
  if (!u.ownerId) return { ...u, miembro: miembroDe(u) };
  const dueno = await prisma.empresaUser.findUnique({ where: { id: u.ownerId }, include: { config: true } });
  if (!dueno) return null;
  return { ...dueno, miembro: miembroDe(u) };
}
export type ResultadoEquipo =
  | { estado: "equipo"; user: EmpresaUserWithConfig }
  | { estado: "cliente" }
  | { estado: "sin_acceso" };

export function correoDelEquipo(email: string | null | undefined): boolean {
  if (!email) return false;
  const lista = (process.env.EMPRESA_STAFF_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return lista.includes(email.trim().toLowerCase());
}

export async function resolverEquipo(claims: { sub: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<ResultadoEquipo> {
  const user = await prisma.empresaUser.findUnique({ where: { supabaseUid: claims.sub }, include: { config: true } });
  if (user) {
    if (!user.activo) return { estado: "sin_acceso" };
    const conDatos = await conDatosDeLaEmpresa(user);
    return conDatos ? { estado: "equipo", user: conDatos } : { estado: "sin_acceso" };
  }

  const cliente = await prisma.clientUser.findUnique({ where: { supabaseUid: claims.sub }, select: { id: true } });
  if (cliente) return { estado: "cliente" };

  if (claims.email) {
    const email = claims.email.trim().toLowerCase();
    const invitacion = await prisma.empresaInvite.findFirst({ where: { email, acceptedAt: null, revokedAt: null } });
    if (invitacion) {
      const nuevo = await prisma.empresaUser.create({
        data: { supabaseUid: claims.sub, email: claims.email, fullName: invitacion.fullName ?? (claims.user_metadata?.full_name as string | undefined) ?? null, ownerId: invitacion.ownerId, area: invitacion.area },
        include: { config: true },
      });
      await prisma.empresaInvite.update({ where: { id: invitacion.id }, data: { acceptedAt: new Date() } });
      const conDatos = await conDatosDeLaEmpresa(nuevo);
      return conDatos ? { estado: "equipo", user: conDatos } : { estado: "sin_acceso" };
    }
  }

  if (claims.email && correoDelEquipo(claims.email)) {
    const nuevo = await prisma.empresaUser.create({
      data: { supabaseUid: claims.sub, email: claims.email, fullName: (claims.user_metadata?.full_name as string | undefined) ?? null },
      include: { config: true },
    });
    return { estado: "equipo", user: { ...nuevo, miembro: miembroDe(nuevo) } };
  }
  return { estado: "sin_acceso" };
}
