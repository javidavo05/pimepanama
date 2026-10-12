/**
 * Todo lo que necesita /empresa/platforms en una sola ida a la base (consultas en paralelo). No llama a
 * GitHub, Vercel ni Supabase: lo vivo sale de la última consulta guardada en PlatformApiCache.
 */
import { prisma } from "@/lib/prisma";
import { ensurePlatformsSeeded } from "@/lib/platforms-bootstrap";
import { reconcileSupabaseSlots } from "@/lib/platforms-sync";
import { accountKey, normalizePlatformEmail, splitAccountKey } from "@/lib/platform-slots";
import { serializarPlataforma } from "./datos";
import { cacheKey, supabaseOcupaCupo, type GithubRepoItem, type SupabaseProjectItem, type VercelProjectItem } from "./externo";
import type { ClientOption, GithubAccountInfo, PlatformLiveSummary, ProviderAccount, SerializedPlatform } from "./tipos";

export type PlatformsData = {
  platforms: SerializedPlatform[];
  live: Record<string, PlatformLiveSummary>;
  accounts: ProviderAccount[];
  githubAccounts: GithubAccountInfo[];
  clients: ClientOption[];
};

async function leer(userId: string) {
  return Promise.all([
    prisma.platform.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    prisma.client.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true, archivedAt: true } }),
    prisma.project.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: { id: true, name: true, clientId: true, clients: { select: { clientId: true } } },
    }),
    prisma.platformAccount.findMany({ where: { userId } }),
    prisma.githubAccount.findMany({
      where: { userId },
      orderBy: { login: "asc" },
      select: { id: true, login: true, source: true, lastError: true, lastCheckedAt: true, _count: { select: { projects: true } } },
    }),
    prisma.platformApiCache.findMany({ where: { userId }, select: { key: true, data: true, error: true, fetchedAt: true } }),
  ]);
}

export async function cargarPlatforms(userId: string): Promise<PlatformsData> {
  let [platforms, clients, projects, accounts, ghAccounts, cache] = await leer(userId);
  if (platforms.length === 0 && (await prisma.platform.count({ where: { userId } })) === 0) {
    await ensurePlatformsSeeded(userId);
    [platforms, clients, projects, accounts, ghAccounts, cache] = await leer(userId);
  }

  // Cupos de Supabase gratis inválidos o repetidos: se corrigen aquí mismo (antes era otra ida a la base).
  const proKeys = new Set(accounts.filter((a) => a.plan === "PRO").map((a) => accountKey(a.provider as "supabase", a.email)));
  const fixes = reconcileSupabaseSlots(platforms, proKeys);
  if (fixes.size) {
    await prisma.$transaction([...fixes].map(([id, supabaseSlot]) => prisma.platform.update({ where: { id }, data: { supabaseSlot } })));
    platforms = platforms.map((p) => (fixes.has(p.id) ? { ...p, supabaseSlot: fixes.get(p.id) ?? null } : p));
  }

  const byKey = new Map(cache.map((c) => [c.key, c]));
  const vercelById = new Map<string, VercelProjectItem>();
  const supabaseByRef = new Map<string, SupabaseProjectItem>();
  const repoByName = new Map<string, GithubRepoItem>();
  for (const c of cache) {
    if (!Array.isArray(c.data)) continue;
    if (c.key.startsWith("vercel:")) for (const p of c.data as VercelProjectItem[]) vercelById.set(p.id, p);
    else if (c.key.startsWith("supabase:")) for (const p of c.data as SupabaseProjectItem[]) supabaseByRef.set(p.ref, p);
    else if (c.key.endsWith(":repos")) for (const r of c.data as GithubRepoItem[]) repoByName.set(r.fullName.toLowerCase(), r);
  }

  const live: Record<string, PlatformLiveSummary> = {};
  for (const p of platforms) {
    const v = p.vercelProjectId ? vercelById.get(p.vercelProjectId) : undefined;
    const s = p.supabaseProjectRef ? supabaseByRef.get(p.supabaseProjectRef) : undefined;
    const r = p.githubRepo ? repoByName.get(p.githubRepo.toLowerCase()) : undefined;
    live[p.id] = {
      githubPushedAt: r?.pushedAt ?? null,
      vercelState: v?.deployState ?? null,
      vercelDomain: v?.domain ?? null,
      vercelDeployedAt: v?.deployedAt ?? null,
      supabaseStatus: s?.status ?? null,
      supabaseRegion: s?.region ?? null,
    };
  }

  // Cuentas: las que tienen fila y las que solo aparecen como correo en alguna plataforma.
  const accountRows = new Map(accounts.map((a) => [accountKey(a.provider as "vercel", a.email), a]));
  const keys = new Set(accountRows.keys());
  for (const p of platforms) {
    if (p.vercelEmail) keys.add(accountKey("vercel", p.vercelEmail));
    if (p.supabaseEmail) keys.add(accountKey("supabase", p.supabaseEmail));
  }
  const providerAccounts: ProviderAccount[] = [...keys].sort().map((key) => {
    const [provider, email] = splitAccountKey(key);
    const a = accountRows.get(key);
    const c = a ? byKey.get(provider === "vercel" ? cacheKey.vercelProjects(a.id) : cacheKey.supabaseProjects(a.id)) : undefined;
    let liveUsed: number | null = null;
    if (a?.tokenEnc && Array.isArray(c?.data)) {
      liveUsed = provider === "vercel" ? c.data.length : (c.data as SupabaseProjectItem[]).filter((x) => supabaseOcupaCupo(x.status)).length;
    }
    return {
      id: a?.id ?? null,
      provider,
      email: normalizePlatformEmail(email),
      plan: a?.plan === "PRO" ? "PRO" : "FREE",
      planSource: a?.planSource === "api" ? "api" : "manual",
      hasToken: !!a?.tokenEnc,
      label: a?.label ?? null,
      lastError: a?.tokenEnc ? (a.lastError ?? c?.error ?? null) : null,
      lastCheckedAt: a?.lastCheckedAt?.toISOString() ?? null,
      liveUsed,
      fetchedAt: c?.fetchedAt.toISOString() ?? null,
    };
  });

  const githubAccounts: GithubAccountInfo[] = ghAccounts.map((g) => {
    const c = byKey.get(cacheKey.githubRepos(g.id));
    return {
      id: g.id,
      login: g.login,
      source: g.source,
      error: g.lastError,
      checkedAt: g.lastCheckedAt?.toISOString() ?? null,
      repos: Array.isArray(c?.data) ? c.data.length : null,
      projects: g._count.projects,
    };
  });

  const usados = new Set(platforms.map((p) => p.clientId).filter(Boolean));
  const clientOptions: ClientOption[] = clients
    .filter((c) => !c.archivedAt || usados.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.company || c.name,
      company: c.company ? c.name : null,
      archived: !!c.archivedAt,
      projects: projects.filter((p) => p.clientId === c.id || p.clients.some((x) => x.clientId === c.id)).map((p) => ({ id: p.id, name: p.name })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  return { platforms: platforms.map(serializarPlataforma), live, accounts: providerAccounts, githubAccounts, clients: clientOptions };
}
