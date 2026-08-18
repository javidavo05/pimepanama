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

  const platforms = await prisma.platform.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold tracking-tight">Platforms</h1>
        <p className="text-white/50 text-sm mt-1">
          Registro de accesos, cuentas Supabase/Vercel y enlaces por proyecto.
        </p>
      </div>
      <PlatformsBoard
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
