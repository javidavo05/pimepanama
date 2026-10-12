import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { syncPlatformsForUser } from "@/lib/platforms-sync";
import { serializarPlataforma } from "@/lib/platforms/datos";

export const runtime = "nodejs";

/** Corrige cupos de Supabase gratis repetidos o inválidos y devuelve las plataformas. */
export const POST = withEmpresaRoute(async (req) => {
  const user = await requireEmpresaUser(req);
  const changed = await syncPlatformsForUser(user.id);
  const platforms = await prisma.platform.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ changed, platforms: platforms.map(serializarPlataforma) });
});
