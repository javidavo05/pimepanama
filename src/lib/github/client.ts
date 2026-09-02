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
