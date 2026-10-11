/**
 * Varias cuentas de GitHub (migración 0040). Los repos de Pime viven en una cuenta por cliente o producto,
 * igual que en Git PIME, así que cada proyecto lee su repo con la cuenta que tiene acceso.
 *
 * Orden para elegir el token de un repo:
 *   1. la cuenta que el proyecto ya tiene guardada,
 *   2. la cuenta cuyo login es el dueño del repo,
 *   3. cualquier otra cuenta que pueda leerlo (se prueba y se recuerda en el proyecto),
 *   4. el token viejo del usuario (EmpresaUser.githubTokenEnc) o GITHUB_TOKEN,
 *   5. sin token (solo repos públicos).
 */
import { prisma } from "@/lib/prisma";
import { decryptGithubToken, encryptGithubToken } from "./client";

const cabeceras = (token: string) => ({ Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "pime-suite", "X-GitHub-Api-Version": "2022-11-28" });

function descifrar(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try { return decryptGithubToken(enc); } catch { return null; }
}

/** Comprueba un token contra GitHub. Nunca lanza. */
export async function comprobarToken(token: string): Promise<{ ok: true; login: string; scopes: string | null } | { ok: false; error: string }> {
  try {
    const r = await fetch("https://api.github.com/user", { headers: cabeceras(token), cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return { ok: false, error: r.status === 401 ? "GitHub rechazó el token (vencido o revocado)." : `GitHub respondió ${r.status}.` };
    const j = (await r.json()) as { login?: string };
    return j.login ? { ok: true, login: j.login, scopes: r.headers.get("x-oauth-scopes") } : { ok: false, error: "GitHub no devolvió la cuenta." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo hablar con GitHub." };
  }
}

/** Guarda (o reemplaza) el token de una cuenta. El login lo dice GitHub, no quien lo pega. */
export async function guardarCuenta(userId: string, token: string, source: "manual" | "gh-cli" = "manual") {
  const c = await comprobarToken(token.trim());
  if (!c.ok) return c;
  const previa = await prisma.githubAccount.findFirst({ where: { userId, login: { equals: c.login, mode: "insensitive" } }, select: { id: true } });
  const data = { login: c.login, tokenEnc: encryptGithubToken(token), scopes: c.scopes, source, lastCheckedAt: new Date(), lastError: null };
  const cuenta = previa
    ? await prisma.githubAccount.update({ where: { id: previa.id }, data })
    : await prisma.githubAccount.create({ data: { ...data, userId } });
  return { ok: true as const, login: cuenta.login, id: cuenta.id, nueva: !previa };
}

async function puedeLeer(token: string, owner: string, repo: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { headers: cabeceras(token), cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return r.ok;
  } catch {
    return false;
  }
}

export type TokenElegido = { token: string | null; cuentaId: string | null; login: string | null };

export async function tokenParaRepo(p: { userId: string; owner: string; repo: string; projectId?: string; cuentaId?: string | null }): Promise<TokenElegido> {
  const cuentas = await prisma.githubAccount.findMany({ where: { userId: p.userId }, orderBy: { createdAt: "asc" }, select: { id: true, login: true, tokenEnc: true } });
  const recordar = async (c: { id: string }) => { if (p.projectId && p.cuentaId !== c.id) await prisma.project.update({ where: { id: p.projectId }, data: { githubAccountId: c.id } }).catch(() => {}); };

  const guardada = p.cuentaId ? cuentas.find((c) => c.id === p.cuentaId) : undefined;
  const delDueno = cuentas.find((c) => c.login.toLowerCase() === p.owner.toLowerCase());
  const orden = [guardada, delDueno, ...cuentas].filter((c, i, xs): c is (typeof cuentas)[number] => !!c && xs.findIndex((y) => y?.id === c.id) === i);
  for (const c of orden) {
    const t = descifrar(c.tokenEnc);
    if (!t) continue;
    // La guardada y la del dueño se usan sin probar: si fallan, el error de GitHub lo dirá.
    if (c === guardada || c === delDueno || (await puedeLeer(t, p.owner, p.repo))) {
      await recordar(c);
      return { token: t, cuentaId: c.id, login: c.login };
    }
  }
  const u = await prisma.empresaUser.findUnique({ where: { id: p.userId }, select: { githubTokenEnc: true } });
  return { token: descifrar(u?.githubTokenEnc) ?? process.env.GITHUB_TOKEN ?? null, cuentaId: null, login: null };
}
