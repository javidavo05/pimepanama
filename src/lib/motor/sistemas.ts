/**
 * Motor único de los sistemas (decisión del 2026-10-16: «todo bajo un solo motor y revisado una sola vez»).
 *
 * Un sistema es un proyecto con repositorio o enlace: no hay que conectarlo aparte. Cada 30 min (dentro del
 * cron mail-watch, sin sumar funciones de Vercel), al llegar el webhook de GitHub o con «Revisar ahora»:
 *  1. se asegura su fila de Pulso (MonitoredSystem, origen «auto») a partir del enlace del proyecto o de su
 *     plataforma, solo si el enlace responde, para no avisarle al cliente de una caída que no es;
 *  2. se sondea la salud una vez (revisarPulsos cubre también los sistemas conectados a mano);
 *  3. se lee GitHub una vez (verificarConGithub) y con esos mismos milestones se mueve el avance de las fases;
 *  4. se guarda el resumen en Project.revision (revision.ts). Todas las pantallas leen de ahí.
 */
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { keyDesdeNombre } from "@/lib/pulso/reglas";
import { direccionValida, revisarPulsos, sondear, sondearSistema } from "@/lib/pulso/sondeo";
import { verificarConGithub, type VerificacionGithub } from "./verificar-github";
import { sincronizarProyecto } from "@/lib/portal/github-avance";
import { resumirRevision, type Revision } from "./revision";

const ACTIVOS = ["ACTIVE", "PAUSED"] as const;

const PROYECTO_SELECT = {
  id: true, userId: true, name: true, clientId: true, liveUrl: true, repoOwner: true, repoName: true, githubHookId: true,
  githubCheck: true, revision: true,
  clients: { select: { clientId: true }, take: 1 },
  platforms: { select: { accessUrl: true, linkUrl: true }, orderBy: { sortOrder: "asc" } },
  systems: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true, status: true, statusDetail: true, lastLatencyMs: true, lastEventAt: true, healthUrl: true } },
  phases: { where: { OR: [{ changeOrderId: null }, { changeOrder: { status: "aprobada" } }] }, select: { progress: true, githubMilestone: true, progressSource: true, status: true } },
} satisfies Prisma.ProjectSelect;

/** Enlace de la plataforma ligada, si el proyecto no tiene el suyo. */
function urlDePlataforma(ps: { accessUrl: string | null; linkUrl: string | null }[]): string | null {
  for (const p of ps) {
    const u = p.accessUrl || p.linkUrl;
    if (u && direccionValida(u)) return u;
  }
  return null;
}

/** Proyectos que son sistemas: activos, con repositorio, enlace, plataforma con enlace o Pulso. */
export function whereSistemas(userId?: string): Prisma.ProjectWhereInput {
  return {
    ...(userId ? { userId } : {}),
    status: { in: [...ACTIVOS] },
    OR: [{ repoName: { not: null } }, { liveUrl: { not: null } }, { platforms: { some: { OR: [{ accessUrl: { not: null } }, { linkUrl: { not: null } }] } } }, { systems: { some: {} } }],
  };
}

/**
 * Crea la fila de Pulso del proyecto si tiene enlace y todavía no tiene sistema. Solo si el enlace responde:
 * un enlace viejo marcaría «caído» y le avisaría al cliente de algo que no pasa. Devuelve el enlace que no
 * respondió, para que la revisión lo diga.
 */
async function asegurarSistema(p: { id: string; userId: string; name: string; clientId: string | null; clients: { clientId: string }[]; systems: { id: string }[] }, enlace: string | null): Promise<{ creado: boolean; sinRespuesta: string | null }> {
  if (p.systems.length || !enlace) return { creado: false, sinRespuesta: null };
  const clientId = p.clientId ?? p.clients[0]?.clientId;
  if (!clientId) return { creado: false, sinRespuesta: null };
  const r = await sondear(enlace);
  if (!r.ok) return { creado: false, sinRespuesta: enlace };
  const s = await prisma.monitoredSystem.create({
    data: { userId: p.userId, clientId, projectId: p.id, name: p.name, url: enlace, healthUrl: enlace, origen: "auto", key: keyDesdeNombre(p.name, randomBytes(3).toString("hex")) },
  });
  await sondearSistema(s.id);
  return { creado: true, sinRespuesta: null };
}

type Opciones = { github?: boolean; salud?: boolean };

/**
 * Revisión completa de un proyecto. `github: false` reusa la última lectura guardada (para el webhook, que ya
 * movió las fases); `salud: false` no vuelve a sondear (para la corrida de 30 min, que sondea todo junto).
 */
export async function revisarProyecto(projectId: string, op: Opciones = {}): Promise<Revision | null> {
  const { github = true, salud = true } = op;
  let p = await prisma.project.findUnique({ where: { id: projectId }, select: PROYECTO_SELECT });
  if (!p) return null;
  const urlPlataforma = urlDePlataforma(p.platforms);
  const enlace = p.liveUrl ?? urlPlataforma;

  const { creado, sinRespuesta } = await asegurarSistema(p, enlace);
  if (!creado && salud && p.systems[0]?.healthUrl) await sondearSistema(p.systems[0].id);

  let check = (p.githubCheck as VerificacionGithub | null) ?? null;
  if (github && p.repoOwner && p.repoName) {
    try {
      check = await verificarConGithub(p.userId, p.id);
      if (p.phases.some((f) => f.githubMilestone != null)) {
        await sincronizarProyecto(p.id, { milestones: check.milestones.map((m) => ({ number: m.numero, open_issues: m.abiertas, closed_issues: m.cerradas })) }).catch((e) => console.error("[motor] fases", p?.id, e));
      }
    } catch (e) {
      check = { ...(check ?? {}), error: e instanceof Error ? e.message : String(e) } as VerificacionGithub;
      await prisma.project.update({ where: { id: p.id }, data: { githubCheck: check as unknown as object, githubCheckAt: new Date() } });
    }
  }

  // Se relee lo que la revisión acaba de mover (sistema nuevo, estado de salud, avance de fases).
  p = (await prisma.project.findUnique({ where: { id: projectId }, select: PROYECTO_SELECT }))!;
  const rev = resumirRevision({
    repo: p.repoOwner && p.repoName ? `${p.repoOwner}/${p.repoName}` : null,
    liveUrl: p.liveUrl,
    urlPlataforma,
    sistema: p.systems[0] ?? null,
    enlaceSinRespuesta: sinRespuesta,
    github: check,
    hook: !!p.githubHookId,
    fases: p.phases.map((f) => ({ progress: Number(f.progress), githubMilestone: f.githubMilestone, sinMarcador: f.progressSource === "sin_marcador" || f.status === "hecha" })),
  });
  await prisma.project.update({ where: { id: p.id }, data: { revision: rev as unknown as object, revisadoAt: new Date() } });
  return rev;
}

async function enTandas<T>(xs: T[], n: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < xs.length; i += n) await Promise.all(xs.slice(i, i + n).map(fn));
}

/** La corrida de cada 30 min: un sondeo de salud para todos y una lectura de GitHub por proyecto. */
export async function revisarTodo() {
  const pulso = await revisarPulsos();
  const ps = await prisma.project.findMany({ where: whereSistemas(), select: { id: true } });
  let revisados = 0, errores = 0;
  await enTandas(ps, 3, async (x) => {
    try { await revisarProyecto(x.id, { salud: false }); revisados++; } catch (e) { errores++; console.error("[motor] revisar", x.id, e); }
  });
  return { pulso, proyectos: ps.length, revisados, errores };
}

/**
 * Lo que lista /empresa/sistemas: cada proyecto que es sistema con su última revisión, los sistemas conectados
 * a mano sin proyecto y las plataformas con enlace que todavía no tienen proyecto (no se pueden revisar).
 */
export async function sistemasUnificados(userId: string) {
  const [proyectos, sueltos, plataformas] = await Promise.all([
    prisma.project.findMany({
      where: whereSistemas(userId),
      select: {
        id: true, name: true, revision: true, revisadoAt: true,
        client: { select: { name: true, company: true } },
        clients: { take: 1, select: { client: { select: { name: true, company: true } } } },
        systems: { where: { active: true }, take: 1, select: { id: true, _count: { select: { incidents: { where: { resolvedAt: null } } } } } },
      },
    }),
    prisma.monitoredSystem.findMany({
      where: { userId, projectId: null, active: true },
      select: { id: true, name: true, status: true, client: { select: { name: true, company: true } }, _count: { select: { incidents: { where: { resolvedAt: null } } } } },
    }),
    prisma.platform.findMany({
      where: { userId, projectId: null, OR: [{ accessUrl: { not: null } }, { linkUrl: { not: null } }, { githubRepo: { not: null } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, accessUrl: true, linkUrl: true, client: { select: { name: true, company: true } } },
    }),
  ]);
  return {
    proyectos: proyectos.map((p) => {
      const c = p.client ?? p.clients[0]?.client ?? null;
      return {
        id: p.id, name: p.name, cliente: c ? c.company || c.name : null,
        revision: (p.revision as Revision | null) ?? null, revisadoAt: p.revisadoAt,
        sistemaId: p.systems[0]?.id ?? null, errores: p.systems[0]?._count.incidents ?? 0,
      };
    }),
    sueltos: sueltos.map((s) => ({ id: s.id, name: s.name, status: s.status, cliente: s.client.company || s.client.name, errores: s._count.incidents })),
    plataformasSinProyecto: plataformas.map((p) => ({ id: p.id, name: p.name, enlace: p.accessUrl || p.linkUrl, cliente: p.client ? p.client.company || p.client.name : null })),
  };
}
