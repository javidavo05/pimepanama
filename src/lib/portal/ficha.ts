/** Todo lo de un cliente para su ficha en /empresa, en una sola ida a la base (consultas en paralelo). */
import { prisma } from "@/lib/prisma";
import { avanceDeProyecto, faseActual } from "./avance";
import { ingresosDelCliente } from "./ingresos";
import { saldoCliente, pagadoEfectivo, faltaDeFases, faltaDePlan } from "./saldo";
import { TICKET_ABIERTOS } from "./estados";
import { reglasDe, tarifaDe } from "./horas";
import { fasesVigentes, FASE_COBRABLE, fasesDelClientePorCobrar, planesDelClientePorCobrar } from "./datos";

export async function fichaCliente(userId: string, clientId: string) {
  const cliente = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!cliente) return null;
  const [config, proyectos, tickets, facturas, cotizaciones, pagos, horas, personas, eventos, contratos, sistemas, fasesSinFactura, planes] = await Promise.all([
    prisma.companyConfig.findFirst({ where: { users: { some: { id: userId } } } }),
    prisma.project.findMany({
      where: { userId, OR: [{ clientId }, { clients: { some: { clientId } } }] },
      select: { id: true, name: true, kind: true, status: true, updatedAt: true, phases: { where: fasesVigentes, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true, progress: true, price: true, sortOrder: true } }, _count: { select: { changeOrders: { where: { status: "enviada" } } } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.ticket.findMany({ where: { userId, clientId }, orderBy: { updatedAt: "desc" }, take: 30, select: { id: true, number: true, title: true, status: true, kind: true, priority: true, updatedAt: true, lastClientActivityAt: true, lastPimeActivityAt: true } }),
    prisma.document.findMany({ where: { userId, clientId, type: "FACTURA" }, orderBy: { issueDate: "desc" }, select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true, projectId: true, paymentSchedules: { orderBy: { dueDate: "asc" }, select: { id: true, description: true, amount: true, dueDate: true, status: true } } } }),
    prisma.document.findMany({ where: { userId, clientId, type: "COTIZACION" }, orderBy: { issueDate: "desc" }, take: 10, select: { id: true, number: true, title: true, status: true, total: true, issueDate: true } }),
    prisma.payment.findMany({ where: { userId, clientId }, orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }], select: { id: true, documentId: true, phaseId: true, projectId: true, amount: true, paidAt: true, method: true, reference: true, status: true, receiptR2Key: true, note: true } }),
    prisma.timeEntry.findMany({ where: { userId, clientId, invoiceId: null }, orderBy: { workDate: "desc" }, select: { id: true, minutes: true, billedMinutes: true, amount: true, billable: true, workDate: true, note: true, ticket: { select: { number: true } } } }),
    prisma.clientUser.findMany({ where: { clientId, status: { not: "revocado" } }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, fullName: true, role: true, status: true, lastLoginAt: true, invitedAt: true } }),
    prisma.activityEvent.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 40, select: { id: true, title: true, detail: true, createdAt: true, visibility: true, actorType: true, kind: true } }),
    prisma.contract.findMany({ where: { userId, clientId }, select: { id: true, title: true, status: true, signingStatus: true, value: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.monitoredSystem.findMany({ where: { userId, clientId }, orderBy: [{ active: "desc" }, { name: "asc" }], select: { id: true, name: true, status: true, active: true, lastSeenAt: true, _count: { select: { incidents: { where: { resolvedAt: null } } } } } }),
    prisma.projectPhase.findMany({ where: fasesDelClientePorCobrar(clientId), select: { ...FASE_COBRABLE, projectId: true } }),
    planesDelClientePorCobrar(clientId),
  ]);
  const reglas = reglasDe(config);
  const facturasConSaldo = facturas.map((f) => {
    const pagado = pagadoEfectivo(f, pagos);
    return { ...f, pagado, falta: Math.max(0, Number(f.total ?? 0) - pagado) };
  });
  // Lo que se debe sin factura, por proyecto: fases iniciadas sin factura y el plan de pagos que todavía no se factura.
  const sueltos = pagos.filter((p) => !p.documentId && p.status === "confirmado");
  const nombreProyecto = new Map(proyectos.map((p) => [p.id, p.name]));
  const sinFactura = new Map<string, { projectId: string; proyecto: string; fases: number; plan: number }>();
  const sumar = (projectId: string, k: "fases" | "plan", monto: number) => {
    if (monto <= 0.005) return;
    const x = sinFactura.get(projectId) ?? { projectId, proyecto: nombreProyecto.get(projectId) ?? "Proyecto", fases: 0, plan: 0 };
    x[k] = Math.round((x[k] + monto) * 100) / 100;
    sinFactura.set(projectId, x);
  };
  for (const { fase, falta } of faltaDeFases(fasesSinFactura, sueltos)) sumar(fase.projectId, "fases", falta);
  for (const p of planes) sumar(p.id, "plan", faltaDePlan(p, sueltos.filter((x) => x.projectId === p.id)));
  // Por cobrar de cada proyecto: lo que falta de sus facturas más lo que se debe sin factura.
  const porCobrarPorProyecto = new Map<string, number>();
  for (const f of facturasConSaldo) if (f.projectId && f.status !== "DRAFT" && f.status !== "CANCELLED" && f.falta > 0.005) porCobrarPorProyecto.set(f.projectId, (porCobrarPorProyecto.get(f.projectId) ?? 0) + f.falta);
  for (const x of sinFactura.values()) porCobrarPorProyecto.set(x.projectId, (porCobrarPorProyecto.get(x.projectId) ?? 0) + x.fases + x.plan);
  return {
    cliente,
    reglas,
    sinFactura: [...sinFactura.values()],
    porCobrarPorProyecto,
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
    saldo: saldoCliente(facturas, pagos, fasesSinFactura, planes),
    ingresos: ingresosDelCliente(facturas, pagos),
  };
}
