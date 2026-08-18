import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { syncPlatformsForUser } from "@/lib/platforms-sync";
import { hasPlatformVault } from "@/lib/platform-vault-shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const changed = await syncPlatformsForUser(user.id);
    const platforms = await prisma.platform.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({
      changed,
      platforms: platforms.map((p) => ({
        id: p.id,
        name: p.name,
        accessUrl: p.accessUrl,
        supabaseEmail: p.supabaseEmail,
        supabaseSlot: p.supabaseSlot,
        vercelEmail: p.vercelEmail,
        vercelSlot: p.vercelSlot,
        linkUrl: p.linkUrl,
        githubEmail: p.githubEmail,
        brevoEmail: p.brevoEmail,
        notes: p.notes,
        hasConfidential: hasPlatformVault(p.confidentialVault),
        sortOrder: p.sortOrder,
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
