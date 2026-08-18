import { prisma } from "@/lib/prisma";
import { PLATFORMS_SEED } from "@/lib/platforms-seed";

/** Si el usuario no tiene plataformas, inserta el seed del Excel. */
export async function ensurePlatformsSeeded(userId: string): Promise<void> {
  const count = await prisma.platform.count({ where: { userId } });
  if (count > 0) return;

  await prisma.platform.createMany({
    data: PLATFORMS_SEED.map((row) => ({
      userId,
      name: row.name,
      accessUrl: row.accessUrl ?? null,
      supabaseEmail: row.supabaseEmail ?? null,
      supabaseSlot: row.supabaseSlot ?? null,
      vercelEmail: row.vercelEmail ?? null,
      vercelSlot: row.vercelSlot ?? null,
      linkUrl: row.linkUrl ?? null,
      githubEmail: row.githubEmail ?? null,
      brevoEmail: row.brevoEmail ?? null,
      notes: row.notes ?? null,
      sortOrder: row.sortOrder,
    })),
  });
}
