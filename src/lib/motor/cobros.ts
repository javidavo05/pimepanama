/**
 * Cobrar, en un solo motor. Todo lo que se le puede facturar a un cliente sale de aquí, y toda factura
 * que se crea desde aquí nace con su cliente y su proyecto:
 *   - una fase del proyecto que todavía no tiene factura,
 *   - el proyecto completo con su plan de cuotas (abono + cuotas),
 *   - las horas de soporte sin facturar,
 *   - un monto libre (concepto y monto), con o sin proyecto.
 */
import { prisma } from "@/lib/prisma";
import { siguienteNumero } from "@/lib/numeracion";
import { buildInstallmentPlan, isFinancingPlan, type FinancingPlan } from "@/lib/financing";
import { facturarHoras } from "@/lib/portal/empresa";
import { registrarEvento } from "@/lib/portal/eventos";
import { pagadoEfectivo, faltaDeFases } from "@/lib/portal/saldo";
import { fasesVigentes, FASE_COBRABLE } from "@/lib/portal/datos";
import { unirClienteAProyecto } from "./enlaces";

export type Equipo = { id: string; configId?: string | null; config?: { invoicePrefix?: string | null; taxRatePercent?: unknown; paymentTermsDays?: number | null } | null };

const r2 = (n: number) => Math.round(n * 100) / 100;
const ESTADOS_FACTURADOS = { notIn: ["CANCELLED", "DRAFT"] as ("CANCELLED" | "DRAFT")[] };

/**
 * Dinero de un proyecto: presupuesto, facturado, cobrado y por cobrar, con sus facturas. Por cobrar suma lo
 * que falta de las facturas emitidas y de las fases ya iniciadas que no tienen factura (se deben igual).
 */
export async function dineroDeProyecto(userId: string, projectId: string) {
  const [p, facturas, pagos, sueltos] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, userId }, select: { totalBudget: true, financingPlan: true, phases: { where: fasesVigentes, select: FASE_COBRABLE } } }),
    prisma.document.findMany({ where: { userId, projectId, type: "FACTURA", status: { not: "CANCELLED" } }, orderBy: { issueDate: "desc" }, select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true } }),
    prisma.payment.findMany({ where: { userId, document: { projectId } }, select: { documentId: true, amount: true, status: true } }),
    // Pagos del proyecto o de sus fases que no tienen factura.
    prisma.payment.findMany({ where: { userId, documentId: null, status: "confirmado", OR: [{ projectId }, { phase: { projectId } }] }, select: { documentId: true, phaseId: true, amount: true, status: true } }),
  ]);
  if (!p) return null;
  const fases = p.phases.reduce((a, f) => a + Number(f.price), 0);
  const plan = isFinancingPlan(p.financingPlan) ? (p.financingPlan as FinancingPlan) : null;
  const presupuesto = Number(p.totalBudget ?? 0) || fases || plan?.total || 0;
  const filas = facturas.map((f) => {
    const pagado = pagadoEfectivo(f, pagos);
    return { ...f, total: Number(f.total ?? 0), pagado, falta: Math.max(0, r2(Number(f.total ?? 0) - pagado)) };
  });
  const emitidas = filas.filter((f) => f.status !== "DRAFT");
  const facturado = r2(emitidas.reduce((a, f) => a + f.total, 0));
  const sinFactura = r2(sueltos.reduce((a, x) => a + Number(x.amount), 0));
  const cobrado = r2(filas.reduce((a, f) => a + f.pagado, 0) + sinFactura);
  // Lo que falta de las fases iniciadas sin factura, menos los pagos del proyecto que no son de una fase.
  const deFases = faltaDeFases(p.phases, sueltos).reduce((a, x) => a + x.falta, 0);
  const delProyecto = sueltos.filter((x) => !x.phaseId).reduce((a, x) => a + Number(x.amount), 0);
  return {
    presupuesto: r2(presupuesto),
    facturado,
    cobrado,
    porCobrar: r2(emitidas.reduce((a, f) => a + f.falta, 0) + Math.max(0, deFases - delProyecto)),
    sinFacturar: r2(Math.max(0, presupuesto - facturado - filas.filter((f) => f.status === "DRAFT").reduce((a, f) => a + f.total, 0))),
    borradores: filas.filter((f) => f.status === "DRAFT").length,
    facturas: filas,
  };
}

/** Qué se le puede cobrar hoy a un cliente. */
export async function opcionesDeCobro(userId: string, clientId: string) {
  const [proyectos, horas] = await Promise.all([
    prisma.project.findMany({
      where: { userId, status: { not: "CANCELLED" }, OR: [{ clientId }, { clients: { some: { clientId } } }] },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true, name: true, status: true, financingPlan: true,
        phases: { where: { ...fasesVigentes, invoiceId: null, price: { gt: 0 } }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, price: true, status: true } },
        documents: { where: { type: "FACTURA", status: ESTADOS_FACTURADOS }, select: { id: true, paymentSchedules: { select: { id: true }, take: 1 } } },
      },
    }),
    prisma.timeEntry.aggregate({ where: { userId, clientId, invoiceId: null, billable: true, amount: { gt: 0 } }, _sum: { amount: true, billedMinutes: true } }),
  ]);
  return {
    proyectos: proyectos.map((p) => {
      const plan = isFinancingPlan(p.financingPlan) ? (p.financingPlan as FinancingPlan) : null;
      const planFacturado = p.documents.some((d) => d.paymentSchedules.length > 0);
      return {
        id: p.id, name: p.name, status: p.status,
        fases: p.phases.map((f) => ({ id: f.id, name: f.name, price: Number(f.price), status: f.status })),
        plan: plan && !planFacturado ? { total: plan.total, abono: plan.downPayment, cuotas: plan.installments, frecuencia: plan.frequency } : null,
      };
    }),
    horas: { monto: r2(Number(horas._sum.amount ?? 0)), minutos: horas._sum.billedMinutes ?? 0 },
  };
}

/**
 * Emitida: la factura nace emitida (no en borrador) y queda en la cuenta del cliente para descargar, sin
 * enviarle nada. fecha = fecha de emisión (la del pago). origenPago marca las que se crearon por un pago,
 * para poder borrarlas si ese pago se deshace.
 */
export type Emision = { fecha?: string | null; origenPago?: boolean };

export type Cobro =
  | { tipo: "fase"; faseId: string; sinImpuesto?: boolean; emitida?: Emision }
  | { tipo: "plan"; projectId: string }
  | { tipo: "horas"; clientId: string }
  | { tipo: "monto"; clientId: string; projectId?: string | null; concepto: string; monto: number; sinImpuesto?: boolean; emitida?: Emision };

async function crearFactura(u: Equipo, p: { clientId: string; projectId?: string | null; titulo: string; lineas: { description: string; unitPrice: number }[]; cuotas?: { description: string; amount: number; dueDate: Date }[]; sinImpuesto?: boolean; emitida?: Emision }) {
  const c = await prisma.client.findFirstOrThrow({ where: { id: p.clientId, userId: u.id } });
  // Un plan de pagos es un monto cerrado: sus cuotas suman el total, no se le agrega impuesto encima.
  const impuesto = p.sinImpuesto ? 0 : Number(u.config?.taxRatePercent ?? 0) || 0;
  const subtotal = r2(p.lineas.reduce((a, l) => a + l.unitPrice, 0));
  const taxAmount = r2((subtotal * impuesto) / 100);
  // Emitida con la fecha del pago; el saldo que quede vence desde hoy, no desde esa fecha (si no, nacería vencida).
  const emision = p.emitida?.fecha && /^\d{4}-\d{2}-\d{2}$/.test(p.emitida.fecha) ? new Date(`${p.emitida.fecha}T12:00:00Z`) : new Date();
  const doc = await prisma.$transaction(async (tx) => {
    const number = await siguienteNumero(u.id, "FACTURA", u.config?.invoicePrefix ?? "FAC", tx);
    const d = await tx.document.create({
      data: {
        type: "FACTURA", status: p.emitida ? "SENT" : "DRAFT", userId: u.id, companyId: u.configId ?? undefined, clientId: c.id, projectId: p.projectId ?? null, number, title: p.titulo,
        clientName: c.name, clientEmail: c.email, clientCompany: c.company, clientAddress: c.address, clientRuc: c.ruc,
        content: { currency: "USD", lineItems: p.lineas.map((l) => ({ description: l.description, quantity: 1, unitPrice: l.unitPrice, taxPercent: impuesto, discount: 0 })), ...(p.emitida?.origenPago ? { origenPago: true } : {}) },
        subtotal, taxAmount, total: r2(subtotal + taxAmount), currency: "USD",
        issueDate: emision, dueDate: p.cuotas?.length ? p.cuotas[p.cuotas.length - 1].dueDate : new Date(Math.max(emision.getTime(), Date.now()) + (u.config?.paymentTermsDays ?? 15) * 86_400_000),
      },
    });
    if (p.cuotas?.length) await tx.paymentSchedule.createMany({ data: p.cuotas.map((q) => ({ userId: u.id, documentId: d.id, description: q.description, amount: q.amount, dueDate: q.dueDate })) });
    return d;
  });
  if (p.projectId) await unirClienteAProyecto(u.id, p.projectId, c.id);
  return doc;
}

/** Crea la factura (en borrador) y devuelve su id. Lanza Error con un mensaje para la persona. */
export async function crearCobro(u: Equipo, cobro: Cobro): Promise<{ id: string; number: string | null }> {
  if (cobro.tipo === "horas") {
    const d = await facturarHoras(u, cobro.clientId);
    return { id: d.id, number: d.number };
  }
  if (cobro.tipo === "fase") {
    const f = await prisma.projectPhase.findFirst({ where: { id: cobro.faseId, project: { userId: u.id } }, include: { project: { select: { id: true, name: true, clientId: true, clients: { select: { clientId: true }, take: 1 } } } } });
    if (!f) throw new Error("No encontré esa fase.");
    if (f.invoiceId) throw new Error("Esta fase ya tiene factura.");
    const clientId = f.project.clientId ?? f.project.clients[0]?.clientId;
    if (!clientId) throw new Error("El proyecto no tiene cliente.");
    const d = await crearFactura(u, { clientId, projectId: f.projectId, titulo: `${f.project.name} · ${f.name}`, lineas: [{ description: `${f.project.name}: fase ${f.name}`, unitPrice: Number(f.price) }], sinImpuesto: cobro.sinImpuesto, emitida: cobro.emitida });
    await prisma.projectPhase.update({ where: { id: f.id }, data: { invoiceId: d.id } });
    await registrarEvento({ userId: u.id, clientId, projectId: f.projectId, entityType: "factura", entityId: d.id, kind: "factura_fase", title: `Factura ${d.number} de la fase ${f.name} ${cobro.emitida ? "emitida" : "en borrador"}`, visibility: "interno" });
    return { id: d.id, number: d.number };
  }
  if (cobro.tipo === "plan") {
    const p = await prisma.project.findFirst({ where: { id: cobro.projectId, userId: u.id }, select: { id: true, name: true, financingPlan: true, clientId: true, clients: { select: { clientId: true }, take: 1 } } });
    if (!p || !isFinancingPlan(p.financingPlan)) throw new Error("Ese proyecto no tiene plan de cuotas.");
    const clientId = p.clientId ?? p.clients[0]?.clientId;
    if (!clientId) throw new Error("El proyecto no tiene cliente.");
    const plan = buildInstallmentPlan(p.financingPlan as FinancingPlan);
    const cuotas = [
      ...(plan.downPayment > 0 ? [{ description: "Abono inicial", amount: plan.downPayment, dueDate: new Date() }] : []),
      ...plan.rows.map((r) => ({ description: r.description, amount: r.amount, dueDate: new Date(`${r.dueDate}T12:00:00Z`) })),
    ];
    const d = await crearFactura(u, { clientId, projectId: p.id, titulo: p.name, lineas: [{ description: p.name, unitPrice: (p.financingPlan as FinancingPlan).total }], cuotas, sinImpuesto: true });
    await registrarEvento({ userId: u.id, clientId, projectId: p.id, entityType: "factura", entityId: d.id, kind: "factura_plan", title: `Factura ${d.number} del proyecto con ${cuotas.length} pagos`, visibility: "interno" });
    return { id: d.id, number: d.number };
  }
  const concepto = cobro.concepto.trim();
  const monto = r2(Number(cobro.monto));
  if (!concepto) throw new Error("Escribe qué estás cobrando.");
  if (!(monto > 0)) throw new Error("Escribe un monto mayor que cero.");
  if (cobro.projectId) {
    const ok = await prisma.project.findFirst({ where: { id: cobro.projectId, userId: u.id }, select: { id: true } });
    if (!ok) throw new Error("No encontré ese proyecto.");
  }
  const d = await crearFactura(u, { clientId: cobro.clientId, projectId: cobro.projectId ?? null, titulo: concepto, lineas: [{ description: concepto, unitPrice: monto }], sinImpuesto: cobro.sinImpuesto, emitida: cobro.emitida });
  await registrarEvento({ userId: u.id, clientId: cobro.clientId, projectId: cobro.projectId ?? null, entityType: "factura", entityId: d.id, kind: "factura_monto", title: `Factura ${d.number} ${cobro.emitida ? "emitida" : "en borrador"}`, detail: concepto, visibility: "interno" });
  return { id: d.id, number: d.number };
}
