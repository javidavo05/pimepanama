/**
 * Uso de las cuentas de Supabase y Vercel por plan.
 *
 * - Vercel Hobby: 200 proyectos por cuenta. Con tanto margen los números de cupo no aportan: se muestra
 *   el uso ("12 de 200").
 * - Supabase Free: 2 proyectos por cuenta. Ahí sí se numeran los cupos (1 y 2) para saber cuál se libera.
 * - Pro (en los dos): sin límite.
 */

export type SlotProvider = "supabase" | "vercel";
export type AccountPlan = "FREE" | "PRO";

export const PLAN_CAPACITY: Record<SlotProvider, number> = {
  vercel: 200,
  supabase: 2,
};

/** Cupos numerados solo en Supabase Free (2). */
export const SUPABASE_FREE_SLOTS = PLAN_CAPACITY.supabase;

export const PLAN_LABEL: Record<SlotProvider, Record<AccountPlan, string>> = {
  vercel: { FREE: "Hobby", PRO: "Pro" },
  supabase: { FREE: "Free", PRO: "Pro" },
};

export function capacityFor(provider: SlotProvider, pro: boolean): number {
  return pro ? Number.POSITIVE_INFINITY : PLAN_CAPACITY[provider];
}

/** ¿Esta cuenta numera sus cupos? Solo Supabase gratis. */
export function usesSlotNumbers(provider: SlotProvider, pro: boolean): boolean {
  return provider === "supabase" && !pro;
}

export type PlatformSlotRef = {
  platformId: string;
  platformName: string;
  slot: number | null;
};

/**
 * - pro: plan pagado, sin límite.
 * - space: le queda al menos un cupo.
 * - full: usa exactamente su capacidad.
 * - over: tiene más proyectos de los que admite el plan.
 */
export type AccountStatus = "pro" | "space" | "full" | "over";

export type EmailSlotInventory = {
  provider: SlotProvider;
  email: string;
  pro: boolean;
  /** Infinity en Pro. */
  capacity: number;
  /** Plataformas registradas aquí con esa cuenta. */
  platforms: PlatformSlotRef[];
  /** Proyectos que la API dice que tiene la cuenta (si hay token y caché); null si no se sabe. */
  liveUsed: number | null;
  /** Lo que cuenta para el límite: el número real de la API si se sabe; si no, lo registrado aquí. */
  used: number;
  available: number;
  /** Solo Supabase gratis: plataforma por número de cupo (1-based). */
  bySlot: Map<number, PlatformSlotRef>;
  /** Solo Supabase gratis: sin número de cupo. */
  unassigned: PlatformSlotRef[];
  freeSlots: number[];
  conflicts: Array<{ slot: number; platforms: string[] }>;
  status: AccountStatus;
};

export function accountKey(provider: SlotProvider, email: string | null | undefined): string {
  return `${provider}:${normalizePlatformEmail(email)}`;
}

/** "vercel:a@b.com" → ["vercel", "a@b.com"] */
export function splitAccountKey(key: string): [SlotProvider, string] {
  const i = key.indexOf(":");
  return [key.slice(0, i) as SlotProvider, key.slice(i + 1)];
}

export type PlatformSlotRow = {
  id: string;
  name: string;
  supabaseEmail: string | null;
  supabaseSlot: number | null;
  vercelEmail: string | null;
};

export function normalizePlatformEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

/** Solo cupos válidos de Supabase gratis (1..2); cualquier otro valor (ej. 11) → null. */
export function clampPlatformSlot(slot: number | null | undefined, capacity = SUPABASE_FREE_SLOTS): number | null {
  if (slot == null) return null;
  const n = Math.round(slot);
  if (n < 1 || n > capacity) return null;
  return n;
}

/** "12 de 200", "1 de 2", "12 · sin límite". */
export function usageLabel(inv: Pick<EmailSlotInventory, "used" | "capacity" | "pro">): string {
  return inv.pro ? `${inv.used} · sin límite` : `${inv.used} de ${inv.capacity}`;
}

function buildInventory(
  provider: SlotProvider,
  email: string,
  refs: PlatformSlotRef[],
  pro: boolean,
  liveUsed: number | null
): EmailSlotInventory {
  const capacity = capacityFor(provider, pro);
  const numbered = usesSlotNumbers(provider, pro);
  const bySlot = new Map<number, PlatformSlotRef>();
  const unassigned: PlatformSlotRef[] = [];
  const slotGroups = new Map<number, string[]>();

  if (numbered) {
    for (const ref of refs) {
      if (ref.slot == null || ref.slot < 1) {
        unassigned.push(ref);
        continue;
      }
      if (!bySlot.has(ref.slot)) bySlot.set(ref.slot, ref);
      const names = slotGroups.get(ref.slot) ?? [];
      names.push(ref.platformName);
      slotGroups.set(ref.slot, names);
    }
  }

  const conflicts = [...slotGroups.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([slot, platforms]) => ({ slot, platforms }));

  const freeSlots: number[] = [];
  if (numbered) for (let n = 1; n <= capacity; n++) if (!bySlot.has(n)) freeSlots.push(n);

  // La API manda: la cuenta puede tener proyectos que no están registrados aquí.
  const used = Math.max(liveUsed ?? 0, refs.length);
  const available = pro ? Number.POSITIVE_INFINITY : Math.max(0, capacity - used);
  const status: AccountStatus = pro ? "pro" : used > capacity ? "over" : used === capacity ? "full" : "space";

  return {
    provider,
    email,
    pro,
    capacity,
    platforms: refs,
    liveUsed,
    used,
    available,
    bySlot,
    unassigned,
    freeSlots,
    conflicts,
    status,
  };
}

/**
 * Inventario por cuenta (proveedor + correo). Incluye las cuentas registradas en PlatformAccount aunque
 * ninguna plataforma las use todavía (`extraAccounts`).
 */
export function buildSlotInventories(
  platforms: PlatformSlotRow[],
  proAccounts: ReadonlySet<string> = new Set(),
  liveUsed: ReadonlyMap<string, number> = new Map(),
  extraAccounts: Iterable<string> = []
): { supabase: EmailSlotInventory[]; vercel: EmailSlotInventory[] } {
  const maps: Record<SlotProvider, Map<string, PlatformSlotRef[]>> = { supabase: new Map(), vercel: new Map() };

  for (const key of extraAccounts) {
    const [provider, email] = splitAccountKey(key);
    if ((provider === "supabase" || provider === "vercel") && email && !maps[provider].has(email)) maps[provider].set(email, []);
  }

  for (const p of platforms) {
    const add = (provider: SlotProvider, email: string | null, slot: number | null) => {
      const key = normalizePlatformEmail(email);
      if (!key) return;
      const list = maps[provider].get(key) ?? [];
      list.push({ platformId: p.id, platformName: p.name, slot });
      maps[provider].set(key, list);
    };
    add("supabase", p.supabaseEmail, clampPlatformSlot(p.supabaseSlot));
    add("vercel", p.vercelEmail, null);
  }

  const build = (provider: SlotProvider) =>
    [...maps[provider].entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([email, refs]) => {
        const key = accountKey(provider, email);
        return buildInventory(provider, email, refs, proAccounts.has(key), liveUsed.get(key) ?? null);
      });

  return { supabase: build("supabase"), vercel: build("vercel") };
}
