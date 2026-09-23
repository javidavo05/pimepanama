import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { ensurePlatformsSeeded } from "@/lib/platforms-bootstrap";
import { syncPlatformsForUser } from "@/lib/platforms-sync";
import { PlatformsBoard } from "./platforms-board";
import { hasPlatformVault } from "@/lib/platform-vault-shared";

export const metadata = { title: "Platforms — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function PlatformsPage() {
  const user = await getEmpresaUser();
  await ensurePlatformsSeeded(user.id);
  await syncPlatformsForUser(user.id);

  const [platforms, proAccounts] = await Promise.all([
    prisma.platform.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.platformAccount.findMany({
      where: { userId: user.id, plan: "PRO" },
      select: { provider: true, email: true },
    }),
  ]);

  return (
    <div className="w-full max-w-6xl">
      <PlatformsBoard
        initialProAccounts={proAccounts.map((a) => `${a.provider}:${a.email}`)}
        initialPlatforms={platforms.map((p) => ({
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
        }))}
      />
    </div>
  );
}
