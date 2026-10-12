import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { datosDePlataforma, DatosInvalidos, serializarPlataforma } from "@/lib/platforms/datos";

export const runtime = "nodejs";

export const PATCH = withEmpresaIdRoute(async (req, { params }) => {
  const { id } = await params;
  const user = await requireEmpresaUser(req);
  const existing = await prisma.platform.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Esa plataforma ya no existe." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const data = await datosDePlataforma(user.id, body, existing);
    const platform = await prisma.platform.update({ where: { id }, data });
    return NextResponse.json(serializarPlataforma(platform));
  } catch (e) {
    if (e instanceof DatosInvalidos) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
});

export const DELETE = withEmpresaIdRoute(async (req, { params }) => {
  const { id } = await params;
  const user = await requireEmpresaUser(req);
  const { count } = await prisma.platform.deleteMany({ where: { id, userId: user.id } });
  if (!count) return NextResponse.json({ error: "Esa plataforma ya no existe." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
