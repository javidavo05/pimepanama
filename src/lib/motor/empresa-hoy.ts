/**
 * Inicio, segunda mitad: lo que se mueve en la empresa fuera de la agenda y el dinero.
 *   - Ventas: leads abiertos por etapa, los nuevos sin contactar, seguimientos vencidos, oportunidades abiertas y
 *     las solicitudes por correo que esperan visto bueno (la IA sugiere, el equipo aprueba).
 *   - Comunicación: los correos con clientes y leads (ligados por la migración 0062), los que esperan respuesta.
 *   - Actividad: lo último que pasó en las cuentas de los clientes.
 * Cada bloque se pide solo si el área lo ve, y todo va en una sola ida en paralelo.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SolicitudCotizacion } from "@/lib/mail/ai-analyze";

const DIA = 86_400_000;
const ABIERTOS = ["NUEVO", "CONTACTADO", "COTIZANDO", "NEGOCIACION"] as const;
export const ETAPA_LEAD: Record<(typeof ABIERTOS)[number], string> = { NUEVO: "Nuevos", CONTACTADO: "Contactados", COTIZANDO: "Cotizando", NEGOCIACION: "Negociación" };

type Ver = { ventas: boolean; correos: boolean };

export type CorreoReciente = {
  id: string; recibido: boolean; asunto: string; fecha: Date; resumen: string | null;
  quien: { tipo: "cliente" | "lead"; id: string; nombre: string };
};

export async function datosDeLaEmpresa(userId: string, ver: Ver, ahora = new Date()) {
  const hace7 = new Date(ahora.getTime() - 7 * DIA);
  const hace2 = new Date(ahora.getTime() - 2 * DIA);
  const hace30 = new Date(ahora.getTime() - 30 * DIA);
  const hace60 = new Date(ahora.getTime() - 60 * DIA);
  const nada = Promise.resolve([] as never[]);

  const [porEtapa, nuevos7, sinContactar, seguimientos, oportunidades, solicitudes, correos, esperan, actividad] = await Promise.all([
    ver.ventas ? prisma.lead.groupBy({ by: ["status"], where: { userId, status: { in: [...ABIERTOS] } }, _count: { _all: true } }) : nada,
    ver.ventas ? prisma.lead.count({ where: { userId, createdAt: { gte: hace7 } } }) : Promise.resolve(0),
    ver.ventas
      ? prisma.lead.findMany({ where: { userId, status: "NUEVO", createdAt: { lt: hace2 } }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], take: 4, select: { id: true, name: true, company: true, priority: true, createdAt: true } })
      : nada,
    ver.ventas
      ? prisma.lead.findMany({ where: { userId, status: { in: [...ABIERTOS] }, nextFollowUpAt: { lt: ahora } }, orderBy: { nextFollowUpAt: "asc" }, take: 4, select: { id: true, name: true, company: true, nextFollowUpAt: true } })
      : nada,
    ver.ventas ? prisma.oportunidad.aggregate({ where: { userId, estado: "abierta" }, _sum: { valor: true }, _count: { _all: true } }) : Promise.resolve(null),
    // Solicitudes de cotización que la IA vio en el correo y nadie aprobó ni descartó (las ve quien ve el correo).
    ver.correos
      ? prisma.inboxEmail.findMany({
          where: { userId, folder: "INBOX", leadId: null, clientId: null, vinculo: null, NOT: { solicitud: { equals: Prisma.DbNull } }, receivedAt: { gte: hace60 } },
          orderBy: { receivedAt: "desc" }, take: 4, select: { id: true, fromName: true, fromEmail: true, receivedAt: true, solicitud: true },
        })
      : nada,
    ver.correos
      ? prisma.inboxEmail.findMany({
          where: { userId, folder: { in: ["INBOX", "SENT"] }, OR: [{ clientId: { not: null } }, { leadId: { not: null } }], vinculo: { not: "ignorado" } },
          orderBy: { receivedAt: "desc" }, take: 4,
          select: { id: true, folder: true, subject: true, receivedAt: true, aiSummary: true, client: { select: { id: true, name: true, company: true } }, lead: { select: { id: true, name: true } } },
        })
      : nada,
    // Clientes y leads cuyo último correo del mes es de ellos: nadie del equipo les escribió después (por ningún
    // buzón ni hilo). Las respuestas automáticas no cuentan como algo que contestar.
    ver.correos
      ? prisma.$queryRaw<{ id: string; subject: string | null; receivedAt: Date; nombre: string; tipo: "cliente" | "lead"; refId: string }[]>(Prisma.sql`
          SELECT DISTINCT ON (coalesce(m."clientId", m."leadId")) m.id, m.subject, m."receivedAt",
                 coalesce(c.company, c.name, l.name) AS nombre,
                 CASE WHEN m."clientId" IS NOT NULL THEN 'cliente' ELSE 'lead' END AS tipo,
                 coalesce(m."clientId", m."leadId") AS "refId"
          FROM "InboxEmail" m
          LEFT JOIN "Client" c ON c.id = m."clientId"
          LEFT JOIN "Lead" l ON l.id = m."leadId"
          WHERE m."userId" = ${userId} AND m.folder = 'INBOX' AND m."receivedAt" >= ${hace30}
            AND (m."clientId" IS NOT NULL OR m."leadId" IS NOT NULL) AND m.vinculo IS DISTINCT FROM 'ignorado'
            AND coalesce(m.subject, '') !~* '^(respuesta autom|automatic reply|auto(matische)?[ -]?(reply|antwort)|out of office|fuera de la oficina)'
            AND NOT EXISTS (
              SELECT 1 FROM "InboxEmail" s
              WHERE s."userId" = m."userId" AND s.folder = 'SENT' AND s."receivedAt" > m."receivedAt"
                AND ((m."clientId" IS NOT NULL AND s."clientId" = m."clientId") OR (m."leadId" IS NOT NULL AND s."leadId" = m."leadId")
                     OR s."threadKey" = m."threadKey" OR s."repliedToEmailId" = m.id)
            )
          ORDER BY coalesce(m."clientId", m."leadId"), m."receivedAt" DESC
          LIMIT 20`)
      : nada,
    prisma.activityEvent.findMany({
      where: { userId, client: { internal: false } }, orderBy: { createdAt: "desc" }, take: 6,
      select: { id: true, title: true, detail: true, createdAt: true, actorType: true, clientId: true, client: { select: { name: true, company: true } } },
    }),
  ]);

  const etapas = ABIERTOS.map((s) => ({ etapa: s, label: ETAPA_LEAD[s], n: porEtapa.find((g) => g.status === s)?._count._all ?? 0 }));
  const esperanOrden = [...esperan].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  return {
    ventas: ver.ventas
      ? {
          etapas,
          abiertos: etapas.reduce((t, e) => t + e.n, 0),
          nuevos7,
          sinContactar: sinContactar.map((l) => ({ ...l, dias: Math.floor((ahora.getTime() - l.createdAt.getTime()) / DIA) })),
          seguimientos: seguimientos.map((l) => ({ ...l, dias: Math.max(0, Math.floor((ahora.getTime() - (l.nextFollowUpAt as Date).getTime()) / DIA)) })),
          oportunidades: { n: oportunidades?._count._all ?? 0, valor: Number(oportunidades?._sum.valor ?? 0) },
        }
      : null,
    solicitudes: solicitudes.map((m) => {
      const s = m.solicitud as unknown as SolicitudCotizacion;
      return { id: m.id, quien: [s.nombre || m.fromName || m.fromEmail, s.empresa].filter(Boolean).join(" · "), necesidad: s.necesidad, prioridad: s.prioridad, fecha: m.receivedAt };
    }),
    correos: ver.correos
      ? {
          recientes: correos.map((m): CorreoReciente => ({
            id: m.id, recibido: m.folder === "INBOX", asunto: m.subject?.trim() || "(sin asunto)", fecha: m.receivedAt, resumen: m.aiSummary,
            quien: m.client ? { tipo: "cliente", id: m.client.id, nombre: m.client.company || m.client.name } : { tipo: "lead", id: m.lead!.id, nombre: m.lead!.name },
          })),
          esperan: esperanOrden.slice(0, 3),
          totalEsperan: esperanOrden.length,
        }
      : null,
    actividad: actividad.map((a) => ({ id: a.id, titulo: a.title, detalle: a.detail, fecha: a.createdAt, delCliente: a.actorType === "cliente", clienteId: a.clientId, cliente: a.client.company || a.client.name })),
  };
}
