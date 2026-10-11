/**
 * Un solo motor: cliente → proyecto → factura → pago siempre ligados (pedido del 2026-10-11).
 * Reglas que aplican TODOS los caminos que crean o editan documentos:
 *   1. Una factura siempre tiene cliente. Si solo se escribió el nombre, se busca el cliente por correo o
 *      nombre y, si no existe, se crea. Nada queda como texto suelto.
 *   2. Si hay proyecto y no hay cliente, el cliente es el principal del proyecto.
 *   3. Si el cliente no estaba en el proyecto, se agrega como cliente del proyecto (proyectos multi-cliente).
 *   4. Una cotización de un prospecto (lead) puede no tener cliente todavía; al ganarlo se le asigna a ella,
 *      a sus facturas y a sus pagos.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export type DatosCliente = {
  clientId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientCompany?: string | null;
  clientAddress?: string | null;
  clientRuc?: string | null;
};

const limpio = (s?: string | null) => (s ?? "").trim();

/** Cliente principal de un proyecto: Project.clientId o el primero de sus clientes. */
export async function clienteDelProyecto(userId: string, projectId: string, db: Db = prisma): Promise<string | null> {
  const p = await db.project.findFirst({ where: { id: projectId, userId }, select: { clientId: true, clients: { select: { clientId: true }, take: 1 } } });
  return p ? p.clientId ?? p.clients[0]?.clientId ?? null : null;
}

/** Busca el cliente por correo o por nombre/empresa exactos; si no existe y hay nombre, lo crea. */
export async function encontrarOCrearCliente(userId: string, d: DatosCliente, db: Db = prisma): Promise<string | null> {
  if (d.clientId) {
    const c = await db.client.findFirst({ where: { id: d.clientId, userId }, select: { id: true } });
    if (c) return c.id;
  }
  const nombre = limpio(d.clientName), empresa = limpio(d.clientCompany), correo = limpio(d.clientEmail).toLowerCase();
  if (!nombre && !empresa) return null;
  const or: Prisma.ClientWhereInput[] = [];
  if (correo) or.push({ email: { equals: correo, mode: "insensitive" } });
  if (empresa) or.push({ company: { equals: empresa, mode: "insensitive" } });
  if (nombre) or.push({ name: { equals: nombre, mode: "insensitive" } });
  const existente = await db.client.findFirst({ where: { userId, archivedAt: null, OR: or }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (existente) return existente.id;
  const nuevo = await db.client.create({
    data: { userId, name: nombre || empresa, company: empresa || null, email: correo || null, address: limpio(d.clientAddress) || null, ruc: limpio(d.clientRuc) || null },
    select: { id: true },
  });
  return nuevo.id;
}

/** Asegura que el cliente figure en el proyecto (ProjectClient) y que el proyecto tenga cliente principal. */
export async function unirClienteAProyecto(userId: string, projectId: string, clientId: string, db: Db = prisma) {
  const p = await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true, clientId: true } });
  if (!p) return;
  await db.projectClient.upsert({ where: { projectId_clientId: { projectId, clientId } }, create: { projectId, clientId }, update: {} });
  if (!p.clientId) await db.project.update({ where: { id: projectId }, data: { clientId } });
}

/**
 * Lo que tiene que quedar en un documento. Valida que el proyecto sea del equipo, completa el cliente
 * y deja el par cliente-proyecto coherente.
 */
export async function enlacesDeDocumento(
  userId: string,
  d: DatosCliente & { type: string; projectId?: string | null; leadId?: string | null },
  db: Db = prisma,
): Promise<{ clientId: string | null; projectId: string | null }> {
  let projectId = d.projectId || null;
  if (projectId) {
    const ok = await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
    if (!ok) projectId = null;
  }
  let clientId: string | null = null;
  const lead = d.leadId ? await db.lead.findFirst({ where: { id: d.leadId, userId }, select: { id: true, convertedClientId: true } }) : null;
  if (d.clientId) clientId = await encontrarOCrearCliente(userId, { clientId: d.clientId }, db);
  if (!clientId && lead?.convertedClientId) clientId = lead.convertedClientId;
  if (!clientId && projectId) clientId = await clienteDelProyecto(userId, projectId, db);
  // Una cotización de un prospecto puede esperar; una factura no: el prospecto pasa a ser cliente.
  if (!clientId && !(lead && d.type === "COTIZACION")) {
    clientId = await encontrarOCrearCliente(userId, d, db);
    if (clientId && lead && !lead.convertedClientId) await db.lead.update({ where: { id: lead.id }, data: { convertedClientId: clientId, convertedAt: new Date() } });
  }
  if (clientId && projectId) await unirClienteAProyecto(userId, projectId, clientId, db);
  return { clientId, projectId };
}

/** Al ganar un prospecto: su cliente pasa a las cotizaciones, a las facturas que salieron de ellas y a sus pagos. */
export async function asignarClienteDeLead(leadId: string, clientId: string, db: Db = prisma) {
  const cotizaciones = await db.document.findMany({ where: { leadId }, select: { id: true } });
  const ids = cotizaciones.map((c) => c.id);
  const facturas = ids.length ? await db.document.findMany({ where: { type: "FACTURA", linkedDocumentId: { in: ids } }, select: { id: true } }) : [];
  const todos = [...ids, ...facturas.map((f) => f.id)];
  if (!todos.length) return 0;
  await db.document.updateMany({ where: { id: { in: todos }, clientId: null }, data: { clientId } });
  await db.payment.updateMany({ where: { documentId: { in: todos }, clientId: null }, data: { clientId } });
  return todos.length;
}
