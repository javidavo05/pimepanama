import { prisma } from "@/lib/prisma";
import { exigirSeccion } from "@/lib/auth/exigir";
import { VISTA_COOKIE, irA } from "@/lib/portal/vista";

/**
 * Abre la vista de revisión de un cliente: la cuenta tal como la verá el cliente, en solo lectura.
 * Disponible siempre para cada cliente de la empresa, tenga o no personas invitadas.
 */
export async function GET(request: Request) {
  const u = await exigirSeccion("clientes");
  const id = new URL(request.url).searchParams.get("cliente") ?? "";
  const c = await prisma.client.findFirst({ where: { id, userId: u.id }, select: { id: true, internal: true } });
  if (!c) return irA("/empresa/clientes");
  if (c.internal) return irA(`/empresa/clientes/${c.id}?tab=cuenta`);
  const r = irA("/cliente");
  r.cookies.set(VISTA_COOKIE, c.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 2 * 3600 });
  return r;
}
