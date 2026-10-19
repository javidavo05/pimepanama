import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSeccion } from "@/lib/auth/exigir";
import { VISTA_COOKIE } from "@/lib/portal/vista";

/**
 * Abre la vista de revisión de un cliente: la cuenta tal como la verá el cliente, en solo lectura.
 * Disponible siempre para cada cliente de la empresa, tenga o no personas invitadas.
 */
export async function GET(request: Request) {
  const u = await exigirSeccion("clientes");
  const id = new URL(request.url).searchParams.get("cliente") ?? "";
  const c = await prisma.client.findFirst({ where: { id, userId: u.id }, select: { id: true, internal: true } });
  if (!c) return NextResponse.redirect(new URL("/empresa/clientes", request.url), 303);
  if (c.internal) return NextResponse.redirect(new URL(`/empresa/clientes/${c.id}?tab=cuenta`, request.url), 303);
  const r = NextResponse.redirect(new URL("/cliente", request.url), 303);
  r.cookies.set(VISTA_COOKIE, c.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 2 * 3600 });
  return r;
}
