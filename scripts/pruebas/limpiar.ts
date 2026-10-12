/** Borra un cliente «[prueba]» con todo lo suyo (pagos, facturas, fases, proyectos, eventos). */
import { prisma } from "../../src/lib/prisma";

export async function limpiarCliente(id: string) {
  await prisma.payment.deleteMany({ where: { clientId: id } });
  const docs = await prisma.document.findMany({ where: { clientId: id }, select: { id: true } });
  await prisma.projectPhase.updateMany({ where: { invoiceId: { in: docs.map((d) => d.id) } }, data: { invoiceId: null } });
  await prisma.document.deleteMany({ where: { clientId: id } });
  await prisma.activityEvent.deleteMany({ where: { clientId: id } });
  const proyectos = await prisma.project.findMany({ where: { OR: [{ clientId: id }, { clients: { some: { clientId: id } } }] }, select: { id: true } });
  await prisma.activityEvent.deleteMany({ where: { projectId: { in: proyectos.map((p) => p.id) } } });
  await prisma.project.deleteMany({ where: { id: { in: proyectos.map((p) => p.id) } } });
  await prisma.client.deleteMany({ where: { id } });
}
