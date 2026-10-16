import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Lo que toda vista de tareas necesita de una fila: vínculos y conteo de subtareas. */
export const TASK_INCLUDE = {
  document: { select: { id: true, type: true, number: true, clientName: true, clientCompany: true } },
  paymentSchedule: { select: { id: true, description: true, documentId: true } },
  project: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
  // De qué reunión salió: el pendiente que la originó o la "próxima reunión" agendada
  meetingItems: { select: { meeting: { select: { id: true, title: true, meetingDate: true } } }, take: 1 },
  nextUpMeetings: { select: { id: true, title: true, meetingDate: true }, take: 1 },
  // CRM (fase 4): a quién o qué negocio pertenece y quién la tiene a cargo
  client: { select: { id: true, name: true, company: true } },
  lead: { select: { id: true, name: true, company: true } },
  oportunidad: { select: { id: true, titulo: true } },
  responsable: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.TaskInclude;

type TaskWithIncludes = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

export function serializeTask(t: TaskWithIncludes) {
  const { meetingItems, nextUpMeetings, responsable, ...rest } = t;
  const origin = meetingItems[0]?.meeting ?? nextUpMeetings[0] ?? null;
  return {
    ...rest,
    responsable: responsable ? { id: responsable.id, nombre: responsable.fullName || responsable.email } : null,
    meeting: origin ? { id: origin.id, title: origin.title, meetingDate: origin.meetingDate.toISOString() } : null,
    dueDate: t.dueDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export type SerializedTaskRow = ReturnType<typeof serializeTask>;

/**
 * Resuelve proyecto y sección de una tarea verificando que pertenezcan al
 * usuario. Una sección de otro proyecto se descarta; una sección sin proyecto
 * arrastra su proyecto.
 */
export async function resolveTaskPlacement(
  userId: string,
  projectId: string | null | undefined,
  sectionId: string | null | undefined,
): Promise<{ projectId: string | null; sectionId: string | null } | { error: string }> {
  let pid = projectId ?? null;
  let sid = sectionId ?? null;

  if (sid) {
    const section = await prisma.projectSection.findFirst({
      where: { id: sid, project: { userId } },
      select: { projectId: true },
    });
    if (!section) return { error: "Sección no encontrada" };
    if (pid && pid !== section.projectId) sid = null;
    else pid = section.projectId;
  }

  if (pid) {
    const project = await prisma.project.findFirst({ where: { id: pid, userId }, select: { id: true } });
    if (!project) return { error: "Proyecto no encontrado" };
  }

  return { projectId: pid, sectionId: sid };
}

type IdOpcional = string | null | undefined;

/**
 * Valida los vínculos del CRM de una tarea (cliente, lead, oportunidad y responsable): todo tiene que ser de la
 * empresa, y el responsable, el dueño o un miembro activo de su equipo. Solo revisa lo que viene en `data`
 * (undefined = no se toca). Si llega una oportunidad sin cliente ni lead, hereda los de la oportunidad.
 */
export async function resolverVinculosCrm(
  userId: string,
  data: { clientId?: IdOpcional; leadId?: IdOpcional; oportunidadId?: IdOpcional; responsableId?: IdOpcional },
): Promise<{ clientId?: string | null; leadId?: string | null; oportunidadId?: string | null; responsableId?: string | null } | { error: string }> {
  const id = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const out: { clientId?: string | null; leadId?: string | null; oportunidadId?: string | null; responsableId?: string | null } = {};
  if ("clientId" in data) out.clientId = id(data.clientId);
  if ("leadId" in data) out.leadId = id(data.leadId);
  if ("oportunidadId" in data) out.oportunidadId = id(data.oportunidadId);
  if ("responsableId" in data) out.responsableId = id(data.responsableId);

  const [cliente, lead, oportunidad, responsable] = await Promise.all([
    out.clientId ? prisma.client.findFirst({ where: { id: out.clientId, userId }, select: { id: true } }) : null,
    out.leadId ? prisma.lead.findFirst({ where: { id: out.leadId, userId }, select: { id: true } }) : null,
    out.oportunidadId ? prisma.oportunidad.findFirst({ where: { id: out.oportunidadId, userId }, select: { id: true, clientId: true, leadId: true } }) : null,
    out.responsableId
      ? prisma.empresaUser.findFirst({ where: { id: out.responsableId, OR: [{ id: userId }, { ownerId: userId, activo: true }] }, select: { id: true } })
      : null,
  ]);
  if (out.clientId && !cliente) return { error: "Cliente no encontrado" };
  if (out.leadId && !lead) return { error: "Lead no encontrado" };
  if (out.oportunidadId && !oportunidad) return { error: "Oportunidad no encontrada" };
  if (out.responsableId && !responsable) return { error: "Esa persona no está en el equipo" };
  if (oportunidad) {
    if (!("clientId" in data) && oportunidad.clientId) out.clientId = oportunidad.clientId;
    if (!("leadId" in data) && oportunidad.leadId) out.leadId = oportunidad.leadId;
  }
  return out;
}

/**
 * Carga lo que necesita un TaskWorkspace: las tareas (de un proyecto o todas)
 * y los proyectos con sus secciones, para poder mover tareas entre ellos.
 */
export async function loadTaskWorkspace(userId: string, projectId?: string | null, alsoTaskIds: string[] = []) {
  // Sin alcance se cargan todas; con alcance, las del proyecto más las tareas
  // sueltas pedidas (y sus subtareas), p. ej. las de una reunión sin proyecto.
  const scoped = projectId !== undefined || alsoTaskIds.length > 0;
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        ...(scoped
          ? {
              OR: [
                ...(projectId ? [{ projectId }] : []),
                ...(alsoTaskIds.length ? [{ id: { in: alsoTaskIds } }, { parentId: { in: alsoTaskIds } }] : []),
              ],
            }
          : {}),
      },
      include: TASK_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        status: true,
        sections: { select: { id: true, name: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  return {
    tasks: tasks.map(serializeTask),
    // Los proyectos cerrados no se ofrecen para tareas nuevas, salvo el actual
    projects: projects
      .filter((p) => p.id === projectId || p.status === "ACTIVE" || p.status === "PAUSED" || tasks.some((t) => t.projectId === p.id))
      .map(({ id, name, sections }) => ({ id, name, sections })),
  };
}
