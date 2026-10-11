import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { guardarCuenta } from "@/lib/github/cuentas";

export const runtime = "nodejs";

/**
 * Cuentas de GitHub del equipo (migración 0040). Cada token se guarda cifrado con la misma clave que las
 * contraseñas de correo, en su cuenta: los repos de Pime viven en varias cuentas (como en Git PIME) y cada
 * proyecto lee el suyo con la que tiene acceso. Los tokens nunca se devuelven: solo qué cuentas hay.
 */

export const GET = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const cuentas = await prisma.githubAccount.findMany({ where: { userId: user.id }, orderBy: { login: "asc" }, select: { login: true, source: true, lastCheckedAt: true, lastError: true, _count: { select: { projects: true } } } });
  return NextResponse.json({
    connected: cuentas.length > 0 || Boolean(user.githubTokenEnc),
    accounts: cuentas.map((c) => ({ login: c.login, source: c.source, checkedAt: c.lastCheckedAt, error: c.lastError, projects: c._count.projects })),
  });
});

/** Agrega una cuenta (o renueva su token). GitHub dice de quién es el token antes de guardarlo. */
export const POST = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "Pega el token de GitHub." }, { status: 400 });
  const r = await guardarCuenta(user.id, token, "manual");
  if (!r.ok) return NextResponse.json({ error: `${r.error} Debe tener permiso de lectura de repositorios.` }, { status: 400 });
  return NextResponse.json({ ok: true, login: r.login, nueva: r.nueva });
});

/** Quita una cuenta (?login=) o, sin login, el token viejo del usuario. */
export const DELETE = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const login = new URL(req.url).searchParams.get("login");
  if (login) {
    await prisma.githubAccount.deleteMany({ where: { userId: user.id, login: { equals: login, mode: "insensitive" } } });
  } else {
    await prisma.empresaUser.update({ where: { id: user.id }, data: { githubTokenEnc: null } });
  }
  return NextResponse.json({ ok: true });
});
