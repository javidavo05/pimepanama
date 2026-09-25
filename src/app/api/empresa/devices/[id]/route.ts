import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Desvincula: la app pierde el acceso en su siguiente consulta. */
export const DELETE = withEmpresaIdRoute(async (request, { params }) => {
  const user = await requireEmpresaUser(request);
  const { id } = await params;
  const { count } = await prisma.deviceToken.updateMany({
    where: { id, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
