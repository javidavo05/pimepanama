/**
 * Marcadores de GitHub por fase (pedido de Javier, 2026-10-15: «todos los proyectos con marcadores para que al
 * avanzar en GitHub la fase se mueva sola y avise al cliente»).
 *
 * Por cada fase sin milestone crea en el repo del proyecto:
 *  - un milestone «Fase N · nombre» (el marcador),
 *  - una tarea (issue) por cada entregable de la fase, o una sola «Entregar: …» si no tiene entregables.
 * El avance de la fase pasa a ser tareas cerradas / total (github-avance.ts) y deja de editarse a mano.
 * También deja puesto el webhook del repo, así el avance se mueve en el momento y no solo en la sincronía diaria.
 */
import { prisma } from "@/lib/prisma";
import { crearHook, crearIssue, crearMilestone, listarHooks } from "@/lib/github/client";
import { tokenParaRepo } from "@/lib/github/cuentas";
import { getSiteUrl } from "@/lib/site-url";

export type ResultadoMarcadores = { fases: number; tareas: number; webhook: "nuevo" | "ya_estaba" | "sin_secreto" | "sin_permiso"; avisos: string[] };

export async function prepararMarcadores(projectId: string): Promise<ResultadoMarcadores> {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true, repoOwner: true, repoName: true, githubAccountId: true, githubHookId: true,
      phases: { where: { OR: [{ changeOrderId: null }, { changeOrder: { status: "aprobada" } }] }, orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, description: true, status: true, progress: true, progressSource: true, githubMilestone: true, deliverables: { orderBy: { sortOrder: "asc" }, select: { name: true, description: true } } } } },
  });
  if (!p?.repoOwner || !p.repoName) throw new Error("El proyecto no tiene repositorio de GitHub. Conéctalo en la pestaña Resumen.");
  const { owner, repo } = { owner: p.repoOwner, repo: p.repoName };
  const { token } = await tokenParaRepo({ userId: p.userId, owner, repo, projectId: p.id, cuentaId: p.githubAccountId });
  const r: ResultadoMarcadores = { fases: 0, tareas: 0, webhook: "ya_estaba", avisos: [] };

  for (const [i, f] of p.phases.entries()) {
    if (f.githubMilestone || f.progressSource === "sin_marcador") continue;
    // Una fase terminada no necesita marcador: abrirle tareas en GitHub la haría ver pendiente.
    if (f.status === "hecha") continue;
    // Con avance y sin entregables, su única tarea abierta dejaría la barra del cliente en 0 %.
    if (!f.deliverables.length && Number(f.progress) > 0) {
      r.avisos.push(`«${f.name}» va al ${Math.round(Number(f.progress))} % y no tiene entregables: agrégalos antes de crear su marcador, o su barra volvería a 0 %.`);
      continue;
    }
    const m = await crearMilestone(owner, repo, token, `Fase ${i + 1} · ${f.name}`, f.description);
    const tareas = f.deliverables.length ? f.deliverables : [{ name: `Entregar: ${f.name}`, description: f.description }];
    for (const t of tareas) {
      await crearIssue(owner, repo, token, { title: t.name, body: `${t.description ? `${t.description}\n\n` : ""}_Tarea de la fase «${f.name}». El título lo lee el cliente en su cuenta de Pime al cerrarla._`, milestone: m.number });
      r.tareas++;
    }
    await prisma.projectPhase.update({ where: { id: f.id }, data: { githubMilestone: m.number, progressSource: "github" } });
    r.fases++;
  }

  // Webhook: el avance se mueve en el momento en que se cierra una tarea.
  const secreto = process.env.GITHUB_WEBHOOK_SECRET;
  const url = `${getSiteUrl()}/api/github/webhook`;
  if (!secreto) { r.webhook = "sin_secreto"; r.avisos.push("Falta GITHUB_WEBHOOK_SECRET en Vercel: el avance se moverá con la sincronía diaria, no al instante."); }
  else if (!p.githubHookId) {
    try {
      const ya = (await listarHooks(owner, repo, token)).find((h) => h.config.url === url);
      const h = ya ?? (await crearHook(owner, repo, token, url, secreto));
      await prisma.project.update({ where: { id: p.id }, data: { githubHookId: String(h.id) } });
      r.webhook = ya ? "ya_estaba" : "nuevo";
    } catch {
      r.webhook = "sin_permiso";
      r.avisos.push("El token no puede crear webhooks (permiso admin:repo_hook): el avance se moverá con la sincronía diaria.");
    }
  }
  return r;
}
