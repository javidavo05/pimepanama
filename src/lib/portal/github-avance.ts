/**
 * Avance en vivo desde GitHub (decisión del 2026-10-11: «tareas cerradas en GitHub, agrupadas por fase»).
 * Cada fase con githubMilestone toma su avance de ese milestone: issues cerrados / total. Cada issue
 * cerrado se cuenta al cliente en su línea de tiempo con el título del issue (por eso los títulos se
 * escriben en palabras del cliente). Al cerrarse todas sus tareas (100 %) la fase pasa a «en revisión del
 * cliente» y el cliente recibe el aviso en su cuenta y por correo (fase-lista.ts); terminarla del todo sigue
 * siendo decisión del equipo.
 */
import { prisma } from "@/lib/prisma";
import { getClosedIssues, getMilestones, type MilestoneSummary } from "@/lib/github/client";
import { tokenParaRepo } from "@/lib/github/cuentas";
import { registrarEvento } from "./eventos";
import { avisarFaseLista } from "./fase-lista";

/**
 * `pre.milestones`: los milestones ya leídos por la revisión única (motor/sistemas.ts), para no volver a pedirlos.
 * Los issues cerrados solo se piden cuando el avance de la fase cambió o nunca se sincronizó.
 */
export async function sincronizarProyecto(projectId: string, pre?: { milestones?: Pick<MilestoneSummary, "number" | "open_issues" | "closed_issues">[] }): Promise<{ fases: number; issues: number }> {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, userId: true, repoOwner: true, repoName: true, clientId: true, clients: { select: { clientId: true } }, githubAccountId: true,
      phases: { where: { githubMilestone: { not: null } }, select: { id: true, name: true, status: true, progress: true, progressSource: true, githubMilestone: true, startedAt: true, reviewUrl: true } } },
  });
  if (!p?.repoOwner || !p.repoName || !p.phases.length) return { fases: 0, issues: 0 };
  const { token } = await tokenParaRepo({ userId: p.userId, owner: p.repoOwner, repo: p.repoName, projectId: p.id, cuentaId: p.githubAccountId });
  const milestones = pre?.milestones ?? (await getMilestones(p.repoOwner, p.repoName, token));
  const clientId = p.clientId ?? p.clients[0]?.clientId ?? null;
  let issues = 0;

  for (const f of p.phases) {
    const m = milestones.find((x) => x.number === f.githubMilestone);
    if (!m) continue;
    const total = m.open_issues + m.closed_issues;
    const progreso = total ? Math.round((m.closed_issues / total) * 1000) / 10 : 0;
    const estado = f.status === "hecha" ? "hecha" : progreso >= 100 ? "en_revision" : progreso > 0 ? (f.status === "en_revision" ? "en_revision" : "en_curso") : f.status;
    const cambio = Math.abs(progreso - Number(f.progress)) >= 0.1 || estado !== f.status;
    if (cambio) {
      await prisma.projectPhase.update({ where: { id: f.id }, data: { progress: f.status === "hecha" ? 100 : progreso, status: estado, progressSource: "github", startedAt: f.startedAt ?? (progreso > 0 ? new Date() : null) } });
      if (clientId && estado === "en_revision" && f.status !== "en_revision") {
        await registrarEvento({ userId: p.userId, clientId, projectId: p.id, entityType: "fase", entityId: f.id, kind: "fase_revision", title: `La fase ${f.name} está lista para tu revisión`, url: f.reviewUrl, visibility: "cliente", actorType: "github" });
      }
      if (estado === "en_revision" && f.status !== "en_revision") await avisarFaseLista(f.id);
    }
    if (!clientId || (!cambio && f.progressSource === "github")) continue;
    // Cada issue cerrado, una sola vez, en la línea de tiempo del cliente.
    const cerrados = await getClosedIssues(p.repoOwner, p.repoName, m.number, token);
    for (const i of cerrados.slice(0, 20)) {
      const ref = `${p.repoOwner}/${p.repoName}#${i.number}`;
      const ya = await prisma.activityEvent.findFirst({ where: { entityType: "github_issue", entityId: ref }, select: { id: true } });
      if (ya) continue;
      await registrarEvento({ userId: p.userId, clientId, projectId: p.id, entityType: "github_issue", entityId: ref, kind: "avance", title: `Listo en ${f.name}: ${i.title}`, detail: `${f.name} al ${Math.round(progreso)} %`, url: dondeVerlo(i.body) ?? f.reviewUrl, visibility: "cliente", actorType: "github" });
      issues++;
    }
  }
  return { fases: p.phases.length, issues };
}

/**
 * Dónde quedó el cambio de una tarea: la línea «Dónde verlo: https://…» del issue (la escribe el equipo al crear
 * o cerrar la tarea). Si no la tiene, el evento usa el enlace de revisión de su fase.
 */
export function dondeVerlo(body: string | null | undefined): string | null {
  const m = (body ?? "").match(/d[oó]nde verlo:\s*<?(https?:\/\/[^\s>)]+)/i);
  return m ? m[1] : null;
}
