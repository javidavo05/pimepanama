/**
 * Segunda verificación de un sistema (pedido de Javier, 2026-10-17): las fases y entregables ya nacieron en
 * Pime; aquí se comprueba que GitHub tenga exactamente eso. Cada fase activa con su milestone «Fase N · nombre»,
 * una tarea por entregable con el mismo título, sin PR dentro de las fases y con el webhook puesto. Solo lee;
 * reparar es crear los marcadores que faltan con prepararMarcadores (nunca borra ni renombra en GitHub).
 */
import { prisma } from "@/lib/prisma";
import { tokenParaRepo } from "@/lib/github/cuentas";

export type EstadoCheck = "ok" | "warn" | "fail";
export type CheckFase = { estado: EstadoCheck; texto: string; fase?: string };
export type VerificacionFases = {
  estado: EstadoCheck;
  repo: string | null;
  fases: number;
  conMarcador: number;
  /** Fases que «Crear marcadores» puede arreglar ahora mismo. */
  sinMarcador: number;
  checks: CheckFase[];
};

type MilestoneGh = { number: number; title: string; state: string; open_issues: number; closed_issues: number };
type IssueGh = { number: number; title: string; state: string; milestone: { number: number } | null; pull_request?: unknown };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

async function gh<T>(path: string, token: string | null): Promise<T> {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "pime-suite", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(r.status === 404 ? "Ninguna cuenta guardada puede leer el repositorio." : r.status === 401 || r.status === 403 ? "GitHub rechazó el token del repositorio." : `GitHub respondió ${r.status}.`);
  return (await r.json()) as T;
}

/** Todas las tareas con milestone (hasta 300), en tandas de 100. */
async function tareasConMilestone(base: string, token: string | null): Promise<IssueGh[]> {
  const out: IssueGh[] = [];
  for (let page = 1; page <= 3; page++) {
    const lote = await gh<IssueGh[]>(`${base}/issues?state=all&milestone=*&per_page=100&page=${page}`, token);
    out.push(...lote);
    if (lote.length < 100) break;
  }
  return out;
}

function resumen(checks: CheckFase[]): EstadoCheck {
  return checks.some((c) => c.estado === "fail") ? "fail" : checks.some((c) => c.estado === "warn") ? "warn" : "ok";
}

export async function verificarFases(userId: string, projectId: string): Promise<VerificacionFases> {
  const p = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true, repoOwner: true, repoName: true, githubAccountId: true, githubHookId: true,
      phases: {
        where: { OR: [{ changeOrderId: null }, { changeOrder: { status: "aprobada" } }] },
        orderBy: { sortOrder: "asc" },
        select: { name: true, status: true, progressSource: true, githubMilestone: true, deliverables: { orderBy: { sortOrder: "asc" }, select: { name: true } } },
      },
    },
  });
  if (!p) throw new Error("Ese proyecto no existe.");
  const repo = p.repoOwner && p.repoName ? `${p.repoOwner}/${p.repoName}` : null;
  const checks: CheckFase[] = [];
  const v: VerificacionFases = { estado: "ok", repo, fases: p.phases.length, conMarcador: 0, sinMarcador: 0, checks };

  if (!p.phases.length) {
    checks.push({ estado: "fail", texto: "El proyecto no tiene fases en Pime. Créalas con el asistente Nuevo proyecto desde la cotización: sin fases el cliente no ve avance." });
  }
  for (const f of p.phases) {
    const activa = f.status !== "hecha" && f.progressSource !== "sin_marcador";
    if (activa && !f.deliverables.length) checks.push({ estado: "warn", fase: f.name, texto: `«${f.name}» no tiene entregables: su marcador tendría una sola tarea y la barra saltaría de 0 a 100 %.` });
  }
  if (!repo) {
    checks.push({ estado: "fail", texto: "El proyecto no tiene repositorio ligado: sin repo el avance no se mueve solo." });
    v.estado = resumen(checks);
    return v;
  }

  const { token } = await tokenParaRepo({ userId, owner: p.repoOwner!, repo: p.repoName!, projectId: p.id, cuentaId: p.githubAccountId });
  const base = `/repos/${p.repoOwner}/${p.repoName}`;
  let milestones: MilestoneGh[];
  let tareas: IssueGh[];
  try {
    [milestones, tareas] = await Promise.all([gh<MilestoneGh[]>(`${base}/milestones?state=all&per_page=100`, token), tareasConMilestone(base, token)]);
  } catch (e) {
    checks.push({ estado: "fail", texto: e instanceof Error ? e.message : "No se pudo leer GitHub." });
    v.estado = resumen(checks);
    return v;
  }

  const ligados = new Set<number>();
  for (const [i, f] of p.phases.entries()) {
    const esperado = `Fase ${i + 1} · ${f.name}`;
    if (!f.githubMilestone) {
      if (f.status === "hecha" || f.progressSource === "sin_marcador") continue;
      v.sinMarcador++;
      checks.push({ estado: "fail", fase: f.name, texto: `«${f.name}» no tiene marcador en GitHub: su avance no llega al cliente.` });
      continue;
    }
    ligados.add(f.githubMilestone);
    const m = milestones.find((x) => x.number === f.githubMilestone);
    if (!m) {
      checks.push({ estado: "fail", fase: f.name, texto: `El marcador #${f.githubMilestone} de «${f.name}» ya no existe en GitHub (lo borraron).` });
      continue;
    }
    v.conMarcador++;
    const propias = tareas.filter((t) => t.milestone?.number === m.number);
    const issues = propias.filter((t) => !t.pull_request);
    const prs = propias.filter((t) => t.pull_request);
    const problemas: string[] = [];
    if (norm(m.title) !== norm(esperado)) problemas.push(`el marcador se llama «${m.title}» y en Pime es «${esperado}»`);
    if (f.deliverables.length && issues.length !== f.deliverables.length) problemas.push(`${issues.length} tarea${issues.length === 1 ? "" : "s"} en GitHub para ${f.deliverables.length} entregable${f.deliverables.length === 1 ? "" : "s"}`);
    const titulos = new Set(issues.map((t) => norm(t.title)));
    const faltan = f.deliverables.filter((d) => !titulos.has(norm(d.name))).map((d) => `«${d.name}»`);
    if (faltan.length) problemas.push(`sin tarea con el título de ${faltan.slice(0, 3).join(", ")}${faltan.length > 3 ? ` y ${faltan.length - 3} más` : ""}`);
    if (prs.length) problemas.push(`PR dentro de la fase (${prs.map((x) => `#${x.number}`).join(", ")}): cuentan en el avance del cliente`);
    const cerradas = issues.filter((t) => t.state === "closed").length;
    checks.push(problemas.length
      ? { estado: "warn", fase: f.name, texto: `«${f.name}»: ${problemas.join("; ")}.` }
      : { estado: "ok", fase: f.name, texto: `«${f.name}»: marcador y ${issues.length} tarea${issues.length === 1 ? "" : "s"} cuadran (${cerradas} cerrada${cerradas === 1 ? "" : "s"}).` });
  }

  const sueltos = milestones.filter((m) => /^Fase \d+ · /.test(m.title) && !ligados.has(m.number));
  if (sueltos.length) checks.push({ estado: "warn", texto: `Marcadores hechos a mano en GitHub que no están ligados a ninguna fase: ${sueltos.map((m) => `«${m.title}»`).join(", ")}. Su avance no llega al cliente.` });
  checks.push(p.githubHookId
    ? { estado: "ok", texto: "Webhook de Pime puesto: el avance se mueve al cerrar cada tarea." }
    : { estado: "warn", texto: "Sin webhook de Pime: el avance se mueve una vez al día. «Crear los marcadores que faltan» lo deja puesto si el token tiene admin:repo_hook." });

  v.estado = resumen(checks);
  return v;
}
