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
  excludeMeetingId?: string
): Promise<MeetingProjectContext> {
  if (!projectId) return EMPTY;

  const project = await prisma.project.findFirst({
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
  });

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
