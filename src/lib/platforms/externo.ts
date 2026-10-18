/**
 * Lectura de GitHub, Vercel y Supabase para Platforms. Solo lee: listas de repos y proyectos, estado del
 * último deploy, estado del proyecto de base y el último commit.
 *
 * Todo pasa por `conCache`: la respuesta se guarda en PlatformApiCache y vale 30 min. No hay crons ni
 * sondeos: se llama al abrir algo que la necesita (si la caché venció) o cuando la persona toca
 * «Actualizar». Los tokens se descifran aquí y nunca salen del servidor.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const CACHE_TTL_MS = 30 * 60 * 1000;
/** Aunque se pida «Actualizar», no se vuelve a llamar antes de un minuto. */
const MIN_REFRESH_MS = 60 * 1000;
const TIMEOUT_MS = 10_000;
const ERROR_BACKOFF_MS = 5 * 60 * 1000;

export function esErrorDeToken(message: string | null | undefined): boolean {
  return !!message && message.includes("rechazó el token");
}

// ─── Tipos que viajan al navegador (sin tokens) ──────────────────────────────

export type GithubRepoItem = {
  fullName: string;
  private: boolean;
  pushedAt: string | null;
  htmlUrl: string;
  defaultBranch: string;
};

export type GithubCommit = { sha: string; message: string; date: string | null; author: string | null; url: string };

export type VercelProjectItem = {
  id: string;
  name: string;
  framework: string | null;
  /** Dominio de producción, si tiene. */
  domain: string | null;
  /** READY · ERROR · BUILDING · QUEUED · CANCELED · INITIALIZING */
  deployState: string | null;
  deployedAt: number | null;
  /** owner/repo conectado en Vercel. */
  repo: string | null;
};

export type SupabaseProjectItem = {
  ref: string;
  name: string;
  region: string | null;
  /** ACTIVE_HEALTHY · INACTIVE (pausado) · COMING_UP · RESTORING · … */
  status: string;
  orgSlug: string | null;
  createdAt: string | null;
};

export type ExternalProvider = "github" | "vercel" | "supabase";

/** Error con un mensaje para la persona; `auth` = token vencido o revocado. */
export class ApiExternaError extends Error {
  constructor(message: string, readonly auth = false) {
    super(message);
  }
}

const NOMBRE: Record<ExternalProvider, string> = { github: "GitHub", vercel: "Vercel", supabase: "Supabase" };

async function pedir<T>(provider: ExternalProvider, url: string, headers: Record<string, string>): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ApiExternaError(`${NOMBRE[provider]} no respondió. Puede estar caído o lento; intenta en unos minutos.`);
  }
  if (r.status === 401 || r.status === 403) {
    throw new ApiExternaError(`${NOMBRE[provider]} rechazó el token: venció o lo revocaron. Reemplázalo en Cuentas.`, true);
  }
  if (r.status === 429) throw new ApiExternaError(`${NOMBRE[provider]} pidió esperar (demasiadas consultas). Intenta más tarde.`);
  if (!r.ok) throw new ApiExternaError(`${NOMBRE[provider]} respondió ${r.status}.`);
  return (await r.json()) as T;
}

// ─── GitHub ──────────────────────────────────────────────────────────────────

const gh = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "User-Agent": "pime-suite",
  "X-GitHub-Api-Version": "2022-11-28",
});

export async function githubRepos(token: string): Promise<GithubRepoItem[]> {
  const out: GithubRepoItem[] = [];
  for (let page = 1; page <= 3; page++) {
    const list = await pedir<Array<{ full_name: string; private: boolean; pushed_at: string | null; html_url: string; default_branch: string }>>(
      "github",
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
      gh(token)
    );
    for (const r of list) out.push({ fullName: r.full_name, private: r.private, pushedAt: r.pushed_at, htmlUrl: r.html_url, defaultBranch: r.default_branch });
    if (list.length < 100) break;
  }
  return out;
}

export async function githubUltimoCommit(token: string, fullName: string): Promise<GithubCommit | null> {
  const list = await pedir<Array<{ sha: string; html_url: string; commit: { message: string; author?: { date?: string; name?: string } } }>>(
    "github",
    `https://api.github.com/repos/${fullName.split("/").map(encodeURIComponent).join("/")}/commits?per_page=1`,
    gh(token)
  );
  const c = list[0];
  if (!c) return null;
  return { sha: c.sha.slice(0, 7), message: c.commit.message.split("\n")[0].slice(0, 160), date: c.commit.author?.date ?? null, author: c.commit.author?.name ?? null, url: c.html_url };
}

// ─── Vercel ──────────────────────────────────────────────────────────────────

const vc = (token: string) => ({ Authorization: `Bearer ${token}` });

function planDeVercel(plan: unknown): "FREE" | "PRO" | null {
  if (plan === "hobby") return "FREE";
  if (plan === "pro" || plan === "enterprise") return "PRO";
  return null;
}

/** Comprueba el token y dice de quién es y, si Vercel lo dice, en qué plan está. */
export async function verificarVercel(token: string) {
  const { user } = await pedir<{ user: { email?: string; username?: string; name?: string; defaultTeamId?: string | null; billing?: { plan?: string } | null } }>(
    "vercel",
    "https://api.vercel.com/v2/user",
    vc(token)
  );
  let plan = planDeVercel(user.billing?.plan);
  let label = user.username ?? user.name ?? null;
  const teamId = user.defaultTeamId ?? null;
  if (teamId) {
    try {
      const team = await pedir<{ name?: string; slug?: string; billing?: { plan?: string } | null }>("vercel", `https://api.vercel.com/v2/teams/${encodeURIComponent(teamId)}`, vc(token));
      plan = planDeVercel(team.billing?.plan) ?? plan;
      label = team.name ?? team.slug ?? label;
    } catch {
      // Sin acceso al equipo: se queda el plan del usuario (o sin detectar).
    }
  }
  return { email: user.email?.trim().toLowerCase() ?? null, label, teamId, plan };
}

type VercelProjectRaw = {
  id: string;
  name: string;
  framework?: string | null;
  link?: { org?: string; repo?: string; repoOwner?: string } | null;
  latestDeployments?: Array<{ readyState?: string; createdAt?: number; alias?: string[] }>;
  targets?: { production?: { alias?: string[]; readyState?: string; createdAt?: number } | null } | null;
  alias?: Array<{ domain?: string }>;
};

export async function vercelProjects(token: string, teamId: string | null): Promise<VercelProjectItem[]> {
  const out: VercelProjectItem[] = [];
  let until: number | null = null;
  // 200 proyectos por cuenta Hobby: tres páginas de 100 cubren el plan gratis y algo más.
  for (let page = 0; page < 3; page++) {
    const qs = new URLSearchParams({ limit: "100" });
    if (teamId) qs.set("teamId", teamId);
    if (until) qs.set("until", String(until));
    const res: { projects: VercelProjectRaw[]; pagination?: { next?: number | null } } = await pedir(
      "vercel",
      `https://api.vercel.com/v9/projects?${qs}`,
      vc(token)
    );
    for (const p of res.projects) {
      const prod = p.targets?.production ?? null;
      const last = p.latestDeployments?.[0];
      // Un comodín (*.dominio.com) no es una dirección que se pueda abrir.
      const domains = [...(prod?.alias ?? []), ...(p.alias ?? []).map((a) => a.domain ?? "")].filter((x) => x && !x.startsWith("*."));
      const custom = domains.find((d) => !d.endsWith(".vercel.app")) ?? domains[0] ?? null;
      out.push({
        id: p.id,
        name: p.name,
        framework: p.framework ?? null,
        domain: custom,
        deployState: prod?.readyState ?? last?.readyState ?? null,
        deployedAt: prod?.createdAt ?? last?.createdAt ?? null,
        repo: p.link?.repo ? `${p.link.org ?? p.link.repoOwner ?? ""}/${p.link.repo}`.replace(/^\//, "") : null,
      });
    }
    until = res.pagination?.next ?? null;
    if (!until) break;
  }
  return out;
}

// ─── Supabase ────────────────────────────────────────────────────────────────

const sb = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Estados que no ocupan uno de los 2 proyectos gratis. */
const SUPABASE_NO_CUENTA = new Set(["INACTIVE", "REMOVED", "GOING_DOWN", "PAUSING"]);

export function supabaseOcupaCupo(status: string): boolean {
  return !SUPABASE_NO_CUENTA.has(status);
}

export async function supabaseProjects(token: string): Promise<SupabaseProjectItem[]> {
  const list = await pedir<Array<{ ref?: string; id: string; name: string; region?: string; status: string; organization_slug?: string; organization_id?: string; created_at?: string }>>(
    "supabase",
    "https://api.supabase.com/v1/projects",
    sb(token)
  );
  return list.map((p) => ({
    ref: p.ref ?? p.id,
    name: p.name,
    region: p.region ?? null,
    status: p.status,
    orgSlug: p.organization_slug ?? p.organization_id ?? null,
    createdAt: p.created_at ?? null,
  }));
}

/** Comprueba el token. El correo solo lo da un token personal; el plan, la organización. */
export async function verificarSupabase(token: string) {
  const projects = await supabaseProjects(token);
  let email: string | null = null;
  try {
    const me = await pedir<{ primary_email?: string; username?: string }>("supabase", "https://api.supabase.com/v1/profile", sb(token));
    email = me.primary_email?.trim().toLowerCase() ?? null;
  } catch {
    // Tokens de alcance limitado no tienen perfil: el correo lo pone la persona.
  }
  let plan: "FREE" | "PRO" | null = null;
  let label: string | null = null;
  let orgSlug: string | null = projects[0]?.orgSlug ?? null;
  try {
    const orgs = await pedir<Array<{ id: string; slug?: string; name: string }>>("supabase", "https://api.supabase.com/v1/organizations", sb(token));
    const org = orgs.find((o) => (o.slug ?? o.id) === orgSlug) ?? orgs[0];
    if (org) {
      orgSlug = org.slug ?? org.id;
      label = org.name;
      const detail = await pedir<{ plan?: string }>("supabase", `https://api.supabase.com/v1/organizations/${encodeURIComponent(orgSlug)}`, sb(token));
      plan = detail.plan === "free" ? "FREE" : detail.plan ? "PRO" : null;
    }
  } catch {
    // Sin permiso de organizaciones: el plan lo marca la persona.
  }
  return { email, label, orgSlug, plan, projects };
}

// ─── Caché en la base ────────────────────────────────────────────────────────

export type Cacheado<T> = { data: T | null; error: string | null; fetchedAt: string | null; auth: boolean };

/**
 * Devuelve lo guardado si tiene menos de 30 min; si no (o si `force`), llama a la API y lo guarda. Si la
 * API falla, devuelve lo último que se tenía junto con el error: la pantalla sigue mostrando algo.
 */
export async function conCache<T>(
  userId: string,
  key: string,
  fetcher: () => Promise<T>,
  opts: { force?: boolean } = {}
): Promise<Cacheado<T>> {
  const row = await prisma.platformApiCache.findUnique({ where: { userId_key: { userId, key } } });
  const age = row ? Date.now() - row.fetchedAt.getTime() : Number.POSITIVE_INFINITY;
  const fresh = row?.data != null && !row.error && age < (opts.force ? MIN_REFRESH_MS : CACHE_TTL_MS);
  if (row && fresh) return { data: row.data as T, error: null, fetchedAt: row.fetchedAt.toISOString(), auth: false };
  // Si la última llamada falló hace menos de 5 min, no se insiste: se devuelve lo que había y el error.
  if (row?.error && age < (opts.force ? MIN_REFRESH_MS : ERROR_BACKOFF_MS)) {
    return { data: (row.data as T | null) ?? null, error: row.error, fetchedAt: row.fetchedAt.toISOString(), auth: esErrorDeToken(row.error) };
  }

  try {
    const data = await fetcher();
    const saved = await prisma.platformApiCache.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, data: data as Prisma.InputJsonValue, fetchedAt: new Date() },
      update: { data: data as Prisma.InputJsonValue, error: null, fetchedAt: new Date() },
    });
    return { data, error: null, fetchedAt: saved.fetchedAt.toISOString(), auth: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo consultar.";
    const auth = e instanceof ApiExternaError && e.auth;
    // Se guarda el error con la hora, para no reintentar en cada carga mientras la API sigue caída.
    await prisma.platformApiCache
      .upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, error: message, fetchedAt: new Date() },
        update: { error: message, fetchedAt: new Date() },
      })
      .catch(() => {});
    return { data: (row?.data as T | null) ?? null, error: message, fetchedAt: row?.fetchedAt.toISOString() ?? null, auth };
  }
}

export const cacheKey = {
  githubRepos: (accountId: string) => `github:${accountId}:repos`,
  githubCommit: (fullName: string) => `github:commit:${fullName.toLowerCase()}`,
  vercelProjects: (accountId: string) => `vercel:${accountId}:projects`,
  supabaseProjects: (accountId: string) => `supabase:${accountId}:projects`,
};

export async function borrarCacheDeCuenta(userId: string, provider: ExternalProvider, accountId: string) {
  await prisma.platformApiCache.deleteMany({ where: { userId, key: { startsWith: `${provider}:${accountId}:` } } });
}
