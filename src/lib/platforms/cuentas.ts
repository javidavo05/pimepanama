/**
 * Cuentas con token de Platforms. GitHub usa el módulo de siempre (GithubAccount, src/lib/github/cuentas.ts,
 * que también usa el portal de clientes); Vercel y Supabase guardan su token en PlatformAccount, cifrado con
 * la misma clave. Ningún token sale de aquí hacia el navegador.
 */
import { prisma } from "@/lib/prisma";
import { decryptGithubToken, encryptGithubToken } from "@/lib/github/client";
import {
  ApiExternaError,
  borrarCacheDeCuenta,
  cacheKey,
  conCache,
  githubRepos,
  githubUltimoCommit,
  supabaseProjects,
  vercelProjects,
  verificarSupabase,
  verificarVercel,
  type Cacheado,
  type ExternalProvider,
  type GithubCommit,
  type GithubRepoItem,
  type SupabaseProjectItem,
  type VercelProjectItem,
} from "./externo";

function descifrar(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    return decryptGithubToken(enc);
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GuardarTokenResultado =
  | { ok: true; id: string; email: string; plan: "FREE" | "PRO"; planDetectado: boolean; label: string | null; proyectos: number }
  | { ok: false; error: string; necesitaCorreo?: boolean };

/** Verifica el token contra la API real y lo guarda cifrado en la cuenta (proveedor + correo). */
export async function guardarTokenPlataforma(
  userId: string,
  provider: "vercel" | "supabase",
  token: string,
  correo: string | null
): Promise<GuardarTokenResultado> {
  const t = token.trim();
  if (!t) return { ok: false, error: "Pega el token." };

  let email: string | null;
  let label: string | null;
  let plan: "FREE" | "PRO" | null;
  let teamId: string | null = null;
  let orgSlug: string | null = null;
  let items: VercelProjectItem[] | SupabaseProjectItem[];

  try {
    if (provider === "vercel") {
      const v = await verificarVercel(t);
      // El correo lo dice Vercel, no quien pega el token.
      email = v.email ?? correo;
      label = v.label;
      plan = v.plan;
      teamId = v.teamId;
      items = await vercelProjects(t, teamId);
    } else {
      const s = await verificarSupabase(t);
      email = s.email ?? correo;
      label = s.label;
      plan = s.plan;
      orgSlug = s.orgSlug;
      items = s.projects;
    }
  } catch (e) {
    return { ok: false, error: e instanceof ApiExternaError ? e.message : "No se pudo comprobar el token." };
  }

  email = email?.trim().toLowerCase() ?? null;
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "El token funciona, pero no dice de qué correo es. Escribe el correo de la cuenta.", necesitaCorreo: true };
  }

  const data = {
    tokenEnc: encryptGithubToken(t),
    label,
    teamId,
    orgSlug,
    lastCheckedAt: new Date(),
    lastError: null,
    ...(plan ? { plan, planSource: "api" } : {}),
  };
  const cuenta = await prisma.platformAccount.upsert({
    where: { userId_provider_email: { userId, provider, email } },
    create: { userId, provider, email, ...data, plan: plan ?? "FREE" },
    update: data,
  });

  // La lista recién leída queda en caché: la pantalla de Cuentas ya puede mostrar el uso real.
  await borrarCacheDeCuenta(userId, provider, cuenta.id);
  await prisma.platformApiCache.create({
    data: { userId, key: provider === "vercel" ? cacheKey.vercelProjects(cuenta.id) : cacheKey.supabaseProjects(cuenta.id), data: items as object[] },
  });

  return { ok: true, id: cuenta.id, email, plan: cuenta.plan as "FREE" | "PRO", planDetectado: !!plan, label, proyectos: items.length };
}

/** Quita el token (la cuenta y su plan se quedan: las plataformas la siguen usando por correo). */
export async function quitarTokenPlataforma(userId: string, id: string): Promise<boolean> {
  const cuenta = await prisma.platformAccount.findFirst({ where: { id, userId }, select: { id: true, provider: true } });
  if (!cuenta) return false;
  await prisma.platformAccount.update({ where: { id }, data: { tokenEnc: null, lastError: null, lastCheckedAt: null, planSource: "manual" } });
  await borrarCacheDeCuenta(userId, cuenta.provider as ExternalProvider, id);
  return true;
}

type Lista<P extends ExternalProvider> = P extends "github" ? GithubRepoItem[] : P extends "vercel" ? VercelProjectItem[] : SupabaseProjectItem[];

/**
 * Lista real de una cuenta (repos o proyectos), con caché de 30 min. Si el token venció, lo deja anotado
 * en la cuenta para que Cuentas lo muestre.
 */
export async function listaDeCuenta<P extends ExternalProvider>(
  userId: string,
  provider: P,
  accountId: string,
  force = false
): Promise<Cacheado<Lista<P>> | null> {
  if (provider === "github") {
    const c = await prisma.githubAccount.findFirst({ where: { id: accountId, userId }, select: { id: true, tokenEnc: true, lastError: true } });
    const token = descifrar(c?.tokenEnc);
    if (!c || !token) return null;
    const r = await conCache(userId, cacheKey.githubRepos(c.id), () => githubRepos(token), { force });
    const lastError = r.auth ? r.error : null;
    if (lastError !== c.lastError) await prisma.githubAccount.update({ where: { id: c.id }, data: { lastError, lastCheckedAt: new Date() } }).catch(() => {});
    return r as Cacheado<Lista<P>>;
  }

  const c = await prisma.platformAccount.findFirst({ where: { id: accountId, userId, provider }, select: { id: true, tokenEnc: true, teamId: true, lastError: true } });
  const token = descifrar(c?.tokenEnc);
  if (!c || !token) return null;
  const r =
    provider === "vercel"
      ? await conCache(userId, cacheKey.vercelProjects(c.id), () => vercelProjects(token, c.teamId), { force })
      : await conCache(userId, cacheKey.supabaseProjects(c.id), () => supabaseProjects(token), { force });
  const lastError = r.error;
  if (lastError !== c.lastError) {
    await prisma.platformAccount.update({ where: { id: c.id }, data: { lastError, ...(lastError ? {} : { lastCheckedAt: new Date() }) } }).catch(() => {});
  }
  return r as Cacheado<Lista<P>>;
}

/** Último commit del repo de una plataforma, con caché de 30 min. */
export async function ultimoCommit(userId: string, githubAccountId: string, repo: string, force = false): Promise<Cacheado<GithubCommit | null> | null> {
  const c = await prisma.githubAccount.findFirst({ where: { id: githubAccountId, userId }, select: { tokenEnc: true } });
  const token = descifrar(c?.tokenEnc);
  if (!token) return null;
  return conCache(userId, cacheKey.githubCommit(repo), () => githubUltimoCommit(token, repo), { force });
}
