import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { ensurePlatformsSeeded } from "@/lib/platforms-bootstrap";
import { datosDePlataforma, DatosInvalidos, serializarPlataforma } from "@/lib/platforms/datos";

export const runtime = "nodejs";

export const GET = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  await ensurePlatformsSeeded(user.id);
  const platforms = await prisma.platform.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json(platforms.map(serializarPlataforma));
});

/** Crea una plataforma con todo lo del asistente: cliente, proyecto, repo, Vercel, Supabase y accesos. */
export const POST = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!String(body.name ?? "").trim()) return NextResponse.json({ error: "Ponle un nombre a la plataforma." }, { status: 400 });
  try {
    const [data, maxOrder] = await Promise.all([
      datosDePlataforma(user.id, body),
      prisma.platform.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } }),
    ]);
    const platform = await prisma.platform.create({
      data: { ...data, name: String(data.name), userId: user.id, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
    });
    return NextResponse.json(serializarPlataforma(platform), { status: 201 });
  } catch (e) {
    if (e instanceof DatosInvalidos) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
});
