/**
 * Lecturas de la cuenta del cliente. Todas reciben el clientId de la sesión (getPortalUser) y
 * filtran por él: nada de lo que hay aquí puede devolver datos de otro cliente.
 * Supabase tarda ~600 ms por consulta desde local, así que se agrupan con Promise.all.
 */
import { prisma } from "@/lib/prisma";
import { avanceDeProyecto, faseActual } from "./avance";
import { saldoCliente, FACTURA_CUENTA } from "./saldo";
import { TICKET_ABIERTOS } from "./estados";

/** Proyectos visibles para el cliente: los suyos por el vínculo nuevo o por el campo heredado. */
export const proyectosDelCliente = (clientId: string) => ({
  portalVisible: true,
  status: { not: "CANCELLED" as const },
  OR: [{ clientId }, { clients: { some: { clientId } } }],
});

export async function datosInicio(clientId: string) {
  const [proyectos, facturas, pagos, ordenes, tickets, eventos] = await Promise.all([
    prisma.project.findMany({
      where: proyectosDelCliente(clientId),
      select: { id: true, name: true, kind: true, status: true, updatedAt: true, phases: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true, progress: true, price: true, sortOrder: true, billingPoint: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.document.findMany({ where: { clientId, type: "FACTURA" }, select: { id: true, status: true, total: true, amountPaid: true, dueDate: true, number: true } }),
    prisma.payment.findMany({ where: { clientId }, select: { documentId: true, amount: true, status: true } }),
    prisma.changeOrder.findMany({ where: { clientId, status: "enviada" }, select: { id: true, number: true, title: true, total: true, sentAt: true } }),
    prisma.ticket.findMany({
      where: { clientId, status: { in: TICKET_ABIERTOS } },
      select: { id: true, number: true, title: true, status: true, estimateStatus: true, estimatedMinutes: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.activityEvent.findMany({ where: { clientId, visibility: "cliente" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, detail: true, createdAt: true, kind: true } }),
  ]);

  const proyectosConAvance = proyectos.map((p) => ({ ...p, avance: avanceDeProyecto(p.phases), actual: faseActual(p.phases) }));
  const activos = proyectosConAvance.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED");
  const saldo = saldoCliente(facturas, pagos);
  const proximo = facturas
    .filter((f) => FACTURA_CUENTA(f.status) && f.status !== "PAID" && f.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0] ?? null;

  const decisiones = [
    ...ordenes.map((o) => ({ tipo: "orden" as const, id: o.id, titulo: `Aprobar cambio: ${o.title}`, detalle: `${o.number} · ${dinero(o.total)}`, href: `/cliente/cambios/${o.id}` })),
    ...tickets.filter((t) => t.estimateStatus === "pendiente").map((t) => ({ tipo: "estimado" as const, id: t.id, titulo: `Aprobar estimado: ${t.title}`, detalle: t.number, href: `/cliente/tickets/${t.id}` })),
    ...tickets.filter((t) => t.status === "esperando_cliente" && t.estimateStatus !== "pendiente").map((t) => ({ tipo: "respuesta" as const, id: t.id, titulo: `Responder: ${t.title}`, detalle: t.number, href: `/cliente/tickets/${t.id}` })),
  ];

  return { proyectos: proyectosConAvance, activos, saldo, proximo, decisiones, tickets, eventos };
}

export async function proyectoDelCliente(clientId: string, id: string) {
  const p = await prisma.project.findFirst({
    where: { id, ...proyectosDelCliente(clientId) },
    select: {
      id: true, name: true, description: true, kind: true, status: true, startDate: true, endDate: true,
      phases: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, description: true, status: true, progress: true, price: true, sortOrder: true, billingPoint: true, startedAt: true, completedAt: true, estimatedDays: true, invoice: { select: { id: true, number: true, status: true } } } },
      changeOrders: { where: { clientId, status: { not: "borrador" } }, orderBy: { createdAt: "desc" }, select: { id: true, number: true, title: true, status: true, total: true, sentAt: true, decidedAt: true } },
    },
  });
  if (!p) return null;
  const eventos = await prisma.activityEvent.findMany({ where: { clientId, projectId: id, visibility: "cliente" }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, detail: true, createdAt: true, actorType: true } });
  return { ...p, avance: avanceDeProyecto(p.phases), actual: faseActual(p.phases), eventos };
}

export async function ticketsDelCliente(clientId: string) {
  return prisma.ticket.findMany({
    where: { clientId },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, number: true, title: true, kind: true, status: true, updatedAt: true, createdAt: true, project: { select: { name: true } }, _count: { select: { messages: { where: { internal: false } }, attachments: true } } },
  });
}

export async function ticketDelCliente(clientId: string, id: string) {
  return prisma.ticket.findFirst({
    where: { id, clientId },
    select: {
      id: true, number: true, title: true, kind: true, status: true, priority: true, createdAt: true, estimatedMinutes: true, estimateStatus: true, isWarranty: true,
      project: { select: { id: true, name: true } },
      messages: { where: { internal: false }, orderBy: { createdAt: "asc" }, select: { id: true, body: true, authorType: true, createdAt: true, clientUser: { select: { fullName: true, email: true } }, empresaUser: { select: { fullName: true } }, attachments: { select: { id: true, fileName: true, contentType: true } } } },
      timeEntries: { where: { billable: true }, select: { billedMinutes: true, amount: true, workDate: true } },
    },
  });
}

export async function facturasDelCliente(clientId: string) {
  const [facturas, pagos] = await Promise.all([
    prisma.document.findMany({
      where: { clientId, type: "FACTURA", status: { notIn: ["DRAFT", "CANCELLED"] } },
      orderBy: { issueDate: "desc" },
      select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true, currency: true },
    }),
    prisma.payment.findMany({ where: { clientId }, orderBy: { paidAt: "desc" }, select: { id: true, documentId: true, amount: true, paidAt: true, method: true, reference: true, status: true } }),
  ]);
  return { facturas, pagos, saldo: saldoCliente(facturas, pagos) };
}

export async function ordenDelCliente(clientId: string, id: string) {
  return prisma.changeOrder.findFirst({
    where: { id, clientId, status: { not: "borrador" } },
    select: {
      id: true, number: true, title: true, description: true, status: true, total: true, sentAt: true, decidedAt: true, decisionComment: true,
      project: { select: { id: true, name: true } },
      phases: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, description: true, price: true, billingPoint: true, estimatedDays: true } },
    },
  });
}

/** Cuentas de pago de Pime para transferir (las activas con datos de banco). */
export async function datosDeTransferencia(empresaUserId: string) {
  return prisma.paymentMethod.findMany({
    where: { userId: empresaUserId, isActive: true, accountNumber: { not: null } },
    select: { id: true, name: true, bankName: true, accountNumber: true, accountType: true, accountHolder: true },
  });
}

const fmt = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
export function dinero(v: unknown): string {
  const n = Number(v);
  return fmt.format(Number.isFinite(n) ? n : 0);
}
