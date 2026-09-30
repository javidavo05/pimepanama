import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const DELETE = withEmpresaIdRoute(async (request, { params }) => {
  const { id } = await params;
  const user = await requireEmpresaUser(request);
  const { count } = await prisma.passkey.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
