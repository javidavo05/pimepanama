/**
 * Lecturas de la cuenta del cliente. Todas reciben el clientId de la sesión (getPortalUser) y
 * filtran por él: nada de lo que hay aquí puede devolver datos de otro cliente.
 * Supabase tarda ~600 ms por consulta desde local, así que se agrupan con Promise.all.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { avanceDeProyecto, faseActual } from "./avance";
import { saldoCliente, facturasEmitidas, pagosDelPlan, FACTURA_CUENTA, FASE_INICIADA } from "./saldo";
import { TICKET_ABIERTOS } from "./estados";

/** Fases que cuentan: las del proyecto y las de órdenes de cambio ya aprobadas. */
export const fasesVigentes = { OR: [{ changeOrderId: null }, { changeOrder: { status: "aprobada" } }] };

/** Lo de una fase que hace falta para saber si se debe sin factura (saldo.ts → fasesCobrables). */
export const FASE_COBRABLE = { id: true, status: true, price: true, billingPoint: true, invoiceId: true, invoice: { select: { status: true } } } as const;

/** Fases que pueden deberse: vigentes, ya iniciadas, de proyectos no cancelados cuyo cliente principal es este. */
export const fasesDelClientePorCobrar = (clientId: string) => ({
  AND: [fasesVigentes, { status: { in: [...FASE_INICIADA] } }, { project: { status: { not: "CANCELLED" as const }, clientId } }],
});

/**
 * Lo de un proyecto que hace falta para saber cuánto de su plan de pagos se debe sin factura (saldo.ts →
 * planSinFacturar): el plan, sus facturas y si tiene alguna fase con precio que se cobra.
 */
export const PLAN_COBRABLE = Prisma.validator<Prisma.ProjectSelect>()({
  financingPlan: true,
  documents: { where: { type: "FACTURA" }, select: { status: true, total: true, amountPaid: true } },
  _count: { select: { phases: { where: { AND: [fasesVigentes, { price: { gt: 0 } }, { billingPoint: { not: "sin_cobro" } }] } } } },
});

/** Proyectos no cancelados cuyo cliente principal es este, con lo de su plan de pagos (como fasesDelClientePorCobrar). */
export const planesDelClientePorCobrar = (clientId: string) =>
  prisma.project.findMany({
    where: { clientId, status: { not: "CANCELLED" } },
    select: { ...PLAN_COBRABLE, id: true, name: true, status: true, payments: { where: { status: "confirmado", documentId: null }, select: { amount: true } } },
  });

/**
 * Los planes de pago que el cliente ve pago por pago (50 % al firmar, 50 % a la entrega…): los de proyectos que se
 * cobran por su plan y no por fases, como en saldoCliente. Lo pagado al proyecto son sus pagos sin factura más lo
 * pagado de sus facturas.
 */
export function planesParaElCliente(planes: Awaited<ReturnType<typeof planesDelClientePorCobrar>>) {
  return planes.flatMap((p) => {
    if (p._count.phases > 0) return [];
    const sueltos = p.payments.reduce((a, x) => a + Number(x.amount), 0);
    const facturado = p.documents.filter((d) => FACTURA_CUENTA(d.status)).reduce((a, d) => a + (d.status === "PAID" ? Number(d.total) : Number(d.amountPaid ?? 0)), 0);
    const plan = pagosDelPlan(p.financingPlan, sueltos + facturado, { proyecto: p.name, entregado: p.status === "COMPLETED" });
    return plan ? [plan] : [];
  });
}

/** Proyectos del equipo (sin clientes internos) con su plan de pagos y los pagos sin factura del proyecto: Hoy y Cuentas por cobrar. */
export const planesDelEquipoPorCobrar = (userId: string) =>
  prisma.project.findMany({
    where: { userId, status: { not: "CANCELLED" }, NOT: { client: { is: { internal: true } } } },
    select: { ...PLAN_COBRABLE, id: true, name: true, client: { select: { name: true, company: true } }, payments: { where: { status: "confirmado", documentId: null }, select: { documentId: true, amount: true, status: true } } },
  });

/** Proyectos visibles para el cliente: los suyos por el vínculo nuevo o por el campo heredado. */
export const proyectosDelCliente = (clientId: string) => ({
  portalVisible: true,
  status: { not: "CANCELLED" as const },
  OR: [{ clientId }, { clients: { some: { clientId } } }],
});

export async function datosInicio(clientId: string) {
  const [proyectos, facturasDoc, pagos, ordenes, tickets, eventos, fasesSinFactura, cuotas, planes] = await Promise.all([
    prisma.project.findMany({
      where: proyectosDelCliente(clientId),
      select: { id: true, name: true, kind: true, status: true, updatedAt: true, phases: { where: fasesVigentes, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true, progress: true, price: true, sortOrder: true, billingPoint: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.document.findMany({ where: { clientId, type: "FACTURA" }, select: { id: true, status: true, total: true, amountPaid: true, dueDate: true, number: true } }),
    prisma.payment.findMany({ where: { clientId }, select: { documentId: true, phaseId: true, amount: true, status: true } }),
    prisma.changeOrder.findMany({ where: { clientId, status: "enviada" }, select: { id: true, number: true, title: true, total: true, sentAt: true } }),
    prisma.ticket.findMany({
      where: { clientId, status: { in: TICKET_ABIERTOS } },
      select: { id: true, number: true, title: true, status: true, estimateStatus: true, estimatedMinutes: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.activityEvent.findMany({ where: { clientId, visibility: "cliente" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, detail: true, createdAt: true, kind: true } }),
    prisma.projectPhase.findMany({ where: fasesDelClientePorCobrar(clientId), select: FASE_COBRABLE }),
    cuotasDelCliente(clientId),
    planesDelClientePorCobrar(clientId),
  ]);
  // El cliente ve lo emitido de cada factura, no el total del contrato.
  const facturas = facturasEmitidas(facturasDoc, pagos, cuotas);

  const proyectosConAvance = proyectos.map((p) => ({ ...p, avance: avanceDeProyecto(p.phases), actual: faseActual(p.phases) }));
  const activos = proyectosConAvance.filter((p) => p.status === "ACTIVE" || p.status === "PAUSED");
  const saldo = saldoCliente(facturas, pagos, fasesSinFactura, planes);
  const proximo = facturas
    .filter((f) => FACTURA_CUENTA(f.status) && f.status !== "PAID" && f.dueDate && f.total - Number(f.amountPaid ?? 0) > 0.005)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0] ?? null;

  const decisiones = [
    ...activos.flatMap((p) => p.phases.filter((f) => f.status === "en_revision").map((f) => ({ tipo: "fase" as const, id: f.id, titulo: `Revisar la fase lista: ${f.name}`, detalle: `${p.name}${Number(f.price) > 0 && f.billingPoint === "al_entregar" ? ` · se paga al entregar, ${dinero(f.price)}` : ""}`, href: `/cliente/proyectos/${p.id}` }))),
    ...ordenes.map((o) => ({ tipo: "orden" as const, id: o.id, titulo: `Aprobar cambio: ${o.title}`, detalle: `${o.number} · ${dinero(o.total)}`, href: `/cliente/cambios/${o.id}` })),
    ...tickets.filter((t) => t.estimateStatus === "pendiente").map((t) => ({ tipo: "estimado" as const, id: t.id, titulo: `Aprobar estimado: ${t.title}`, detalle: t.number, href: `/cliente/tickets/${t.id}` })),
    ...tickets.filter((t) => t.status === "esperando_cliente" && t.estimateStatus !== "pendiente").map((t) => ({ tipo: "respuesta" as const, id: t.id, titulo: `Responder: ${t.title}`, detalle: t.number, href: `/cliente/tickets/${t.id}` })),
  ];

  return { proyectos: proyectosConAvance, activos, saldo, planes: planesParaElCliente(planes), proximo, decisiones, tickets, eventos };
}

export async function proyectoDelCliente(clientId: string, id: string) {
  const p = await prisma.project.findFirst({
    where: { id, ...proyectosDelCliente(clientId) },
    select: {
      id: true, name: true, description: true, kind: true, status: true, startDate: true, endDate: true, liveUrl: true,
      accesses: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, url: true, username: true, notes: true, secretEnc: true } },
      phases: { where: fasesVigentes, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, description: true, status: true, progress: true, price: true, sortOrder: true, billingPoint: true, startedAt: true, completedAt: true, estimatedDays: true, invoice: { select: { id: true, number: true, status: true } } } },
      changeOrders: { where: { clientId, status: { not: "borrador" } }, orderBy: { createdAt: "desc" }, select: { id: true, number: true, title: true, status: true, total: true, sentAt: true, decidedAt: true } },
    },
  });
  if (!p) return null;
  const eventos = await prisma.activityEvent.findMany({ where: { clientId, projectId: id, visibility: "cliente" }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, detail: true, createdAt: true, actorType: true } });
  // La clave cifrada nunca sale del servidor: solo si existe; se descifra a pedido (verClaveAction).
  const accesos = p.accesses.map(({ secretEnc, ...a }) => ({ ...a, conClave: !!secretEnc }));
  return { ...p, accesses: undefined, accesos, avance: avanceDeProyecto(p.phases), actual: faseActual(p.phases), eventos };
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

/** Cuotas de los planes de pago de las facturas del cliente: definen qué parte de cada factura ya se emitió. */
function cuotasDelCliente(clientId: string) {
  return prisma.paymentSchedule.findMany({ where: { document: { clientId, type: "FACTURA" } }, select: { documentId: true, amount: true, dueDate: true, status: true } });
}

export async function facturasDelCliente(clientId: string) {
  const [facturasDoc, pagos, fases, cuotas, planes] = await Promise.all([
    prisma.document.findMany({
      where: { clientId, type: "FACTURA", status: { notIn: ["DRAFT", "CANCELLED"] } },
      orderBy: { issueDate: "desc" },
      select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true, currency: true },
    }),
    prisma.payment.findMany({ where: { clientId }, orderBy: { paidAt: "desc" }, select: { id: true, documentId: true, phaseId: true, amount: true, paidAt: true, method: true, reference: true, status: true } }),
    prisma.projectPhase.findMany({ where: fasesDelClientePorCobrar(clientId), select: FASE_COBRABLE }),
    cuotasDelCliente(clientId),
    planesDelClientePorCobrar(clientId),
  ]);
  const facturas = facturasEmitidas(facturasDoc, pagos, cuotas);
  return { facturas, pagos, saldo: saldoCliente(facturas, pagos, fases, planes), planes: planesParaElCliente(planes) };
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

import { dinero } from "./dinero";
export { dinero };

// ─── Documentos: propuestas, contratos, reuniones y archivos (fase 8 del CRM) ────────────────

/** Cotizaciones que Pime ya envió a este cliente (reglas en documentos.ts → PROPUESTA_VISIBLE). */
export async function propuestasDelCliente(clientId: string) {
  return prisma.document.findMany({
    where: { clientId, type: "COTIZACION", status: { in: ["SENT", "ACCEPTED"] } },
    orderBy: [{ issueDate: "desc" }],
    select: { id: true, number: true, title: true, status: true, total: true, currency: true, issueDate: true, validUntil: true, sentAt: true, aceptadaAt: true, aceptadaPor: true, project: { select: { name: true } } },
  });
}

export async function propuestaDelCliente(clientId: string, id: string) {
  return prisma.document.findFirst({
    where: { id, clientId, type: "COTIZACION", status: { in: ["SENT", "ACCEPTED"] } },
    select: { id: true, number: true, title: true, status: true, total: true, subtotal: true, taxAmount: true, currency: true, issueDate: true, validUntil: true, aceptadaAt: true, aceptadaPor: true, content: true, projectId: true, project: { select: { name: true } } },
  });
}

/** Contratos del cliente con su proceso de firma. El filtro de borradores internos va en documentos.ts → contratoVisible. */
export async function contratosDelCliente(clientId: string) {
  return prisma.contract.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, description: true, status: true, signingStatus: true, signedAt: true, signingCompletedAt: true, startsAt: true, endsAt: true, value: true, createdAt: true,
      project: { select: { name: true } },
      signingRequest: { select: { status: true, clientEmail: true, expiresAt: true, signedPdfR2Key: true, basePdfR2Key: true } },
    },
  });
}

/** Reuniones que Pime compartió con el cliente. Nunca se leen la minuta técnica, el prompt ni la transcripción. */
export async function reunionesCompartidas(clientId: string) {
  return prisma.meeting.findMany({
    where: { clientId, compartidaCliente: true },
    orderBy: { meetingDate: "desc" },
    select: { id: true, title: true, meetingDate: true, durationMs: true, executiveMinutes: true, project: { select: { name: true } } },
  });
}

export async function reunionCompartida(clientId: string, id: string) {
  return prisma.meeting.findFirst({
    where: { id, clientId, compartidaCliente: true },
    select: { id: true, title: true, meetingDate: true, durationMs: true, executiveMinutes: true, project: { select: { id: true, name: true } } },
  });
}

/** Archivos compartidos visibles para el cliente. */
export async function archivosDelCliente(clientId: string) {
  return prisma.archivoCliente.findMany({
    where: { clientId, visibleCliente: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, nombre: true, tipo: true, tamano: true, subidoPor: true, createdAt: true, project: { select: { name: true } } },
  });
}

/** Lo que espera a la persona en Documentos: propuestas por responder y contratos por firmar. Para Inicio y el resumen. */
export async function pendientesDeDocumentos(clientId: string) {
  const [propuestas, contratos, reuniones, archivos] = await Promise.all([
    prisma.document.findMany({ where: { clientId, type: "COTIZACION", status: "SENT" }, select: { id: true, number: true, title: true, total: true, validUntil: true } }),
    prisma.contract.findMany({ where: { clientId, signingStatus: "PENDING_CLIENT" }, select: { id: true, title: true, status: true, signingStatus: true, signingRequest: { select: { clientEmail: true } } } }),
    prisma.meeting.count({ where: { clientId, compartidaCliente: true } }),
    prisma.archivoCliente.count({ where: { clientId, visibleCliente: true } }),
  ]);
  return { propuestas, contratos, reuniones, archivos };
}

/**
 * La persona del cliente en una ruta de API (descargas y subidas), sin redirigir: devuelve null si no hay
 * sesión activa de cliente. Las páginas usan getPortalUser.
 * En la vista de revisión del equipo devuelve la persona de ese cliente con `vista: true`: las descargas
 * funcionan (para revisar los PDF que verá el cliente) y las subidas o firmas deben rechazarla.
 */
export async function personaDeApi() {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const uid = claims?.sub;
  if (!uid) return null;
  const sel = { id: true, clientId: true, status: true, role: true, email: true, fullName: true, userId: true, client: { select: { archivedAt: true, logoKey: true } } } as const;
  const persona = await prisma.clientUser.findUnique({ where: { supabaseUid: uid }, select: sel });
  if (persona) {
    if (persona.status !== "activo" || persona.client.archivedAt) return null;
    return { ...persona, vista: false };
  }
  const { vistaDelEquipo } = await import("./vista");
  const v = await vistaDelEquipo(claims as Parameters<typeof vistaDelEquipo>[0]);
  if (!v) return null;
  const client = await prisma.client.findUnique({ where: { id: v.clientId }, select: { archivedAt: true, logoKey: true, userId: true, email: true, name: true } });
  if (!client) return null;
  return { id: `revision-${v.clientId}`, clientId: v.clientId, status: "activo", role: "principal", email: client.email ?? "", fullName: client.name, userId: client.userId, client: { archivedAt: client.archivedAt, logoKey: client.logoKey }, vista: true };
}

/** Encuestas de satisfacción que el cliente todavía no respondió, con su enlace firmado. */
export async function encuestasPendientes(clientId: string) {
  const { tokenDeEncuesta } = await import("@/lib/crm/encuesta-token");
  const xs = await prisma.encuesta.findMany({
    where: { clientId, respondidaAt: null },
    orderBy: { enviadaAt: "desc" },
    take: 3,
    select: { id: true, project: { select: { name: true } } },
  });
  return xs.flatMap((x) => {
    try { return [{ id: x.id, proyecto: x.project.name, href: `/encuesta/${tokenDeEncuesta(x.id)}` }]; } catch { return []; }
  });
}
