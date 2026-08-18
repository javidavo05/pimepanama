/** Máximo de proyectos por correo en Supabase / Vercel (plan free). */
export const DEFAULT_SLOT_CAPACITY = 2;

export type SlotProvider = "supabase" | "vercel";

export type PlatformSlotRef = {
  platformId: string;
  platformName: string;
  slot: number | null;
};

export type EmailSlotInventory = {
  provider: SlotProvider;
  email: string;
  capacity: number;
  /** Plataforma asignada a cada número de cupo (1-based). */
  bySlot: Map<number, PlatformSlotRef>;
  /** Sin número de cupo definido. */
  unassigned: PlatformSlotRef[];
  used: number;
  available: number;
  freeSlots: number[];
  conflicts: Array<{ slot: number; platforms: string[] }>;
};

export type PlatformSlotRow = {
  id: string;
  name: string;
  supabaseEmail: string | null;
  supabaseSlot: number | null;
  vercelEmail: string | null;
  vercelSlot: number | null;
};

export function normalizePlatformEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

/** Solo cupos válidos 1..capacity; cualquier otro valor (ej. 11) → null. */
export function clampPlatformSlot(
  slot: number | null | undefined,
  capacity = DEFAULT_SLOT_CAPACITY
): number | null {
  if (slot == null) return null;
  const n = Math.round(slot);
  if (n < 1 || n > capacity) return null;
  return n;
}

function addAssignment(
  map: Map<string, PlatformSlotRef[]>,
  email: string,
  ref: PlatformSlotRef
) {
  const key = normalizePlatformEmail(email);
  if (!key) return;
  const list = map.get(key) ?? [];
  list.push(ref);
  map.set(key, list);
}

function buildInventoryForProvider(
  provider: SlotProvider,
  byEmail: Map<string, PlatformSlotRef[]>,
  capacity: number
): EmailSlotInventory[] {
  const result: EmailSlotInventory[] = [];

  for (const [email, refs] of [...byEmail.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const bySlot = new Map<number, PlatformSlotRef>();
    const unassigned: PlatformSlotRef[] = [];
    const slotGroups = new Map<number, string[]>();

    for (const ref of refs) {
      if (ref.slot == null || ref.slot < 1) {
        unassigned.push(ref);
        continue;
      }
      if (!bySlot.has(ref.slot)) {
        bySlot.set(ref.slot, ref);
      }
      const names = slotGroups.get(ref.slot) ?? [];
      names.push(ref.platformName);
      slotGroups.set(ref.slot, names);
    }

    const conflicts = [...slotGroups.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([slot, platforms]) => ({ slot, platforms }));

    const occupiedSlots = new Set(bySlot.keys());
    const freeSlots: number[] = [];
    for (let n = 1; n <= capacity; n++) {
      if (!occupiedSlots.has(n)) freeSlots.push(n);
    }

    // Cupo sin número cuenta como 1 uso pero no bloquea un número concreto
    const used = occupiedSlots.size + unassigned.length;
    const available = Math.max(0, capacity - used);

    result.push({
      provider,
      email,
      capacity,
      bySlot,
      unassigned,
      used,
      available,
      freeSlots,
      conflicts,
    });
  }

  return result;
}

export function buildSlotInventories(
  platforms: PlatformSlotRow[],
  capacity = DEFAULT_SLOT_CAPACITY
): { supabase: EmailSlotInventory[]; vercel: EmailSlotInventory[] } {
  const supabaseMap = new Map<string, PlatformSlotRef[]>();
  const vercelMap = new Map<string, PlatformSlotRef[]>();

  for (const p of platforms) {
    if (p.supabaseEmail) {
      addAssignment(supabaseMap, p.supabaseEmail, {
        platformId: p.id,
        platformName: p.name,
        slot: clampPlatformSlot(p.supabaseSlot, capacity),
      });
    }
    if (p.vercelEmail) {
      addAssignment(vercelMap, p.vercelEmail, {
        platformId: p.id,
        platformName: p.name,
        slot: clampPlatformSlot(p.vercelSlot, capacity),
      });
    }
  }

  return {
    supabase: buildInventoryForProvider("supabase", supabaseMap, capacity),
    vercel: buildInventoryForProvider("vercel", vercelMap, capacity),
  };
}

export function slotStatusColor(available: number, capacity: number): string {
  if (available <= 0) return "text-red-400 border-red-500/30 bg-red-500/10";
  if (available < capacity) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-green-400 border-green-500/30 bg-green-500/10";
}
