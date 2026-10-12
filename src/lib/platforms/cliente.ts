/** Plataformas de un cliente para su ficha. Solo base y caché: no llama a GitHub, Vercel ni Supabase. */
import { prisma } from "@/lib/prisma";
import { hasPlatformVault } from "@/lib/platform-vault-shared";
import type { GithubRepoItem, SupabaseProjectItem, VercelProjectItem } from "./externo";

export type PlataformaDeCliente = {
  id: string;
  name: string;
  accessUrl: string | null;
  project: { id: string; name: string } | null;
  githubRepo: string | null;
  githubPushedAt: string | null;
  vercelEmail: string | null;
  vercelProjectName: string | null;
  vercelState: string | null;
  vercelDomain: string | null;
  supabaseEmail: string | null;
  supabaseProjectRef: string | null;
  supabaseStatus: string | null;
  supabaseRegion: string | null;
  hasConfidential: boolean;
};

export async function plataformasDeCliente(userId: string, clientId: string): Promise<PlataformaDeCliente[]> {
  const [rows, cache] = await Promise.all([
    prisma.platform.findMany({
      where: { userId, clientId },
      orderBy: { name: "asc" },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.platformApiCache.findMany({
      where: { userId, OR: [{ key: { startsWith: "vercel:" } }, { key: { startsWith: "supabase:" } }, { key: { endsWith: ":repos" } }] },
      select: { key: true, data: true },
    }),
  ]);
  if (!rows.length) return [];

  const vercel = new Map<string, VercelProjectItem>();
  const supabase = new Map<string, SupabaseProjectItem>();
  const repos = new Map<string, GithubRepoItem>();
  for (const c of cache) {
    if (!Array.isArray(c.data)) continue;
    if (c.key.startsWith("vercel:")) for (const x of c.data as VercelProjectItem[]) vercel.set(x.id, x);
    else if (c.key.startsWith("supabase:")) for (const x of c.data as SupabaseProjectItem[]) supabase.set(x.ref, x);
    else for (const x of c.data as GithubRepoItem[]) repos.set(x.fullName.toLowerCase(), x);
  }

  return rows.map((p) => {
    const v = p.vercelProjectId ? vercel.get(p.vercelProjectId) : undefined;
    const s = p.supabaseProjectRef ? supabase.get(p.supabaseProjectRef) : undefined;
    const r = p.githubRepo ? repos.get(p.githubRepo.toLowerCase()) : undefined;
    return {
      id: p.id,
      name: p.name,
      accessUrl: p.accessUrl ?? p.linkUrl,
      project: p.project,
      githubRepo: p.githubRepo,
      githubPushedAt: r?.pushedAt ?? null,
      vercelEmail: p.vercelEmail,
      vercelProjectName: p.vercelProjectName,
      vercelState: v?.deployState ?? null,
      vercelDomain: v?.domain ?? null,
      supabaseEmail: p.supabaseEmail,
      supabaseProjectRef: p.supabaseProjectRef,
      supabaseStatus: s?.status ?? null,
      supabaseRegion: s?.region ?? null,
      hasConfidential: hasPlatformVault(p.confidentialVault),
    };
  });
}
