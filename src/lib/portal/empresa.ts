/**
 * Operaciones del equipo Pime sobre Pime Clientes: responder tickets, estimar, registrar horas,
 * facturar horas, confirmar pagos, fases y órdenes de cambio. Todas reciben el EmpresaUser y filtran
 * por su userId. Cada cambio deja su evento en la línea de tiempo y avisa al cliente cuando le toca.
 */
import { prisma } from "@/lib/prisma";
import { calcularEntrada, enGarantia, reglasDe, requiereAprobacion, tarifaDe, formatoHoras } from "./horas";
import { registrarEvento } from "./eventos";
import { avisarAlClienteTicket } from "./avisos";
import { estadoPorPago, pagadoDeFactura } from "./saldo";
import { TICKET_ESTADOS, TICKET_ESTADO_LABEL, esUno, type TicketEstado } from "./estados";
import { dinero } from "./datos";

type Equipo = { id: string; fullName?: string | null; configId?: string | null; config?: { invoicePrefix?: string | null; quotePrefix?: string | null; taxRatePercent?: unknown; paymentTermsDays?: number | null } | null };

export { siguienteNumero } from "@/lib/numeracion";
import { siguienteNumero } from "@/lib/numeracion";

// ─── Tickets ──────────────────────────────────────────────────────────────────

export async function responderComoPime(u: Equipo, ticketId: string, cuerpo: string, opciones: { interno?: boolean; estado?: string; adjuntos?: { key: string; fileName: string; contentType: string; sizeBytes: number }[] } = {}) {
  const t = await prisma.ticket.findFirst({ where: { id: ticketId, userId: u.id }, select: { id: true, clientId: true, projectId: true, number: true, status: true } });
  if (!t) throw new Error("No encontré ese ticket.");
  const estado = opciones.estado && esUno(TICKET_ESTADOS, opciones.estado) ? (opciones.estado as TicketEstado) : null;
  const ahora = new Date();
  await prisma.ticket.update({
    where: { id: t.id },
    data: {
      ...(opciones.interno ? {} : { lastPimeActivityAt: ahora }),
      ...(estado ? { status: estado, resolvedAt: estado === "resuelto" ? ahora : undefined, closedAt: estado === "cerrado" ? ahora : undefined } : {}),
      ...(cuerpo.trim()
        ? { messages: { create: { authorType: "pime", empresaUserId: u.id, body: cuerpo.trim(), internal: !!opciones.interno, attachments: opciones.adjuntos?.length ? { create: opciones.adjuntos.map((a) => ({ ticketId: t.id, r2Key: a.key, fileName: a.fileName, contentType: a.contentType, sizeBytes: a.sizeBytes, uploadedByEmpresaUserId: u.id })) } : undefined } } }
        : {}),
    },
  });
  if (estado && estado !== t.status) {
    await registrarEvento({ userId: u.id, clientId: t.clientId, projectId: t.projectId, entityType: "ticket", entityId: t.id, kind: `ticket_${estado}`, title: `${t.number}: ${TICKET_ESTADO_LABEL[estado]}`, visibility: "cliente", actorType: "pime", actorEmpresaUserId: u.id });
  }
  if (!opciones.interno && (cuerpo.trim() || estado)) await avisarAlClienteTicket(t.id, cuerpo.trim() || null);
}

/** Estimado de horas. Si pasa del umbral (2 h), el ticket espera la aprobación del cliente. */
export async function fijarEstimado(u: Equipo, ticketId: string, minutos: number) {
  const t = await prisma.ticket.findFirst({ where: { id: ticketId, userId: u.id }, select: { id: true, number: true, clientId: true, projectId: true, client: { select: { brandLine: true, hourlyRate: true } } } });
  if (!t) throw new Error("No encontré ese ticket.");
  const config = u.configId ? await prisma.companyConfig.findUnique({ where: { id: u.configId } }) : null;
  const reglas = reglasDe(config);
  const pide = requiereAprobacion(minutos, reglas);
  const tarifa = tarifaDe(t.client, reglas);
  await prisma.ticket.update({
    where: { id: t.id },
    data: {
      estimatedMinutes: minutos, estimateStatus: pide ? "pendiente" : "no_requiere", status: pide ? "esperando_cliente" : "en_progreso", lastPimeActivityAt: new Date(),
      messages: { create: { authorType: "sistema", body: pide ? `Pime estimó ${formatoHoras(minutos)} (unos ${dinero((minutos / 60) * tarifa)}). Espera tu aprobación para empezar.` : `Pime estimó ${formatoHoras(minutos)} de trabajo.` } },
    },
  });
  await registrarEvento({ userId: u.id, clientId: t.clientId, projectId: t.projectId, entityType: "ticket", entityId: t.id, kind: "estimado", title: `Estimado de ${formatoHoras(minutos)} para ${t.number}`, detail: pide ? "Espera la aprobación del cliente" : null, visibility: "cliente", actorType: "pime", actorEmpresaUserId: u.id });
  await avisarAlClienteTicket(t.id, pide ? `Estimamos ${formatoHoras(minutos)} de trabajo. Apruébalo en tu cuenta para que empecemos.` : null);
  return { requiereAprobacion: pide };
}

/** Horas trabajadas en un ticket o proyecto. Calcula redondeo, tarifa y garantía. */
export async function registrarHoras(u: Equipo, input: { clientId: string; ticketId?: string | null; projectId?: string | null; minutos: number; nota?: string | null; fecha?: string | null; facturable?: boolean; garantia?: boolean }) {
  const cliente = await prisma.client.findFirst({ where: { id: input.clientId, userId: u.id }, select: { id: true, brandLine: true, hourlyRate: true } });
  if (!cliente) throw new Error("No encontré ese cliente.");
  if (!Number.isFinite(input.minutos) || input.minutos <= 0 || input.minutos > 24 * 60) throw new Error("Escribe un tiempo entre 1 minuto y 24 horas.");
  const config = u.configId ? await prisma.companyConfig.findUnique({ where: { id: u.configId } }) : null;
  const reglas = reglasDe(config);
  let garantia = !!input.garantia;
  let ticket: { id: string; isWarranty: boolean; projectId: string | null } | null = null;
  if (input.ticketId) {
    ticket = await prisma.ticket.findFirst({ where: { id: input.ticketId, userId: u.id, clientId: cliente.id }, select: { id: true, isWarranty: true, projectId: true } });
    if (!ticket) throw new Error("Ese ticket no es de este cliente.");
    garantia = garantia || ticket.isWarranty;
  }
  const tarifa = tarifaDe(cliente, reglas);
  const c = calcularEntrada(Math.round(input.minutos), tarifa, reglas, { facturable: input.facturable, garantia });
  const e = await prisma.timeEntry.create({
    data: {
      userId: u.id, clientId: cliente.id, ticketId: ticket?.id ?? null, projectId: input.projectId ?? ticket?.projectId ?? null, empresaUserId: u.id,
      workDate: input.fecha ? new Date(`${input.fecha}T12:00:00Z`) : new Date(), minutes: Math.round(input.minutos), billedMinutes: c.billedMinutes, rate: tarifa, amount: c.amount, billable: c.billable, note: input.nota?.slice(0, 500) || null,
    },
  });
  if (ticket) await prisma.ticket.update({ where: { id: ticket.id }, data: { lastPimeActivityAt: new Date() } });
  return e;
}

/** Marca el ticket como garantía si la entrega del proyecto está dentro del plazo. */
export async function sugerirGarantia(u: Equipo, ticketId: string): Promise<boolean> {
  const t = await prisma.ticket.findFirst({ where: { id: ticketId, userId: u.id }, select: { project: { select: { endDate: true, phases: { select: { completedAt: true } } } } } });
  const entrega = t?.project?.endDate ?? t?.project?.phases.map((f) => f.completedAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;
  const config = u.configId ? await prisma.companyConfig.findUnique({ where: { id: u.configId } }) : null;
  return enGarantia(entrega, new Date(), reglasDe(config));
}

/**
 * Factura en borrador con las horas sin facturar de un cliente hasta una fecha (por defecto, todas).
 * Una línea por ticket (o «Soporte general»). Queda en borrador para revisarla antes de enviarla.
 */
export async function facturarHoras(u: Equipo, clientId: string, hasta?: Date) {
  const cliente = await prisma.client.findFirst({ where: { id: clientId, userId: u.id } });
  if (!cliente) throw new Error("No encontré ese cliente.");
  const entradas = await prisma.timeEntry.findMany({
    where: { userId: u.id, clientId, invoiceId: null, billable: true, amount: { gt: 0 }, ...(hasta ? { workDate: { lte: hasta } } : {}) },
    include: { ticket: { select: { number: true, title: true } } },
    orderBy: { workDate: "asc" },
  });
  if (!entradas.length) throw new Error("Este cliente no tiene horas por facturar.");
  const grupos = new Map<string, { desc: string; minutos: number; tarifa: number }>();
  for (const e of entradas) {
    const k = `${e.ticketId ?? "general"}|${e.rate}`;
    const g = grupos.get(k) ?? { desc: e.ticket ? `Soporte ${e.ticket.number}: ${e.ticket.title}` : "Soporte general", minutos: 0, tarifa: Number(e.rate) };
    g.minutos += e.billedMinutes;
    grupos.set(k, g);
  }
  const impuesto = Number(u.config?.taxRatePercent ?? 0) || 0;
  const lineItems = [...grupos.values()].map((g) => ({ description: `${g.desc} (${formatoHoras(g.minutos)})`, quantity: Math.round((g.minutos / 60) * 100) / 100, unitPrice: g.tarifa, taxPercent: impuesto, discount: 0 }));
  const subtotal = Math.round(lineItems.reduce((a, l) => a + l.quantity * l.unitPrice, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * impuesto) / 100;
  const desde = entradas[0].workDate, fin = entradas[entradas.length - 1].workDate;
  // Si todas las horas son de un mismo proyecto, la factura queda en ese proyecto.
  const proyectos = [...new Set(entradas.map((e) => e.projectId).filter(Boolean))];
  const projectId = proyectos.length === 1 && entradas.every((e) => e.projectId) ? (proyectos[0] as string) : null;
  const mes = (d: Date) => d.toLocaleDateString("es-PA", { month: "long", year: "numeric", timeZone: "UTC" });

  const doc = await prisma.$transaction(async (tx) => {
    const number = await siguienteNumero(u.id, "FACTURA", u.config?.invoicePrefix ?? "FAC", tx);
    const d = await tx.document.create({
      data: {
        type: "FACTURA", status: "DRAFT", userId: u.id, companyId: u.configId ?? undefined, clientId, projectId, number,
        title: `Soporte ${mes(desde) === mes(fin) ? mes(desde) : `${mes(desde)} a ${mes(fin)}`}`,
        clientName: cliente.name, clientEmail: cliente.email, clientCompany: cliente.company, clientAddress: cliente.address, clientRuc: cliente.ruc,
        content: { currency: "USD", lineItems, notes: `Horas de soporte a ${dinero(lineItems[0]?.unitPrice ?? 0)} la hora, en bloques de 15 minutos.` },
        subtotal, taxAmount, total: subtotal + taxAmount, currency: "USD",
        issueDate: new Date(), dueDate: new Date(Date.now() + (u.config?.paymentTermsDays ?? 15) * 86_400_000),
      },
    });
    await tx.timeEntry.updateMany({ where: { id: { in: entradas.map((e) => e.id) } }, data: { invoiceId: d.id } });
    return d;
  });
  await registrarEvento({ userId: u.id, clientId, entityType: "factura", entityId: doc.id, kind: "factura_horas", title: `Factura de horas ${doc.number} en borrador`, detail: `${formatoHoras(entradas.reduce((a, e) => a + e.billedMinutes, 0))} · ${dinero(doc.total)}`, visibility: "interno", actorType: "pime", actorEmpresaUserId: u.id });
  return doc;
}

// ─── Pagos ────────────────────────────────────────────────────────────────────

/** Recalcula Document.amountPaid y su estado a partir de los pagos confirmados. */
export async function recalcularFactura(documentId: string) {
  const [doc, pagos] = await Promise.all([
    prisma.document.findUnique({ where: { id: documentId }, select: { id: true, total: true, status: true, amountPaid: true } }),
    prisma.payment.findMany({ where: { documentId }, select: { documentId: true, amount: true, status: true } }),
  ]);
  if (!doc) return;
  const pagado = Math.max(pagadoDeFactura(documentId, pagos), 0);
  const estado = estadoPorPago(doc.total, pagado);
  await prisma.document.update({ where: { id: doc.id }, data: { amountPaid: pagado, ...(estado ? { status: estado } : doc.status === "PAID" || doc.status === "PARTIALLY_PAID" ? { status: "SENT" } : {}) } });
}

/**
 * Pago registrado por Pime (confirmado). Todo pago queda con su factura emitida en la cuenta del cliente
 * (motor/pagos.ts): la que se indicó, la de su fase o proyecto, o una nueva por el monto. No se envía nada.
 * facturaCreada = true si la factura nació por este pago.
 */
export async function registrarPago(u: Equipo, input: { clientId: string; documentId?: string | null; projectId?: string | null; phaseId?: string | null; monto: number; fecha: string; metodo: string; referencia?: string | null; nota?: string | null; conItbms?: boolean }) {
  const cliente = await prisma.client.findFirst({ where: { id: input.clientId, userId: u.id }, select: { id: true } });
  if (!cliente) throw new Error("No encontré ese cliente.");
  let projectId = input.projectId || null;
  const phaseId = input.phaseId || null;
  if (phaseId) {
    const f = await prisma.projectPhase.findFirst({ where: { id: phaseId, project: { userId: u.id } }, select: { projectId: true } });
    if (!f) throw new Error("No encontré esa fase.");
    projectId = f.projectId;
  } else if (projectId && !(await prisma.project.findFirst({ where: { id: projectId, userId: u.id }, select: { id: true } }))) throw new Error("No encontré ese proyecto.");
  let documentId = input.documentId || null;
  let facturaCreada = false;
  if (documentId) {
    const f = await prisma.document.findFirst({ where: { id: documentId, userId: u.id, clientId: cliente.id, type: "FACTURA" }, select: { id: true, status: true } });
    if (!f) throw new Error("Esa factura no es de este cliente.");
    // Si llega un pago a una factura en borrador, se emite: queda en la cuenta del cliente.
    if (f.status === "DRAFT") await prisma.document.update({ where: { id: f.id }, data: { status: "SENT" } });
  } else {
    const { facturaParaPago } = await import("@/lib/motor/pagos");
    const f = await facturaParaPago(u, { clientId: cliente.id, projectId, phaseId, monto: input.monto, fecha: input.fecha, conItbms: input.conItbms });
    documentId = f.id; facturaCreada = f.creada;
  }
  // Si la factura tenía pagos viejos solo en amountPaid, se pasan primero a una fila para no perderlos.
  if (!facturaCreada) await migrarPagoViejo(u.id, documentId);
  const p = await prisma.payment.create({ data: { userId: u.id, clientId: cliente.id, documentId, projectId, phaseId, amount: input.monto, paidAt: new Date(`${input.fecha}T12:00:00Z`), method: input.metodo, reference: input.referencia || null, note: input.nota || null, status: "confirmado", recordedByEmpresaUserId: u.id, confirmedAt: new Date() } });
  await recalcularFactura(documentId);
  await registrarEvento({ userId: u.id, clientId: cliente.id, projectId, entityType: "pago", entityId: p.id, kind: "pago_confirmado", title: `Pago recibido: ${dinero(input.monto)}`, visibility: "cliente", actorType: "pime", actorEmpresaUserId: u.id });
  return { ...p, facturaCreada };
}

export async function decidirPagoReportado(u: Equipo, paymentId: string, confirmar: boolean, nota?: string | null) {
  const p = await prisma.payment.findFirst({ where: { id: paymentId, userId: u.id, status: "por_confirmar" } });
  if (!p) throw new Error("Ese pago ya no espera confirmación.");
  if (p.documentId) await migrarPagoViejo(u.id, p.documentId);
  // Confirmado sin factura: se le emite la suya (todo pago queda con factura en la cuenta del cliente).
  let documentId = p.documentId;
  if (confirmar && !documentId && p.clientId) {
    const { facturaParaPago } = await import("@/lib/motor/pagos");
    documentId = (await facturaParaPago(u, { clientId: p.clientId, projectId: p.projectId, phaseId: p.phaseId, monto: Number(p.amount), fecha: p.paidAt.toISOString().slice(0, 10) })).id;
  }
  await prisma.payment.update({ where: { id: p.id }, data: { status: confirmar ? "confirmado" : "rechazado", confirmedAt: confirmar ? new Date() : null, recordedByEmpresaUserId: u.id, note: nota || p.note, documentId } });
  if (documentId) await recalcularFactura(documentId);
  if (p.clientId) await registrarEvento({ userId: u.id, clientId: p.clientId, entityType: "pago", entityId: p.id, kind: confirmar ? "pago_confirmado" : "pago_rechazado", title: confirmar ? `Confirmamos tu pago de ${dinero(p.amount)}` : `No encontramos el pago de ${dinero(p.amount)}`, detail: confirmar ? null : nota || "Revisa la referencia y vuelve a reportarlo.", visibility: "cliente", actorType: "pime", actorEmpresaUserId: u.id });
}

/** Pagos anteriores al portal que solo viven en Document.amountPaid → una fila «migrada». Idempotente. */
export async function migrarPagoViejo(userId: string, documentId: string) {
  const [doc, filas] = await Promise.all([
    prisma.document.findUnique({ where: { id: documentId }, select: { amountPaid: true, clientId: true, updatedAt: true } }),
    prisma.payment.aggregate({ where: { documentId, status: "confirmado" }, _sum: { amount: true } }),
  ]);
  const viejo = Number(doc?.amountPaid ?? 0) - Number(filas._sum.amount ?? 0);
  if (!doc || viejo <= 0.005) return;
  await prisma.payment.create({ data: { userId, clientId: doc.clientId, documentId, amount: Math.round(viejo * 100) / 100, paidAt: doc.updatedAt, method: "otro", status: "confirmado", note: "Pago registrado antes del portal", confirmedAt: new Date() } });
}

// ─── Fases y órdenes de cambio ───────────────────────────────────────────────

export async function proyectoDelEquipo(u: Equipo, projectId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId: u.id }, select: { id: true, name: true, clientId: true, clients: { select: { clientId: true } } } });
}

export function clientePrincipal(p: { clientId: string | null; clients: { clientId: string }[] }): string | null {
  return p.clientId ?? p.clients[0]?.clientId ?? null;
}

export async function avanceDeFaseEvento(u: Equipo, faseId: string, cambios: { status?: string; progress?: number }) {
  const f = await prisma.projectPhase.findFirst({ where: { id: faseId, project: { userId: u.id } }, select: { id: true, name: true, status: true, progress: true, startedAt: true, project: { select: { id: true, clientId: true, clients: { select: { clientId: true } } } } } });
  if (!f) throw new Error("No encontré esa fase.");
  const status = cambios.status ?? f.status;
  const progress = status === "hecha" ? 100 : Math.max(0, Math.min(100, cambios.progress ?? Number(f.progress)));
  await prisma.projectPhase.update({ where: { id: f.id }, data: { status, progress, startedAt: f.startedAt ?? (status !== "pendiente" ? new Date() : null), completedAt: status === "hecha" ? new Date() : null } });
  const clientId = clientePrincipal(f.project);
  if (clientId && (status !== f.status || Math.abs(progress - Number(f.progress)) >= 5)) {
    await registrarEvento({ userId: u.id, clientId, projectId: f.project.id, entityType: "fase", entityId: f.id, kind: status === "hecha" ? "fase_hecha" : "avance", title: status === "hecha" ? `Terminamos la fase ${f.name}` : status === "en_revision" ? `La fase ${f.name} está lista para tu revisión` : `${f.name} al ${Math.round(progress)} %`, visibility: "cliente", actorType: "pime", actorEmpresaUserId: u.id });
  }
}
