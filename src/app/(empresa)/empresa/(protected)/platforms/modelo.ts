/** Lo que se deriva de los datos de Platforms en el navegador: uso por cuenta, problemas y búsqueda. */
import { accountKey, buildSlotInventories, type EmailSlotInventory, type SlotProvider } from "@/lib/platform-slots";
import type { PlatformLiveSummary, ProviderAccount, SerializedPlatform } from "@/lib/platforms/tipos";

export const PROVIDER_LABEL: Record<SlotProvider, string> = { supabase: "Supabase", vercel: "Vercel" };

export type Inventarios = {
  byKey: Map<string, EmailSlotInventory>;
  vercel: EmailSlotInventory[];
  supabase: EmailSlotInventory[];
};

export function inventarios(platforms: SerializedPlatform[], accounts: ProviderAccount[]): Inventarios {
  const pro = new Set(accounts.filter((a) => a.plan === "PRO").map((a) => accountKey(a.provider, a.email)));
  const live = new Map<string, number>();
  for (const a of accounts) if (a.liveUsed != null) live.set(accountKey(a.provider, a.email), a.liveUsed);
  const inv = buildSlotInventories(platforms, pro, live, accounts.map((a) => accountKey(a.provider, a.email)));
  const byKey = new Map<string, EmailSlotInventory>();
  for (const i of [...inv.vercel, ...inv.supabase]) byKey.set(accountKey(i.provider, i.email), i);
  return { byKey, vercel: inv.vercel, supabase: inv.supabase };
}

export type Problema = { texto: string; grave: boolean };

/** Problemas de una plataforma, en palabras. */
export function problemasDe(
  p: SerializedPlatform,
  inv: Inventarios,
  accounts: Map<string, ProviderAccount>,
  live: PlatformLiveSummary | undefined
): Problema[] {
  const out: Problema[] = [];
  for (const provider of ["vercel", "supabase"] as const) {
    const email = provider === "vercel" ? p.vercelEmail : p.supabaseEmail;
    if (!email) continue;
    const key = accountKey(provider, email);
    const i = inv.byKey.get(key);
    if (i?.status === "over") out.push({ texto: `La cuenta de ${PROVIDER_LABEL[provider]} tiene ${i.used} proyectos y su plan admite ${i.capacity}.`, grave: true });
    if (provider === "supabase" && i && !i.pro) {
      const ref = i.platforms.find((r) => r.platformId === p.id);
      if (ref && ref.slot == null && i.status !== "over") out.push({ texto: "Sin número de cupo en Supabase.", grave: false });
      const c = i.conflicts.find((x) => x.slot === ref?.slot);
      if (c) out.push({ texto: `Comparte el cupo ${c.slot} de Supabase con ${c.platforms.filter((n) => n !== p.name).join(", ")}.`, grave: false });
    }
    const a = accounts.get(key);
    if (a?.hasToken && a.lastError) out.push({ texto: `${PROVIDER_LABEL[provider]}: ${a.lastError}`, grave: true });
  }
  if (live?.vercelState === "ERROR") out.push({ texto: "Falló el último deploy en Vercel.", grave: true });
  if (live?.supabaseStatus === "INACTIVE") out.push({ texto: "El proyecto de Supabase está pausado: el sistema no tiene base.", grave: true });
  if (live?.supabaseStatus === "ACTIVE_UNHEALTHY") out.push({ texto: "El proyecto de Supabase tiene fallas.", grave: true });
  return out;
}

/** ¿Alguna de sus cuentas está llena o excedida? */
export function cuentaLlena(p: SerializedPlatform, inv: Inventarios): boolean {
  return (
    (["vercel", "supabase"] as const).some((provider) => {
      const email = provider === "vercel" ? p.vercelEmail : p.supabaseEmail;
      const s = email ? inv.byKey.get(accountKey(provider, email))?.status : undefined;
      return s === "full" || s === "over";
    })
  );
}

export function puntaje(p: SerializedPlatform, q: string, extra: string[]): number {
  const name = p.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 65;
  const hay = [p.accessUrl, p.linkUrl, p.supabaseEmail, p.vercelEmail, p.githubEmail, p.brevoEmail, p.notes, p.githubRepo, p.vercelProjectName, ...extra]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q) ? 40 : 0;
}
