/** Confirmar, cancelar o deshacer lo que propuso el asistente. Usa el mismo motor que la interfaz. */
import { prisma } from "@/lib/prisma";
import { crearCobro, type Equipo } from "@/lib/motor/cobros";
import { registrarPago } from "@/lib/portal/empresa";
import { registrarEvento } from "@/lib/portal/eventos";

type U = Equipo & { id: string };

export async function confirmarAccion(u: U, id: string) {
  const a = await prisma.assistantAction.findFirst({ where: { id, userId: u.id } });
  if (!a) throw new Error("No encontré esa propuesta.");
  if (a.status !== "propuesta") return a;
  const p = a.payload as Record<string, string | number | null>;
  try {
    let resultType = "", resultId = "", resultHref = "";
    if (a.kind === "factura") {
      const r = await crearCobro(u, { tipo: "monto", clientId: String(p.clienteId), projectId: (p.proyectoId as string) || null, concepto: String(p.concepto), monto: Number(p.monto) });
      resultType = "factura"; resultId = r.id; resultHref = `/empresa/facturas/${r.id}`;
    } else if (a.kind === "tarea") {
      const t = await prisma.task.create({ data: { userId: u.id, title: String(p.titulo).slice(0, 300), description: (p.detalle as string) || null, projectId: (p.proyectoId as string) || null, dueDate: p.vence ? new Date(`${p.vence}T17:00:00Z`) : null, allDay: !!p.vence } });
      resultType = "tarea"; resultId = t.id; resultHref = p.proyectoId ? `/empresa/proyectos/${p.proyectoId}?tab=tareas` : "/empresa/tareas";
    } else if (a.kind === "nota") {
      const proj = await prisma.project.findFirst({ where: { id: String(p.proyectoId), userId: u.id }, select: { id: true, clientId: true, clients: { select: { clientId: true }, take: 1 } } });
      const clientId = proj?.clientId ?? proj?.clients[0]?.clientId;
      if (!proj || !clientId) throw new Error("El proyecto no tiene cliente para guardar la nota.");
      const e = await prisma.activityEvent.create({ data: { userId: u.id, clientId, projectId: proj.id, entityType: "nota", kind: "nota_interna", title: String(p.texto).slice(0, 500), visibility: "interno", actorType: "pime", actorEmpresaUserId: u.id } });
      resultType = "nota"; resultId = e.id; resultHref = `/empresa/proyectos/${proj.id}`;
    } else if (a.kind === "pago") {
      const pg = await registrarPago(u, { clientId: String(p.clienteId), documentId: (p.facturaId as string) || null, monto: Number(p.monto), fecha: String(p.fecha), metodo: String(p.metodo), referencia: (p.referencia as string) || null, nota: "Registrado con el asistente" });
      resultType = "pago"; resultId = pg.id; resultHref = `/empresa/clientes/${p.clienteId}`;
    }
    return prisma.assistantAction.update({ where: { id: a.id }, data: { status: "hecha", decidedAt: new Date(), resultType, resultId, resultHref } });
  } catch (e) {
    await prisma.assistantAction.update({ where: { id: a.id }, data: { status: "fallida", decidedAt: new Date(), error: e instanceof Error ? e.message : "Falló" } });
    throw e;
  }
}

export async function cancelarAccion(userId: string, id: string) {
  await prisma.assistantAction.updateMany({ where: { id, userId, status: "propuesta" }, data: { status: "cancelada", decidedAt: new Date() } });
}

/** Deshacer: borra lo creado si todavía se puede (factura en borrador, tarea, nota, pago sin factura cerrada). */
export async function deshacerAccion(userId: string, id: string) {
  const a = await prisma.assistantAction.findFirst({ where: { id, userId, status: "hecha" } });
  if (!a?.resultId) throw new Error("No hay nada que deshacer.");
  if (a.resultType === "factura") {
    const d = await prisma.document.findFirst({ where: { id: a.resultId, userId }, select: { status: true } });
    if (d && d.status !== "DRAFT") throw new Error("La factura ya salió del borrador; anúlala desde la factura.");
    if (d) await prisma.document.delete({ where: { id: a.resultId } });
  } else if (a.resultType === "tarea") {
    await prisma.task.deleteMany({ where: { id: a.resultId, userId } });
  } else if (a.resultType === "nota") {
    await prisma.activityEvent.deleteMany({ where: { id: a.resultId, userId } });
  } else if (a.resultType === "pago") {
    const pg = await prisma.payment.findFirst({ where: { id: a.resultId, userId }, select: { documentId: true, clientId: true, amount: true } });
    if (pg) {
      await prisma.payment.delete({ where: { id: a.resultId } });
      if (pg.documentId) { const { recalcularFactura } = await import("@/lib/portal/empresa"); await recalcularFactura(pg.documentId); }
      if (pg.clientId) await registrarEvento({ userId, clientId: pg.clientId, entityType: "pago", kind: "pago_deshecho", title: "Pago registrado por error, deshecho", visibility: "interno", actorType: "pime" });
    }
  }
  await prisma.assistantAction.update({ where: { id: a.id }, data: { status: "deshecha", decidedAt: new Date() } });
}
