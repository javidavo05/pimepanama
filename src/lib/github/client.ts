import { decryptPassword, encryptPassword } from "@/lib/mail/crypto";

/**
 * Cliente mínimo de la API de GitHub. Solo lee: el sistema mira el código para
 * entender qué existe, nunca lo escribe.
 *
 * El token es un PAT del usuario, guardado cifrado. Basta con permiso de
 * lectura de repositorios (`repo` para privados, nada para públicos).
 */

const API = "https://api.github.com";

export function encryptGithubToken(token: string): string {
  return encryptPassword(token.trim());
}

export function decryptGithubToken(stored: string): string {
  return decryptPassword(stored);
}

export class GithubError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function api<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pime-suite",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // El snapshot se guarda en la base; no queremos además la caché de Next.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message =
      res.status === 404
        ? "No se encontró el repositorio. Revisa el nombre, o que el token tenga acceso si es privado."
        : res.status === 401 || res.status === 403
          ? "GitHub rechazó el token. Comprueba que sigue vigente y que tiene permiso de lectura del repositorio."
          : `GitHub respondió ${res.status}. ${detail.slice(0, 200)}`;
    throw new GithubError(message, res.status);
  }

  return (await res.json()) as T;
}

export interface RepoMeta {
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  topics?: string[];
  private: boolean;
  pushed_at: string;
  html_url: string;
}

export function getRepo(owner: string, repo: string, token: string | null): Promise<RepoMeta> {
  return api<RepoMeta>(`/repos/${owner}/${repo}`, token);
}

interface TreeResponse {
  tree: { path: string; type: string; size?: number }[];
  truncated: boolean;
}

/** Árbol completo del repo en una sola llamada. */
export function getTree(
  owner: string,
  repo: string,
  branch: string,
  token: string | null
): Promise<TreeResponse> {
  return api<TreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    token
  );
}

interface ContentResponse {
  content?: string;
  encoding?: string;
}

/** Contenido de un archivo, o null si no existe (que es información, no un error). */
export async function getFile(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string | null
): Promise<string | null> {
  try {
    const data = await api<ContentResponse>(
      `/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
      token
    );
    if (!data.content || data.encoding !== "base64") return null;
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch (err) {
    if (err instanceof GithubError && err.status === 404) return null;
    throw err;
  }
}

export interface CommitSummary {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export async function getCommits(
  owner: string,
  repo: string,
  branch: string,
  token: string | null,
  limit = 15
): Promise<CommitSummary[]> {
  const data = await api<
    { sha: string; commit: { message: string; author: { name: string; date: string } } }[]
  >(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`, token);

  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    // Solo el título del commit: el cuerpo es para quien lee el historial, no
    // para que el modelo entienda por dónde va el proyecto.
    message: c.commit.message.split("\n")[0],
    date: c.commit.author?.date ?? "",
    author: c.commit.author?.name ?? "",
  }));
}

/** "https://github.com/owner/repo.git" | "owner/repo" → { owner, repo } */
export function parseRepoRef(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  if (!trimmed) return null;

  const url = trimmed.match(/github\.com[/:]([^/]+)\/([^/?#]+)/i);
  if (url) return { owner: url[1], repo: url[2] };

  const short = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], repo: short[2] };

  return null;
}

// ─── Avance en vivo (Pime Clientes) ─────────────────────────────────────────

export interface MilestoneSummary { number: number; title: string; state: "open" | "closed"; open_issues: number; closed_issues: number }

export function getMilestones(owner: string, repo: string, token: string | null): Promise<MilestoneSummary[]> {
  return api<MilestoneSummary[]>(`/repos/${owner}/${repo}/milestones?state=all&per_page=100`, token);
}

export interface ClosedIssue { number: number; title: string; closed_at: string; html_url: string; body?: string | null; pull_request?: unknown }

/** Issues cerrados de un milestone (sin pull requests), los más recientes primero. */
export async function getClosedIssues(owner: string, repo: string, milestone: number, token: string | null): Promise<ClosedIssue[]> {
  const items = await api<ClosedIssue[]>(`/repos/${owner}/${repo}/issues?milestone=${milestone}&state=closed&sort=updated&direction=desc&per_page=50`, token);
  return items.filter((i) => !i.pull_request);
}

// ─── Marcadores de fase (escritura mínima) ──────────────────────────────────
// Única escritura del sistema en GitHub: crea el milestone de cada fase, una tarea por entregable y el
// webhook que mueve el avance. Nunca toca el código. Pide permiso de escritura de issues (y de webhooks
// para el aviso automático); si el token no lo tiene, GitHub responde 403 y se explica.

async function apiEscribir<T>(path: string, token: string | null, body: unknown, method: "POST" | "PATCH" = "POST"): Promise<T> {
  if (!token) throw new GithubError("Para crear los marcadores en GitHub hace falta un token con permiso de escritura de issues.", 401);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "pime-suite", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message = res.status === 401 || res.status === 403
      ? "GitHub no dejó escribir: el token necesita permiso de issues (y de webhooks para el aviso automático)."
      : res.status === 404 ? "No se encontró el repositorio o el token no tiene acceso." : `GitHub respondió ${res.status}. ${detail.slice(0, 200)}`;
    throw new GithubError(message, res.status);
  }
  return (await res.json()) as T;
}

export function crearMilestone(owner: string, repo: string, token: string | null, title: string, description?: string | null) {
  return apiEscribir<MilestoneSummary>(`/repos/${owner}/${repo}/milestones`, token, { title: title.slice(0, 255), description: description?.slice(0, 2000) ?? undefined });
}

export function crearIssue(owner: string, repo: string, token: string | null, p: { title: string; body?: string | null; milestone: number; labels?: string[] }) {
  return apiEscribir<{ number: number; html_url: string }>(`/repos/${owner}/${repo}/issues`, token, { title: p.title.slice(0, 255), body: p.body ?? undefined, milestone: p.milestone, labels: p.labels });
}

/** Cierra una tarea: se usa al crear la de un entregable que en Pime ya está hecho. */
export function cerrarIssue(owner: string, repo: string, token: string | null, numero: number) {
  return apiEscribir<{ number: number }>(`/repos/${owner}/${repo}/issues/${numero}`, token, { state: "closed", state_reason: "completed" }, "PATCH");
}

export interface HookSummary { id: number; config: { url?: string } ; active: boolean; events: string[] }

export function listarHooks(owner: string, repo: string, token: string | null) {
  return api<HookSummary[]>(`/repos/${owner}/${repo}/hooks?per_page=100`, token);
}

export function crearHook(owner: string, repo: string, token: string | null, url: string, secret: string) {
  return apiEscribir<HookSummary>(`/repos/${owner}/${repo}/hooks`, token, { name: "web", active: true, events: ["issues", "milestone"], config: { url, content_type: "json", secret, insecure_ssl: "0" } });
}
