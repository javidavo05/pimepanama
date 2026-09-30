import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Llaves de acceso del usuario (Touch ID, Face ID, huella). */
export const GET = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  const passkeys = await prisma.passkey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, vaultAccess: true, lastUsedAt: true, createdAt: true },
  });
  return NextResponse.json({ passkeys });
});
