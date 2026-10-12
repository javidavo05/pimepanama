import { prisma } from "@/lib/prisma";
import { accountKey, clampPlatformSlot, SUPABASE_FREE_SLOTS } from "@/lib/platform-slots";

type SlotRow = {
  id: string;
  supabaseEmail: string | null;
  supabaseSlot: number | null;
  sortOrder: number;
};

/**
 * Cupos de Supabase gratis: inválidos (ej. 11) o repetidos en el mismo correo se corrigen al primero libre.
 * Vercel ya no numera cupos (200 por cuenta) y las cuentas Pro tampoco: ahí no se toca nada.
 */
export function reconcileSupabaseSlots(platforms: SlotRow[], proAccounts: ReadonlySet<string>): Map<string, number | null> {
  const updates = new Map<string, number | null>();
  const byEmail = new Map<string, SlotRow[]>();
  for (const p of platforms) {
    if (!p.supabaseEmail || proAccounts.has(accountKey("supabase", p.supabaseEmail))) continue;
    const list = byEmail.get(p.supabaseEmail) ?? [];
    list.push(p);
    byEmail.set(p.supabaseEmail, list);
  }

  for (const refs of byEmail.values()) {
    const sorted = [...refs].sort((a, b) => a.sortOrder - b.sortOrder);
    const taken = new Set<number>();
    for (const p of sorted) {
      let slot = clampPlatformSlot(p.supabaseSlot);
      if (slot != null && taken.has(slot)) slot = null;
      if (slot == null) {
        for (let n = 1; n <= SUPABASE_FREE_SLOTS; n++) {
          if (!taken.has(n)) {
            slot = n;
            break;
          }
        }
      }
      if (slot != null) taken.add(slot);
      if (slot !== p.supabaseSlot) updates.set(p.id, slot);
    }
  }
  return updates;
}

/** Reconcilia los cupos de Supabase gratis. Devuelve cuántas plataformas cambió. */
export async function syncPlatformsForUser(userId: string): Promise<number> {
  const [platforms, pro] = await Promise.all([
    prisma.platform.findMany({
      where: { userId },
      select: { id: true, supabaseEmail: true, supabaseSlot: true, sortOrder: true },
    }),
    prisma.platformAccount.findMany({ where: { userId, plan: "PRO" }, select: { provider: true, email: true } }),
  ]);
  const proKeys = new Set(pro.map((a) => accountKey(a.provider as "supabase", a.email)));
  const fixes = reconcileSupabaseSlots(platforms, proKeys);
  if (fixes.size === 0) return 0;
  await prisma.$transaction(
    [...fixes].map(([id, supabaseSlot]) => prisma.platform.update({ where: { id }, data: { supabaseSlot } }))
  );
  return fixes.size;
}
