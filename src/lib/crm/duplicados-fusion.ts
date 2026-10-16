/**
 * Fusión de dos clientes (fase 6 del CRM): cuenta lo que tiene el que se va y lo mueve TODO al que queda en una
 * transacción. Recorre las 22 relaciones de `Client` en prisma/schema.prisma; si se agrega una nueva, va aquí.
 */
import { prisma } from "@/lib/prisma";
import { datosFusion, enlacesProyecto, CAMPOS_COMPLETAR } from "./duplicados";

/** Cada relación con su nombre en palabras, en el orden en que se muestra en el resumen. */
export const RELACIONES = [
  ["documents", "documentos (facturas y cotizaciones)"], ["projects", "proyectos"], ["projectLinks", "proyectos compartidos"],
  ["contracts", "contratos"], ["meetings", "reuniones"], ["convertedFromLeads", "leads de origen"], ["portalUsers", "cuentas del portal"],
  ["changeOrders", "órdenes de cambio"], ["tickets", "tickets"], ["timeEntries", "registros de horas"], ["payments", "pagos"],
  ["approvals", "aprobaciones"], ["activityEvents", "eventos de la línea de tiempo"], ["systems", "sistemas monitoreados"],
  ["platforms", "plataformas"], ["contactos", "contactos"], ["interacciones", "interacciones"], ["oportunidades", "oportunidades"],
  ["tareasCrm", "tareas"], ["campanaEnvios", "envíos de campañas"], ["encuestas", "encuestas"], ["archivos", "archivos"],
] as const;
type Relacion = (typeof RELACIONES)[number][0];

const SELECT_CLIENTE = {
  id: true, name: true, company: true, email: true, phone: true, ruc: true, address: true, city: true, notes: true,
  fuente: true, industria: true, logoKey: true, responsableId: true, etiquetas: true, ultimoContactoAt: true,
  camposExtra: true, portalEnabled: true, hourlyRate: true, internal: true, brandLine: true, createdAt: true,
  _count: { select: Object.fromEntries(RELACIONES.map(([k]) => [k, true])) as Record<Relacion, true> },
} as const;

export async function resumenFusion(userId: string, quedaId: string, otroId: string) {
  if (quedaId === otroId) return null;
  const [queda, otro] = await Promise.all([
    prisma.client.findFirst({ where: { id: quedaId, userId }, select: SELECT_CLIENTE }),
    prisma.client.findFirst({ where: { id: otroId, userId }, select: SELECT_CLIENTE }),
  ]);
  if (!queda || !otro) return null;
  const { completados } = datosFusion(
    { ...queda, hourlyRate: queda.hourlyRate?.toString() ?? null },
    { ...otro, hourlyRate: otro.hourlyRate?.toString() ?? null },
  );
  const mueve = RELACIONES.map(([k, label]) => ({ clave: k, label, n: (otro._count as Record<Relacion, number>)[k] ?? 0 })).filter((r) => r.n > 0);
  const etiquetasNuevas = otro.etiquetas.filter((e) => !queda.etiquetas.includes(e));
  return { queda, otro, mueve, completados: completados.map((c) => ({ campo: c, valor: String(otro[c] ?? "") })), etiquetasNuevas };
}

/** Mueve todo de `otroId` a `quedaId`, completa los datos vacíos y borra `otroId`. Lanza si algo falla (no deja nada a medias). */
export async function fusionarClientes(userId: string, quedaId: string, otroId: string) {
  if (quedaId === otroId) throw new Error("mismo cliente");
  return prisma.$transaction(async (tx) => {
    const [queda, otro] = await Promise.all([
      tx.client.findFirst({ where: { id: quedaId, userId } }),
      tx.client.findFirst({ where: { id: otroId, userId } }),
    ]);
    if (!queda || !otro) throw new Error("cliente no encontrado");
    if (otro.internal && !queda.internal) throw new Error("interna");

    const de = { clientId: otroId };
    const a = { clientId: quedaId };
    // Proyectos compartidos: el enlace que ya tenía el que queda se borra en vez de duplicarse.
    const [linksQueda, linksOtro, principalQueda] = await Promise.all([
      tx.projectClient.findMany({ where: a, select: { projectId: true } }),
      tx.projectClient.findMany({ where: de, select: { projectId: true } }),
      tx.contacto.count({ where: { ...a, principal: true } }),
    ]);
    const enlaces = enlacesProyecto(linksQueda.map((l) => l.projectId), linksOtro.map((l) => l.projectId));
    if (enlaces.borrar.length) await tx.projectClient.deleteMany({ where: { ...de, projectId: { in: enlaces.borrar } } });

    // Un viaje por tabla, todos dentro de la misma transacción.
    const movidos = await Promise.all([
      tx.projectClient.updateMany({ where: de, data: a }),
      tx.document.updateMany({ where: de, data: a }),
      tx.project.updateMany({ where: de, data: a }),
      tx.contract.updateMany({ where: de, data: a }),
      tx.meeting.updateMany({ where: de, data: a }),
      tx.lead.updateMany({ where: { convertedClientId: otroId }, data: { convertedClientId: quedaId } }),
      tx.clientUser.updateMany({ where: de, data: a }),
      tx.changeOrder.updateMany({ where: de, data: a }),
      tx.ticket.updateMany({ where: de, data: a }),
      tx.timeEntry.updateMany({ where: de, data: a }),
      tx.payment.updateMany({ where: de, data: a }),
      tx.approval.updateMany({ where: de, data: a }),
      tx.activityEvent.updateMany({ where: de, data: a }),
      tx.monitoredSystem.updateMany({ where: de, data: a }),
      tx.platform.updateMany({ where: de, data: a }),
      // Un solo contacto principal: si el que queda ya tiene, los del otro pasan como secundarios.
      tx.contacto.updateMany({ where: de, data: { ...a, ...(principalQueda ? { principal: false } : {}) } }),
      tx.interaccion.updateMany({ where: de, data: a }),
      tx.oportunidad.updateMany({ where: de, data: a }),
      tx.task.updateMany({ where: de, data: a }),
      tx.campanaEnvio.updateMany({ where: de, data: a }),
      tx.encuesta.updateMany({ where: de, data: a }),
      tx.archivoCliente.updateMany({ where: de, data: a }),
    ]);

    const { data, completados } = datosFusion(queda, otro);
    if (Object.keys(data).length) await tx.client.update({ where: { id: quedaId }, data: data as never });
    await tx.client.delete({ where: { id: otroId } });
    await tx.activityEvent.create({
      data: {
        userId, clientId: quedaId, entityType: "cliente", entityId: quedaId, kind: "clientes_fusionados",
        title: `Se fusionó «${otro.company || otro.name}» en este cliente`,
        detail: completados.length ? `Datos completados: ${completados.join(", ")}` : null,
        visibility: "interno", actorType: "pime",
      },
    });
    return { movidos: movidos.reduce((s, r) => s + r.count, 0), completados, nombreOtro: otro.company || otro.name };
  }, { timeout: 60_000, maxWait: 10_000 });
}

export { CAMPOS_COMPLETAR };
