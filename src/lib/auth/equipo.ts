/**
 * Quién entra a /empresa. Antes cualquier sesión de Supabase recibía un EmpresaUser al primer
 * pedido; con cuentas de clientes eso le abriría el panel a un cliente. Ahora:
 *   - EmpresaUser existente → equipo.
 *   - Persona de un cliente (ClientUser) → nunca es equipo; va a /cliente.
 *   - Correo en EMPRESA_STAFF_EMAILS (lista separada por comas) → se crea su EmpresaUser.
 *   - Cualquier otra sesión → sin acceso.
 */
import { prisma } from "@/lib/prisma";
import type { EmpresaUser, CompanyConfig } from "@prisma/client";

export type EmpresaUserWithConfig = EmpresaUser & { config: CompanyConfig | null };
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
  if (user) return { estado: "equipo", user };

  const cliente = await prisma.clientUser.findUnique({ where: { supabaseUid: claims.sub }, select: { id: true } });
  if (cliente) return { estado: "cliente" };

  if (claims.email && correoDelEquipo(claims.email)) {
    const nuevo = await prisma.empresaUser.create({
      data: { supabaseUid: claims.sub, email: claims.email, fullName: (claims.user_metadata?.full_name as string | undefined) ?? null },
      include: { config: true },
    });
    return { estado: "equipo", user: nuevo };
  }
  return { estado: "sin_acceso" };
}
