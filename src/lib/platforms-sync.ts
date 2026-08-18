import { prisma } from "@/lib/prisma";
import { PLATFORMS_SEED, normEmail, normSlot } from "@/lib/platforms-seed";
import { DEFAULT_SLOT_CAPACITY } from "@/lib/platform-slots";

const SEED_BY_NAME = new Map(
  PLATFORMS_SEED.map((row) => [row.name.trim().toLowerCase(), row])
);

function seedPayload(row: (typeof PLATFORMS_SEED)[number]) {
  return {
    accessUrl: row.accessUrl ?? null,
    supabaseEmail: normEmail(row.supabaseEmail),
    supabaseSlot: normSlot(row.supabaseSlot),
    vercelEmail: normEmail(row.vercelEmail),
    vercelSlot: normSlot(row.vercelSlot),
    linkUrl: row.linkUrl ?? null,
    githubEmail: normEmail(row.githubEmail),
    brevoEmail: normEmail(row.brevoEmail),
    notes: row.notes ?? null,
    sortOrder: row.sortOrder,
  };
}

/** Ajusta cupos inválidos o duplicados en el mismo correo+proveedor. */
function reconcileSlots<
  T extends {
    id: string;
    name: string;
    supabaseEmail: string | null;
    supabaseSlot: number | null;
    vercelEmail: string | null;
    vercelSlot: number | null;
    sortOrder: number;
  },
>(platforms: T[]): Map<string, { supabaseSlot: number | null; vercelSlot: number | null }> {
  const updates = new Map<string, { supabaseSlot: number | null; vercelSlot: number | null }>();

  for (const provider of ["supabase", "vercel"] as const) {
    const emailKey = provider === "supabase" ? "supabaseEmail" : "vercelEmail";
    const slotKey = provider === "supabase" ? "supabaseSlot" : "vercelSlot";

    const byEmail = new Map<string, T[]>();
    for (const p of platforms) {
      const email = p[emailKey];
      if (!email) continue;
      const list = byEmail.get(email) ?? [];
      list.push(p);
      byEmail.set(email, list);
    }

    for (const refs of byEmail.values()) {
      const sorted = [...refs].sort((a, b) => a.sortOrder - b.sortOrder);
      const taken = new Set<number>();

      for (const p of sorted) {
        let slot = p[slotKey];
        if (slot != null && (slot < 1 || slot > DEFAULT_SLOT_CAPACITY)) {
          slot = null;
        }
        if (slot != null && taken.has(slot)) {
          slot = null;
        }
        if (slot == null) {
          for (let n = 1; n <= DEFAULT_SLOT_CAPACITY; n++) {
            if (!taken.has(n)) {
              slot = n;
              break;
            }
          }
        }
        if (slot != null) taken.add(slot);

        const prev = updates.get(p.id) ?? {
          supabaseSlot: p.supabaseSlot,
          vercelSlot: p.vercelSlot,
        };
        updates.set(p.id, {
          ...prev,
          [slotKey]: slot,
        });
      }
    }
  }

  return updates;
}

/**
 * Sincroniza plataformas del usuario con PLATFORMS_SEED (por nombre)
 * y reconcilia cupos duplicados o fuera de rango.
 */
export async function syncPlatformsForUser(userId: string): Promise<number> {
  const existing = await prisma.platform.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  let changed = 0;

  // Corregir cupos inválidos en BD (ej. 11) aunque no estén en el seed
  for (const platform of existing) {
    const sb = normSlot(platform.supabaseSlot);
    const vc = normSlot(platform.vercelSlot);
    if (platform.supabaseSlot !== sb || platform.vercelSlot !== vc) {
      await prisma.platform.update({
        where: { id: platform.id },
        data: { supabaseSlot: sb, vercelSlot: vc },
      });
      changed++;
    }
  }

  const afterSanitize = changed > 0
    ? await prisma.platform.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } })
    : existing;

  for (const platform of afterSanitize) {
    const seed = SEED_BY_NAME.get(platform.name.trim().toLowerCase());
    if (!seed) continue;

    const data = seedPayload(seed);
    const needsUpdate =
      platform.accessUrl !== data.accessUrl ||
      platform.supabaseEmail?.toLowerCase() !== data.supabaseEmail ||
      platform.supabaseSlot !== data.supabaseSlot ||
      platform.vercelEmail?.toLowerCase() !== data.vercelEmail ||
      platform.vercelSlot !== data.vercelSlot ||
      platform.linkUrl !== data.linkUrl ||
      platform.githubEmail?.toLowerCase() !== data.githubEmail ||
      platform.brevoEmail?.toLowerCase() !== data.brevoEmail ||
      platform.notes !== data.notes ||
      platform.sortOrder !== data.sortOrder;

    if (needsUpdate) {
      await prisma.platform.update({
        where: { id: platform.id },
        data,
      });
      changed++;
    }
  }

  const refreshed = await prisma.platform.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  const slotFixes = reconcileSlots(refreshed);
  for (const [id, slots] of slotFixes) {
    const p = refreshed.find((x) => x.id === id);
    if (!p) continue;
    if (p.supabaseSlot === slots.supabaseSlot && p.vercelSlot === slots.vercelSlot) continue;
    await prisma.platform.update({
      where: { id },
      data: {
        supabaseSlot: slots.supabaseSlot,
        vercelSlot: slots.vercelSlot,
      },
    });
    changed++;
  }

  return changed;
}
