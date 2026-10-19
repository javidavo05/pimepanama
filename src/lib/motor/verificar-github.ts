/**
 * Estado de un proyecto verificado con GitHub: lo que el repositorio dice de verdad, para definir el
 * avance antes de mostrárselo al cliente. Solo lee. Se guarda en Project.githubCheck (migración 0042).
 */
import { prisma } from "@/lib/prisma";
import { tokenParaRepo } from "@/lib/github/cuentas";

type Commit = { sha: string; mensaje: string; autor: string; fecha: string };
export type VerificacionGithub = {
  repo: string;
  rama: string;
  cuenta: string | null;
  privado: boolean;
  ultimoCommit: Commit | null;
  commits7: number;
  commits30: number;
  semanas: number[]; // commits por semana, las últimas 8 (la última es la actual)
  recientes: Commit[];
  milestones: { numero: number; titulo: string; abiertas: number; cerradas: number; estado: string; vence: string | null }[];
  issues: { abiertas: number; cerradas: number };
  prsAbiertos: { numero: number; titulo: string; fecha: string }[];
  despliegue: { entorno: string; fecha: string } | null;
  error?: string;
};

/**
 * Lee Project.githubCheck sin fiarse de su forma: si la revisión falló antes de la primera lectura
 * buena, lo guardado es solo `{ error }`. `datos` sale solo cuando la lectura está completa.
 */
export function leerVerificacion(json: unknown): { datos: VerificacionGithub | null; error: string | null } {
  if (!json || typeof json !== "object") return { datos: null, error: null };
  const v = json as Partial<VerificacionGithub>;
  const error = typeof v.error === "string" && v.error ? v.error : null;
  const completo = Array.isArray(v.semanas) && Array.isArray(v.milestones) && typeof v.commits7 === "number" && typeof v.commits30 === "number";
  return { datos: completo ? (v as VerificacionGithub) : null, error };
}

async function gh<T>(path: string, token: string | null): Promise<{ data: T; headers: Headers } | null> {
  const r = await fetch(`https://api.github.com${path}`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "pime-suite", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!r.ok) {
    if (r.status === 404 || r.status === 401 || r.status === 403) throw new Error(r.status === 404 ? "Ninguna cuenta guardada puede leer este repositorio." : "GitHub rechazó el token.");
    return null;
  }
  return { data: (await r.json()) as T, headers: r.headers };
}

/** Total de una lista usando el Link de la paginación (per_page=1). */
async function contar(path: string, token: string | null): Promise<number> {
  const r = await gh<unknown[]>(`${path}${path.includes("?") ? "&" : "?"}per_page=1`, token);
  if (!r) return 0;
  const m = r.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
  return m ? Number(m[1]) : r.data.length;
}

export async function verificarConGithub(userId: string, projectId: string): Promise<VerificacionGithub> {
  const p = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true, repoOwner: true, repoName: true, repoBranch: true, githubAccountId: true } });
  if (!p?.repoOwner || !p.repoName) throw new Error("El proyecto no tiene repositorio ligado.");
  const { token, login } = await tokenParaRepo({ userId, owner: p.repoOwner, repo: p.repoName, projectId: p.id, cuentaId: p.githubAccountId });
  const base = `/repos/${p.repoOwner}/${p.repoName}`;
  const meta = await gh<{ default_branch: string; private: boolean }>(base, token);
  const rama = p.repoBranch || meta?.data.default_branch || "main";
  const hace = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

  const [commits60, milestones, abiertas, cerradas, prs, despliegues] = await Promise.all([
    gh<{ sha: string; commit: { message: string; author: { name: string; date: string } } }[]>(`${base}/commits?sha=${encodeURIComponent(rama)}&since=${hace(56)}&per_page=100`, token),
    gh<{ number: number; title: string; open_issues: number; closed_issues: number; state: string; due_on: string | null }[]>(`${base}/milestones?state=all&per_page=50&sort=due_on`, token),
    contar(`${base}/issues?state=open`, token),
    contar(`${base}/issues?state=closed`, token),
    gh<{ number: number; title: string; created_at: string }[]>(`${base}/pulls?state=open&per_page=10`, token),
    gh<{ environment: string; created_at: string }[]>(`${base}/deployments?per_page=1`, token).catch(() => null),
  ]);
  const ultimo = await gh<{ sha: string; commit: { message: string; author: { name: string; date: string } } }[]>(`${base}/commits?sha=${encodeURIComponent(rama)}&per_page=1`, token);

  const aCommit = (c: { sha: string; commit: { message: string; author: { name: string; date: string } } }): Commit => ({ sha: c.sha.slice(0, 7), mensaje: c.commit.message.split("\n")[0].slice(0, 140), autor: c.commit.author.name, fecha: c.commit.author.date });
  const lista = (commits60?.data ?? []).map(aCommit);
  const ahora = Date.now();
  const semanas = Array.from({ length: 8 }, (_, i) => lista.filter((c) => { const dias = (ahora - Date.parse(c.fecha)) / 86_400_000; return dias >= (7 - i) * 7 && dias < (8 - i) * 7; }).length);

  const v: VerificacionGithub = {
    repo: `${p.repoOwner}/${p.repoName}`, rama, cuenta: login, privado: !!meta?.data.private,
    ultimoCommit: ultimo?.data[0] ? aCommit(ultimo.data[0]) : null,
    commits7: lista.filter((c) => ahora - Date.parse(c.fecha) < 7 * 86_400_000).length,
    commits30: lista.filter((c) => ahora - Date.parse(c.fecha) < 30 * 86_400_000).length,
    semanas,
    recientes: lista.slice(0, 12),
    milestones: (milestones?.data ?? []).map((m) => ({ numero: m.number, titulo: m.title, abiertas: m.open_issues, cerradas: m.closed_issues, estado: m.state, vence: m.due_on })),
    // La API de issues cuenta también los PR; es una cota, no un número exacto de tareas.
    issues: { abiertas, cerradas },
    prsAbiertos: (prs?.data ?? []).map((x) => ({ numero: x.number, titulo: x.title.slice(0, 120), fecha: x.created_at })),
    despliegue: despliegues?.data[0] ? { entorno: despliegues.data[0].environment, fecha: despliegues.data[0].created_at } : null,
  };
  await prisma.project.update({ where: { id: p.id }, data: { githubCheck: v as unknown as object, githubCheckAt: new Date() } });
  return v;
}
