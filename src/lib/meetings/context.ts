import { prisma } from "@/lib/prisma";
import { describeRepo } from "@/lib/github/describe";
import { parseRepoSnapshot } from "@/lib/github/snapshot";
import { formatTimestamp } from "./transcript";

/** Cuántas reuniones previas del proyecto entran al contexto acumulado. */
const HISTORY_LIMIT = 6;

export interface MeetingProjectContext {
  /** Proyecto, entregables y reuniones anteriores. Sin el código. */
  block: string;
  /**
   * El mapa del repositorio, aparte.
   *
   * Va separado porque no todas las etapas lo necesitan: saber quién habló o
   * partir la reunión en capítulos no mejora por conocer el código, y ese bloque
   * son varios miles de tokens en cada llamada. La diarización de una reunión
   * larga son diez llamadas — pegárselo ahí sería pagarlo diez veces para nada.
   */
  repoBlock: string;
  projectName: string | null;
  /** Pendientes técnicos abiertos de reuniones anteriores */
  openItems: { title: string; from: string }[];
  /** `true` si el contexto incluye el código real del repositorio */
  hasRepo: boolean;
}

const EMPTY: MeetingProjectContext = {
  block:
    "No hay proyecto asociado a esta reunión, así que no hay contexto previo ni acceso al código.",
  repoBlock: "",
  projectName: null,
  openItems: [],
  hasRepo: false,
};

/**
 * Contexto acumulado del proyecto: qué es, qué se entregó, qué se habló en las
 * reuniones anteriores y qué quedó abierto. Es lo que hace que la reunión N+1
 * entienda de qué se está hablando sin repetir todo.
 *
 * Un solo viaje a Postgres — la latencia desde local ronda los 600 ms por
 * consulta, así que traemos todo con includes en vez de encadenar queries.
 */
export async function buildProjectContext(
  userId: string,
  projectId: string | null | undefined,
  excludeMeetingId?: string,
  clientId?: string | null
): Promise<MeetingProjectContext> {
  // Lo del cliente va en paralelo con el proyecto: sus otros proyectos y lo hablado fuera de este.
  const clienteP = clientId ? buildClientBlock(userId, clientId, projectId ?? null, excludeMeetingId) : Promise.resolve("");
  if (!projectId) {
    const clientBlock = await clienteP;
    return clientBlock ? { ...EMPTY, block: `No hay proyecto asociado a esta reunión ni acceso al código. Esto es lo que se sabe del cliente:\n\n${clientBlock}` } : EMPTY;
  }

  const [project, clientBlock] = await Promise.all([prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      name: true,
      description: true,
      scope: true,
      aiSummary: true,
      aiTags: true,
      status: true,
      repoSnapshot: true,
      client: { select: { name: true, company: true } },
      deliverables: {
        select: { name: true, description: true, completed: true, dueDate: true },
        orderBy: { sortOrder: "asc" },
        take: 40,
      },
      meetings: {
        where: {
          ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
          contextSummary: { not: null },
        },
        select: {
          id: true,
          title: true,
          meetingDate: true,
          contextSummary: true,
          actionItems: {
            where: { taskId: null, kind: "TECNICO" },
            select: { title: true },
            take: 10,
          },
        },
        orderBy: { meetingDate: "desc" },
        take: HISTORY_LIMIT,
      },
    },
  }), clienteP]);

  if (!project) return EMPTY;

  const lines: string[] = [`## Proyecto: ${project.name}`];

  if (project.client) {
    const label = project.client.company
      ? `${project.client.name} (${project.client.company})`
      : project.client.name;
    lines.push(`Cliente: ${label}`);
  }
  lines.push(`Estado: ${project.status}`);
  if (project.aiTags.length > 0) lines.push(`Stack / etiquetas: ${project.aiTags.join(", ")}`);
  if (project.description) lines.push(`\nDescripción:\n${project.description}`);
  if (project.scope) lines.push(`\nAlcance acordado:\n${project.scope}`);
  else if (project.aiSummary) lines.push(`\nResumen:\n${project.aiSummary}`);

  if (project.deliverables.length > 0) {
    const done = project.deliverables.filter((d) => d.completed);
    const pending = project.deliverables.filter((d) => !d.completed);
    lines.push("\n## Entregables");
    if (pending.length > 0) {
      lines.push(
        `Pendientes:\n${pending.map((d) => `- ${d.name}${d.description ? ` — ${d.description}` : ""}`).join("\n")}`
      );
    }
    if (done.length > 0) {
      lines.push(`Ya entregados:\n${done.map((d) => `- ${d.name}`).join("\n")}`);
    }
  }

  const openItems: { title: string; from: string }[] = [];

  if (project.meetings.length > 0) {
    lines.push("\n## Reuniones anteriores (de la más reciente a la más antigua)");
    // Se listan de más reciente a más antigua para que el modelo pese primero
    // lo último acordado si hay contradicciones con reuniones viejas.
    for (const m of project.meetings) {
      const date = m.meetingDate.toISOString().split("T")[0];
      lines.push(`\n### ${date} — ${m.title}\n${m.contextSummary}`);
      if (m.actionItems.length > 0) {
        lines.push(
          `Quedó abierto:\n${m.actionItems.map((i) => `- ${i.title}`).join("\n")}`
        );
        for (const item of m.actionItems) {
          openItems.push({ title: item.title, from: `${date} — ${m.title}` });
        }
      }
    }
  } else {
    lines.push("\n## Reuniones anteriores\nEsta es la primera reunión registrada del proyecto.");
  }

  if (clientBlock) lines.push(`\n${clientBlock}`);

  const snapshot = parseRepoSnapshot(project.repoSnapshot);
  const repoBlock = snapshot
    ? describeRepo(snapshot)
    : "## Código actual del proyecto\nEste proyecto no tiene repositorio conectado, así que no sabes qué está construido ya. No afirmes que algo existe o no existe en el código: cuando haga falta, dilo como algo a verificar.";

  return {
    block: lines.join("\n"),
    repoBlock,
    projectName: project.name,
    openItems,
    hasRepo: snapshot !== null,
  };
}

/**
 * Lo del cliente que no está en el proyecto: sus otros proyectos con la fase en curso y lo que se habló
 * con él en reuniones de otros proyectos o sin proyecto. Así una reunión con un cliente de años no
 * arranca de cero aunque el proyecto sea nuevo.
 */
async function buildClientBlock(userId: string, clientId: string, projectId: string | null, excludeMeetingId?: string): Promise<string> {
  const deCliente = { OR: [{ clientId }, { clients: { some: { clientId } } }] };
  const [client, projects, meetings] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, userId }, select: { name: true, company: true } }),
    prisma.project.findMany({
      where: { userId, ...deCliente, ...(projectId ? { id: { not: projectId } } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { name: true, status: true, phases: { where: { OR: [{ changeOrderId: null }, { changeOrder: { status: "aprobada" } }] }, orderBy: { sortOrder: "asc" }, select: { name: true, status: true } } },
    }),
    prisma.meeting.findMany({
      where: {
        userId,
        contextSummary: { not: null },
        ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
        // Las del proyecto ya entran arriba: aquí solo lo hablado por fuera.
        AND: [{ OR: [{ clientId }, { project: deCliente }] }, ...(projectId ? [{ OR: [{ projectId: null }, { projectId: { not: projectId } }] }] : [])],
      },
      orderBy: { meetingDate: "desc" },
      take: 4,
      select: { title: true, meetingDate: true, contextSummary: true },
    }),
  ]);
  if (!client) return "";
  const label = client.company && client.company !== client.name ? `${client.name} (${client.company})` : client.name;
  const lines = [`## El cliente: ${label}`];
  if (projects.length) {
    lines.push(projectId ? "Otros proyectos con él:" : "Sus proyectos:");
    for (const p of projects) lines.push(`- ${p.name} (${p.status})${p.phases.length ? `: ${p.phases.map((f) => `${f.name} [${f.status}]`).join(", ")}` : ""}`);
  }
  if (meetings.length) {
    lines.push(projectId ? "\nReuniones con el cliente fuera de este proyecto (de la más reciente a la más antigua):" : "\nReuniones anteriores con el cliente (de la más reciente a la más antigua):");
    for (const m of meetings) lines.push(`\n### ${m.meetingDate.toISOString().split("T")[0]} — ${m.title}\n${m.contextSummary}`);
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

/**
 * Añade al contexto las notas que el usuario escribió a mano para esta reunión.
 * Van primero y marcadas como prioritarias: si alguien se tomó el trabajo de
 * escribirlas, sabe algo que ni el proyecto ni la transcripción dicen.
 */
export function withManualContext(block: string, manualContext: string | null | undefined): string {
  const notes = manualContext?.trim();
  if (!notes) return block;
  return `## Contexto que aportó el equipo sobre esta reunión (tiene prioridad sobre lo demás)\n${notes}\n\n${block}`;
}

/** Resumen de una línea por segmento para el encabezado del prompt técnico. */
export function contextHeaderLine(durationMs: number, segmentCount: number): string {
  return `Reunión de ${formatTimestamp(durationMs)} (${segmentCount} intervenciones transcritas).`;
}

/**
 * Añade el mapa del código al contexto. Solo lo usan las etapas que de verdad
 * razonan sobre el sistema: minutas, pendientes, entregable y encargo técnico.
 */
export function withRepoContext(block: string, repoBlock: string): string {
  return repoBlock ? `${block}\n\n${repoBlock}` : block;
}
