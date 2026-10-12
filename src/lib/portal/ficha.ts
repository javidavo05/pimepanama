/** Todo lo de un cliente para su ficha en /empresa, en una sola ida a la base (consultas en paralelo). */
import { prisma } from "@/lib/prisma";
import { avanceDeProyecto, faseActual } from "./avance";
import { saldoCliente, pagadoEfectivo } from "./saldo";
import { TICKET_ABIERTOS } from "./estados";
import { reglasDe, tarifaDe } from "./horas";
import { fasesVigentes, FASE_COBRABLE, fasesDelClientePorCobrar } from "./datos";

export async function fichaCliente(userId: string, clientId: string) {
  const cliente = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!cliente) return null;
  const [config, proyectos, tickets, facturas, cotizaciones, pagos, horas, personas, eventos, contratos, sistemas, fasesSinFactura] = await Promise.all([
    prisma.companyConfig.findFirst({ where: { users: { some: { id: userId } } } }),
    prisma.project.findMany({
      where: { userId, OR: [{ clientId }, { clients: { some: { clientId } } }] },
      select: { id: true, name: true, kind: true, status: true, updatedAt: true, phases: { where: fasesVigentes, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true, progress: true, price: true, sortOrder: true } }, _count: { select: { changeOrders: { where: { status: "enviada" } } } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.ticket.findMany({ where: { userId, clientId }, orderBy: { updatedAt: "desc" }, take: 30, select: { id: true, number: true, title: true, status: true, kind: true, priority: true, updatedAt: true, lastClientActivityAt: true, lastPimeActivityAt: true } }),
    prisma.document.findMany({ where: { userId, clientId, type: "FACTURA" }, orderBy: { issueDate: "desc" }, select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true } }),
    prisma.document.findMany({ where: { userId, clientId, type: "COTIZACION" }, orderBy: { issueDate: "desc" }, take: 10, select: { id: true, number: true, title: true, status: true, total: true, issueDate: true } }),
    prisma.payment.findMany({ where: { userId, clientId }, orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }], select: { id: true, documentId: true, phaseId: true, amount: true, paidAt: true, method: true, reference: true, status: true, receiptR2Key: true, note: true } }),
    prisma.timeEntry.findMany({ where: { userId, clientId, invoiceId: null }, orderBy: { workDate: "desc" }, select: { id: true, minutes: true, billedMinutes: true, amount: true, billable: true, workDate: true, note: true, ticket: { select: { number: true } } } }),
    prisma.clientUser.findMany({ where: { clientId, status: { not: "revocado" } }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, fullName: true, role: true, status: true, lastLoginAt: true, invitedAt: true } }),
    prisma.activityEvent.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 40, select: { id: true, title: true, detail: true, createdAt: true, visibility: true, actorType: true, kind: true } }),
    prisma.contract.findMany({ where: { userId, clientId }, select: { id: true, title: true, status: true, signingStatus: true, value: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.monitoredSystem.findMany({ where: { userId, clientId }, orderBy: [{ active: "desc" }, { name: "asc" }], select: { id: true, name: true, status: true, active: true, lastSeenAt: true, _count: { select: { incidents: { where: { resolvedAt: null } } } } } }),
    prisma.projectPhase.findMany({ where: fasesDelClientePorCobrar(clientId), select: FASE_COBRABLE }),
  ]);
  const reglas = reglasDe(config);
  const facturasConSaldo = facturas.map((f) => {
    const pagado = pagadoEfectivo(f, pagos);
    return { ...f, pagado, falta: Math.max(0, Number(f.total ?? 0) - pagado) };
  });
  return {
    cliente,
    reglas,
    tarifa: tarifaDe(cliente, reglas),
    proyectos: proyectos.map((p) => ({ ...p, avance: avanceDeProyecto(p.phases), actual: faseActual(p.phases) })),
    tickets,
    abiertos: tickets.filter((t) => (TICKET_ABIERTOS as string[]).includes(t.status)),
    facturas: facturasConSaldo,
    cotizaciones,
    pagos,
    porConfirmar: pagos.filter((p) => p.status === "por_confirmar"),
    horas,
    horasPorFacturar: horas.filter((h) => h.billable && Number(h.amount) > 0),
    personas,
    eventos,
    contratos,
    sistemas,
    saldo: saldoCliente(facturas, pagos, fasesSinFactura),
  };
}
