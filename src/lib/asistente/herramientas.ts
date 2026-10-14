/**
 * Herramientas del asistente. Las de lectura responden al momento. Las de escritura (operaciones.ts) pasan
 * por requiereConfirmacion: lo claro y chico se hace al instante y queda con «Deshacer»; lo grande queda
 * como propuesta que la persona confirma en pantalla. Las dos quedan en AssistantAction.
 */
import type OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { mejores } from "./buscar";
import { datosHoy } from "@/lib/motor/hoy";
import { dineroDeProyecto } from "@/lib/motor/cobros";
import { saldoCliente, pagadoEfectivo, FACTURA_CUENTA } from "@/lib/portal/saldo";
import { avanceDeProyecto } from "@/lib/portal/avance";
import { fasesVigentes, FASE_COBRABLE, fasesDelClientePorCobrar } from "@/lib/portal/datos";
import { isFinancingPlan } from "@/lib/financing";
import { requiereConfirmacion } from "./reglas";
import { OPERACIONES, usd, type U, type Args } from "./operaciones";
import { deshacerAccion } from "./acciones";

type Def = OpenAI.Chat.Completions.ChatCompletionTool;
const def = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): Def => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
});
const STR = { type: "string" };

const LECTURA: Def[] = [
  def("buscar_cliente", "Busca clientes por nombre aproximado, empresa, contacto o correo. Úsala SIEMPRE antes de actuar sobre un cliente nombrado.", { texto: STR }, ["texto"]),
  def("resumen_cliente", "Saldo (por cobrar, pagado, fases sin factura), proyectos, contratos, facturas, pagos y tickets abiertos de un cliente, con sus ids.", { clienteId: STR }, ["clienteId"]),
  def("buscar_proyecto", "Busca proyectos por nombre aproximado, opcionalmente de un cliente. Sin texto lista los del cliente.", { texto: STR, clienteId: STR }),
  def("estado_proyecto", "Fases (con ids, precio, estado, factura y pagos), avance, dinero, plan de pagos y actividad de GitHub de un proyecto.", { proyectoId: STR }, ["proyectoId"]),
  def("ver_fases", "Fases de un proyecto con su id, número de orden, precio, estado, avance, factura y lo pagado.", { proyectoId: STR }, ["proyectoId"]),
  def("ver_entregables", "Entregables de un proyecto agrupados por fase, con entregableId, faseId, nombre, detalle, fecha y si está hecho.", { proyectoId: STR }, ["proyectoId"]),
  def("ver_pagos", "Pagos registrados de un cliente o de un proyecto, con id, fecha, monto, fase y factura. desde/hasta en YYYY-MM-DD.", { clienteId: STR, proyectoId: STR, desde: STR, hasta: STR }),
  def("ver_facturas", "Facturas de un cliente o proyecto con id, número, estado, total, pagado y lo que falta.", { clienteId: STR, proyectoId: STR }),
  def("ver_cuotas", "Cuotas del plan de pagos de un proyecto o de una factura, con id, monto, fecha y estado.", { proyectoId: STR, facturaId: STR }),
  def("ver_tareas", "Tareas abiertas (o todas con incluirHechas) por texto aproximado o de un proyecto, con id.", { texto: STR, proyectoId: STR, incluirHechas: { type: "boolean" } }),
  def("ver_tickets", "Tickets por texto o número (TK-0001) o de un cliente, con id.", { texto: STR, clienteId: STR }),
  def("ver_gastos", "Gastos por texto aproximado o de un proyecto, con id.", { texto: STR, proyectoId: STR }),
  def("ver_reuniones", "Reuniones grabadas recientes, por texto aproximado, con id y proyecto.", { texto: STR }),
  def("ver_plataformas", "Plataformas (Platforms) por nombre aproximado, con id, cliente y proyecto.", { texto: STR }),
  def("ver_citas", "Citas agendadas desde una fecha (YYYY-MM-DD, por defecto hoy), con id.", { desde: STR }),
  def("dinero_y_agenda", "Lo de hoy: vencido (rojo), por cobrar (azul, incluye fases iniciadas sin factura), lo que entró este mes (verde), facturas vencidas, agenda, sistemas con problemas y decisiones pendientes.", {}),
  def("ver_acciones", "Lo último que hiciste o propusiste en el sistema, con id y estado (para deshacer).", {}),
  def("deshacer_accion", "Deshace algo que hiciste (accionId de ver_acciones o de una respuesta anterior).", { accionId: STR }, ["accionId"]),
];

export const HERRAMIENTAS: Def[] = [...LECTURA, ...Object.values(OPERACIONES).map((o) => o.def)];

const nombre = (c: { name: string; company: string | null } | null | undefined) => (c ? c.company || c.name : null);
const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export type Accion = { id: string; kind: string; summary: string; estado: "propuesta" | "hecha" | "error"; motivo?: string | null; href?: string | null; error?: string };

async function leer(u: U, nombreHerr: string, a: Args): Promise<unknown> {
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string).trim() : "");
  const userId = u.id;
  switch (nombreHerr) {
    case "buscar_cliente": {
      const cs = await prisma.client.findMany({ where: { userId, archivedAt: null }, select: { id: true, name: true, company: true, email: true, brandLine: true } });
      const r = mejores(s("texto"), cs, (c) => [c.company ?? "", c.name, c.email ?? ""]);
      return r.length ? r.map((x) => ({ clienteId: x.item.id, nombre: nombre(x.item), contacto: x.item.company ? x.item.name : null, linea: x.item.brandLine, coincidencia: Math.round(x.puntaje * 100) })) : { resultado: "No encontré ningún cliente parecido." };
    }
    case "resumen_cliente": {
      const c = await prisma.client.findFirst({ where: { id: s("clienteId"), userId }, select: { id: true, name: true, company: true, brandLine: true, documents: { where: { type: { in: ["FACTURA", "COTIZACION"] } }, orderBy: { issueDate: "asc" }, select: { id: true, type: true, number: true, title: true, status: true, total: true, taxAmount: true, amountPaid: true, dueDate: true, issueDate: true } }, payments: { orderBy: { paidAt: "asc" }, select: { id: true, documentId: true, phaseId: true, amount: true, status: true, paidAt: true, method: true, document: { select: { number: true } }, phase: { select: { name: true } } } }, contracts: { select: { id: true, title: true, status: true, projectId: true } }, projects: { where: { status: { not: "CANCELLED" } }, select: { id: true, name: true, status: true } }, projectLinks: { where: { project: { status: { not: "CANCELLED" } } }, select: { project: { select: { id: true, name: true, status: true } } } }, tickets: { where: { status: { notIn: ["resuelto", "cerrado"] } }, select: { id: true, number: true, title: true } } } });
      if (!c) return { error: "No encontré ese cliente." };
      const fases = await prisma.projectPhase.findMany({ where: fasesDelClientePorCobrar(c.id), select: { ...FASE_COBRABLE, name: true } });
      const facturas = c.documents.filter((d) => d.type === "FACTURA");
      const saldo = saldoCliente(facturas, c.payments, fases);
      const hoy = new Date();
      const proyectos = new Map<string, { proyectoId: string; nombre: string; estado: string }>();
      for (const p of [...c.projects, ...c.projectLinks.map((l) => l.project)]) proyectos.set(p.id, { proyectoId: p.id, nombre: p.name, estado: p.status });
      return {
        cliente: nombre(c), linea: c.brandLine,
        saldo: { porCobrar: usd(saldo.pendiente), facturado: usd(saldo.facturado), fasesIniciadasSinFactura: usd(saldo.sinFacturar), pagado: usd(saldo.pagado) },
        algunaFacturaConItbms: facturas.some((f) => Number(f.taxAmount ?? 0) > 0),
        proyectos: [...proyectos.values()],
        contratos: c.contracts.map((k) => ({ contratoId: k.id, titulo: k.title, estado: k.status, proyectoId: k.projectId })),
        facturas: facturas.map((d) => ({ facturaId: d.id, numero: d.number, fecha: dia(d.issueDate), concepto: d.title, total: usd(Number(d.total ?? 0)), estado: d.status, falta: usd(Math.max(0, Number(d.total ?? 0) - pagadoEfectivo(d, c.payments))), vencida: d.status !== "PAID" && FACTURA_CUENTA(d.status) && !!d.dueDate && d.dueDate < hoy })),
        cotizaciones: c.documents.filter((d) => d.type === "COTIZACION").map((d) => ({ numero: d.number, concepto: d.title, total: usd(Number(d.total ?? 0)), estado: d.status })),
        pagos: c.payments.map((p) => ({ pagoId: p.id, fecha: dia(p.paidAt), monto: usd(Number(p.amount)), estado: p.status, metodo: p.method, factura: p.document?.number ?? null, fase: p.phase?.name ?? null })),
        ticketsAbiertos: c.tickets.map((t) => ({ ticketId: t.id, numero: t.number, titulo: t.title })),
      };
    }
    case "buscar_proyecto": {
      const ps = await prisma.project.findMany({ where: { userId, status: { not: "CANCELLED" }, ...(s("clienteId") ? { OR: [{ clientId: s("clienteId") }, { clients: { some: { clientId: s("clienteId") } } }] } : {}) }, select: { id: true, name: true, status: true, client: { select: { name: true, company: true } } } });
      const r = s("texto") ? mejores(s("texto"), ps, (p) => [p.name, p.client ? nombre(p.client) ?? "" : ""], 0.5) : ps.map((item) => ({ item, puntaje: 1 }));
      return r.length ? r.map((x) => ({ proyectoId: x.item.id, nombre: x.item.name, cliente: nombre(x.item.client), estado: x.item.status })) : { resultado: "No encontré ningún proyecto parecido." };
    }
    case "estado_proyecto":
    case "ver_fases": {
      const p = await prisma.project.findFirst({ where: { id: s("proyectoId"), userId }, select: { id: true, name: true, status: true, financingPlan: true, githubCheck: true, githubCheckAt: true, repoName: true, client: { select: { name: true, company: true } }, phases: { where: fasesVigentes, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true, progress: true, price: true, billingPoint: true, invoice: { select: { id: true, number: true, status: true, total: true } }, payments: { where: { status: "confirmado" }, select: { amount: true } } } } } });
      if (!p) return { error: "No encontré ese proyecto." };
      const fases = p.phases.map((f, i) => ({ faseId: f.id, orden: i + 1, nombre: f.name, estado: f.status, avance: Number(f.progress), precio: usd(Number(f.price)), cobro: f.billingPoint, factura: f.invoice && f.invoice.status !== "CANCELLED" ? { facturaId: f.invoice.id, numero: f.invoice.number, estado: f.invoice.status } : null, pagado: usd(f.payments.reduce((a, x) => a + Number(x.amount), 0)) }));
      if (nombreHerr === "ver_fases") return { proyecto: p.name, cliente: nombre(p.client), fases };
      const dinero = await dineroDeProyecto(userId, p.id);
      const g = p.githubCheck as { commits7?: number; commits30?: number; ultimoCommit?: { mensaje: string; fecha: string } | null } | null;
      return { proyecto: p.name, cliente: nombre(p.client), estado: p.status, avance: `${Math.round(avanceDeProyecto(p.phases))} %`, fases, plan: isFinancingPlan(p.financingPlan) ? p.financingPlan : null, dinero: dinero && { presupuesto: usd(dinero.presupuesto), facturado: usd(dinero.facturado), cobrado: usd(dinero.cobrado), porCobrar: usd(dinero.porCobrar) }, github: p.repoName ? (g ? { verificado: p.githubCheckAt, commits7: g.commits7, commits30: g.commits30, ultimoCambio: g.ultimoCommit } : "Ligado pero sin verificar todavía") : "Sin repositorio" };
    }
    case "ver_entregables": {
      const p = await prisma.project.findFirst({ where: { id: s("proyectoId"), userId }, select: { name: true, phases: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }, deliverables: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true, description: true, dueDate: true, completed: true, phaseId: true } } } });
      if (!p) return { error: "No encontré ese proyecto." };
      const fila = (d: (typeof p.deliverables)[number]) => ({ entregableId: d.id, nombre: d.name, detalle: d.description, fecha: dia(d.dueDate), hecho: d.completed });
      const sinFase = p.deliverables.filter((d) => !d.phaseId || !p.phases.some((f) => f.id === d.phaseId));
      return {
        proyecto: p.name,
        fases: p.phases.map((f) => ({ faseId: f.id, fase: f.name, entregables: p.deliverables.filter((d) => d.phaseId === f.id).map(fila) })),
        ...(sinFase.length ? { sinFase: sinFase.map(fila) } : {}),
      };
    }
    case "ver_pagos": {
      if (!s("clienteId") && !s("proyectoId")) return { error: "Dime el cliente o el proyecto." };
      const desde = /^\d{4}-\d{2}-\d{2}$/.test(s("desde")) ? new Date(`${s("desde")}T00:00:00Z`) : undefined;
      const hasta = /^\d{4}-\d{2}-\d{2}$/.test(s("hasta")) ? new Date(`${s("hasta")}T23:59:59Z`) : undefined;
      const pagos = await prisma.payment.findMany({ where: { userId, ...(s("clienteId") ? { clientId: s("clienteId") } : {}), ...(s("proyectoId") ? { OR: [{ projectId: s("proyectoId") }, { document: { projectId: s("proyectoId") } }] } : {}), ...(desde || hasta ? { paidAt: { gte: desde, lte: hasta } } : {}) }, orderBy: { paidAt: "asc" }, take: 60, select: { id: true, amount: true, paidAt: true, method: true, status: true, reference: true, documentId: true, document: { select: { number: true, status: true } }, phase: { select: { id: true, name: true } }, project: { select: { name: true } }, client: { select: { name: true, company: true } } } });
      return pagos.length ? pagos.map((p) => ({ pagoId: p.id, cliente: nombre(p.client), fecha: dia(p.paidAt), monto: usd(Number(p.amount)), metodo: p.method, estado: p.status, referencia: p.reference, fase: p.phase ? { faseId: p.phase.id, nombre: p.phase.name } : null, proyecto: p.project?.name ?? null, factura: p.document ? { facturaId: p.documentId, numero: p.document.number, estado: p.document.status } : "sin factura" })) : { resultado: "No hay pagos con ese filtro." };
    }
    case "ver_facturas": {
      if (!s("clienteId") && !s("proyectoId")) return { error: "Dime el cliente o el proyecto." };
      const fs = await prisma.document.findMany({ where: { userId, type: "FACTURA", ...(s("clienteId") ? { clientId: s("clienteId") } : {}), ...(s("proyectoId") ? { projectId: s("proyectoId") } : {}) }, orderBy: { issueDate: "asc" }, take: 60, select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true, project: { select: { name: true } }, payments: { select: { documentId: true, amount: true, status: true } }, _count: { select: { paymentSchedules: true } } } });
      return fs.length ? fs.map((f) => ({ facturaId: f.id, numero: f.number, concepto: f.title, estado: f.status, emitida: dia(f.issueDate), vence: dia(f.dueDate), total: usd(Number(f.total ?? 0)), pagado: usd(pagadoEfectivo(f, f.payments)), falta: usd(Math.max(0, Number(f.total ?? 0) - pagadoEfectivo(f, f.payments))), proyecto: f.project?.name ?? null, cuotas: f._count.paymentSchedules })) : { resultado: "No hay facturas con ese filtro." };
    }
    case "ver_cuotas": {
      const cuotas = await prisma.paymentSchedule.findMany({ where: { userId, ...(s("facturaId") ? { documentId: s("facturaId") } : { document: { projectId: s("proyectoId") || "-" } }) }, orderBy: { dueDate: "asc" }, select: { id: true, description: true, amount: true, dueDate: true, status: true, document: { select: { id: true, number: true } } } });
      return cuotas.length ? cuotas.map((q) => ({ cuotaId: q.id, factura: q.document.number, facturaId: q.document.id, descripcion: q.description, monto: usd(Number(q.amount)), vence: dia(q.dueDate), estado: q.status })) : { resultado: "No hay cuotas. Si el plan no está facturado, mira el plan en estado_proyecto." };
    }
    case "ver_tareas": {
      const ts = await prisma.task.findMany({ where: { userId, ...(a.incluirHechas === true ? {} : { completed: false }), ...(s("proyectoId") ? { projectId: s("proyectoId") } : {}) }, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, title: true, dueDate: true, completed: true, project: { select: { name: true } } } });
      const r = s("texto") ? mejores(s("texto"), ts, (t) => [t.title], 0.5, 8).map((x) => x.item) : ts.slice(0, 20);
      return r.length ? r.map((t) => ({ tareaId: t.id, titulo: t.title, vence: dia(t.dueDate), hecha: t.completed, proyecto: t.project?.name ?? null })) : { resultado: "No encontré tareas así." };
    }
    case "ver_tickets": {
      const ts = await prisma.ticket.findMany({ where: { userId, ...(s("clienteId") ? { clientId: s("clienteId") } : {}) }, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, number: true, title: true, status: true, priority: true, client: { select: { name: true, company: true } } } });
      const q = s("texto").toUpperCase();
      const r = q ? (ts.filter((t) => t.number === q || t.number.endsWith(q.replace(/\D/g, "").padStart(4, "0"))).length && /\d/.test(q) ? ts.filter((t) => t.number.endsWith(q.replace(/\D/g, "").padStart(4, "0"))) : mejores(s("texto"), ts, (t) => [t.title], 0.5, 8).map((x) => x.item)) : ts.slice(0, 20);
      return r.length ? r.map((t) => ({ ticketId: t.id, numero: t.number, titulo: t.title, estado: t.status, prioridad: t.priority, cliente: nombre(t.client) })) : { resultado: "No encontré tickets así." };
    }
    case "ver_gastos": {
      const gs = await prisma.expense.findMany({ where: { userId, ...(s("proyectoId") ? { projectId: s("proyectoId") } : {}) }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true, amount: true, status: true, dueDate: true, vendor: true, category: true, project: { select: { name: true } } } });
      const r = s("texto") ? mejores(s("texto"), gs, (g) => [g.title, g.vendor ?? ""], 0.5, 8).map((x) => x.item) : gs.slice(0, 20);
      return r.length ? r.map((g) => ({ gastoId: g.id, titulo: g.title, monto: usd(Number(g.amount)), estado: g.status, fecha: dia(g.dueDate), proveedor: g.vendor, categoria: g.category, proyecto: g.project?.name ?? null })) : { resultado: "No encontré gastos así." };
    }
    case "ver_reuniones": {
      const ms = await prisma.meeting.findMany({ where: { userId }, orderBy: { meetingDate: "desc" }, take: 60, select: { id: true, title: true, meetingDate: true, project: { select: { name: true } }, client: { select: { name: true, company: true } } } });
      const r = s("texto") ? mejores(s("texto"), ms, (m) => [m.title, nombre(m.client) ?? ""], 0.5, 8).map((x) => x.item) : ms.slice(0, 10);
      return r.length ? r.map((m) => ({ reunionId: m.id, titulo: m.title, fecha: dia(m.meetingDate), proyecto: m.project?.name ?? null, cliente: nombre(m.client) })) : { resultado: "No encontré reuniones así." };
    }
    case "ver_plataformas": {
      const ps = await prisma.platform.findMany({ where: { userId }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, client: { select: { name: true, company: true } }, project: { select: { name: true } } } });
      const r = s("texto") ? mejores(s("texto"), ps, (p) => [p.name], 0.5, 8).map((x) => x.item) : ps.slice(0, 30);
      return r.length ? r.map((p) => ({ plataformaId: p.id, nombre: p.name, cliente: nombre(p.client), proyecto: p.project?.name ?? null })) : { resultado: "No encontré plataformas así." };
    }
    case "ver_citas": {
      const desde = /^\d{4}-\d{2}-\d{2}$/.test(s("desde")) ? new Date(`${s("desde")}T05:00:00Z`) : new Date(Date.now() - 6 * 3600_000);
      const bs = await prisma.booking.findMany({ where: { userId, startTime: { gte: desde }, status: { not: "CANCELLED" } }, orderBy: { startTime: "asc" }, take: 20, select: { id: true, attendeeName: true, startTime: true, endTime: true, status: true } });
      return bs.length ? bs.map((b) => ({ citaId: b.id, con: b.attendeeName, inicio: b.startTime.toLocaleString("es-PA", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }), minutos: Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60_000) })) : { resultado: "No hay citas desde esa fecha." };
    }
    case "dinero_y_agenda": {
      const d = await datosHoy(userId);
      return { dinero: { vencido: usd(d.dinero.vencido), porCobrar: usd(d.dinero.porCobrar), entroEsteMes: usd(d.dinero.entroMes), entroMesPasado: usd(d.dinero.entroMesPasado) }, vencidas: d.vencidas.map((v) => `${v.cliente}: ${usd(v.falta)} (${v.numero}, ${v.dias} días)`), agendaDeHoy: d.agenda.map((x) => `${x.hora ? x.hora.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }) : "Hoy"} · ${x.titulo}${x.detalle ? ` (${x.detalle})` : ""}`), tareasAtrasadas: d.tareasAtrasadas, sistemasConProblemas: d.sistemas.map((x) => `${x.nombre} (${x.cliente})`), decisiones: d.decisiones.map((x) => x.titulo) };
    }
    case "ver_acciones": {
      const as = await prisma.assistantAction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, kind: true, summary: true, status: true, createdAt: true } });
      return as.map((x) => ({ accionId: x.id, que: x.summary, estado: x.status, cuando: x.createdAt }));
    }
  }
  return undefined;
}

/**
 * Ejecuta una herramienta. Las de escritura se hacen al instante o quedan propuestas según
 * requiereConfirmacion; cualquiera de las dos queda anotada en `acciones` para la pantalla.
 */
export async function ejecutarHerramienta(u: U, nombreHerr: string, args: Args, pedido: string, acciones: Accion[]): Promise<unknown> {
  const lectura = await leer(u, nombreHerr, args);
  if (lectura !== undefined) return lectura;

  if (nombreHerr === "deshacer_accion") {
    const id = typeof args.accionId === "string" ? args.accionId : "";
    const a = await prisma.assistantAction.findFirst({ where: { id, userId: u.id }, select: { summary: true } });
    if (!a) return { error: "No encontré esa acción." };
    await deshacerAccion(u.id, id);
    return { deshecho: true, que: a.summary };
  }

  const op = OPERACIONES[nombreHerr];
  if (!op) return { error: `No conozco la herramienta ${nombreHerr}.` };
  const prep = await op.preparar(u, args);
  if ("error" in prep) return prep;
  const decision = requiereConfirmacion(prep.evalua);
  const base = { userId: u.id, kind: nombreHerr, summary: prep.resumen.slice(0, 1000), request: pedido.slice(0, 2000) };

  if (decision.confirmar) {
    const a = await prisma.assistantAction.create({ data: { ...base, payload: { v: 2, ...prep.payload, motivo: decision.motivo } as object } });
    acciones.push({ id: a.id, kind: nombreHerr, summary: prep.resumen, estado: "propuesta", motivo: decision.motivo });
    return { propuesta: a.id, resumen: prep.resumen, estado: `Espera que la persona toque Confirmar (${decision.motivo}). No digas que ya está hecho.` };
  }

  try {
    const h = await op.ejecutar(u, prep.payload);
    const a = await prisma.assistantAction.create({ data: { ...base, status: "hecha", decidedAt: new Date(), payload: { v: 2, ...prep.payload, pasos: h.pasos } as object, resultType: h.resultType, resultId: h.resultId, resultHref: h.href } });
    acciones.push({ id: a.id, kind: nombreHerr, summary: prep.resumen, estado: "hecha", href: h.href });
    return { hecho: true, accionId: a.id, resumen: prep.resumen, ...(h.datos ?? {}) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falló.";
    const a = await prisma.assistantAction.create({ data: { ...base, status: "fallida", decidedAt: new Date(), payload: { v: 2, ...prep.payload } as object, error: msg.slice(0, 1000) } });
    acciones.push({ id: a.id, kind: nombreHerr, summary: prep.resumen, estado: "error", error: msg });
    return { error: `No se pudo: ${msg}` };
  }
}
