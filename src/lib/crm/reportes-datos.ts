/**
 * Consultas de los reportes del CRM. Todo en una sola ida a la base (consultas en paralelo, ~600 ms cada una
 * desde local) y el cálculo en memoria con las funciones puras de reportes.ts.
 */
import { prisma } from "@/lib/prisma";
import { SIN_INTERNOS } from "@/lib/clientes/interno";
import { TICKET_ABIERTOS } from "@/lib/portal/estados";
import { entradasDelCliente, ingresosDelCliente } from "@/lib/portal/ingresos";
import {
  embudo, tasaCierre, tiempoCierreDias, cerradasPorFuente, perdidasPorMotivo, leadsPorFuente, pronostico, nps,
  saludCliente, vencidoDeFacturas, reglasRiesgo, inicioPeriodo, enPeriodo, masReciente, mesesEntre,
  type Periodo, type Nivel, type Motivo,
} from "./reportes";

const FACTURA_SELECT = {
  id: true, clientId: true, status: true, total: true, amountPaid: true, issueDate: true, dueDate: true, projectId: true,
  paymentSchedules: { select: { amount: true, dueDate: true, status: true } },
} as const;
const PAGO_SELECT = { clientId: true, documentId: true, projectId: true, amount: true, status: true, paidAt: true } as const;

/** Último movimiento real de cada cliente: interacciones, eventos de Pime o del cliente, pagos y el contacto anotado. */
async function movimientos(userId: string, clientIds?: string[]) {
  const porCliente = clientIds ? { clientId: { in: clientIds } } : {};
  const [eventos, interacciones, pagos] = await Promise.all([
    prisma.activityEvent.groupBy({ by: ["clientId"], where: { userId, actorType: { in: ["pime", "cliente"] }, ...porCliente }, _max: { createdAt: true } }),
    prisma.interaccion.groupBy({ by: ["clientId"], where: { userId, clientId: clientIds ? { in: clientIds } : { not: null } }, _max: { ocurrioAt: true } }),
    prisma.payment.groupBy({ by: ["clientId"], where: { userId, status: "confirmado", clientId: clientIds ? { in: clientIds } : { not: null } }, _max: { paidAt: true } }),
  ]);
  const m = new Map<string, Date>();
  const poner = (id: string | null, f: Date | null | undefined) => {
    if (!id || !f) return;
    const prev = m.get(id);
    if (!prev || f > prev) m.set(id, f);
  };
  for (const e of eventos) poner(e.clientId, e._max.createdAt);
  for (const i of interacciones) poner(i.clientId, i._max.ocurrioAt);
  for (const p of pagos) poner(p.clientId, p._max.paidAt);
  return m;
}

export type FilaRiesgo = { id: string; nombre: string; nivel: Nivel; motivos: Motivo[]; ultimoMovimiento: Date | null };
export type FilaIngreso = { id: string; nombre: string; periodo: number; total: number; pagos: number; ticket: number; meses: number; desde: Date };

export async function datosReportes(userId: string, periodo: Periodo, opciones: { verDinero: boolean }, ahora = new Date()) {
  const desde = inicioPeriodo(periodo, ahora);
  const [config, etapas, opos, leads, clientes, facturas, pagos, tickets, sistemas, encuestas, enviadas, ultimos] = await Promise.all([
    prisma.companyConfig.findFirst({ where: { users: { some: { id: userId } } }, select: { reglasCrm: true } }),
    prisma.etapaEmbudo.findMany({ where: { userId }, orderBy: { orden: "asc" }, select: { id: true, nombre: true, orden: true, tipo: true } }),
    prisma.oportunidad.findMany({ where: { userId }, select: { id: true, etapaId: true, estado: true, valor: true, probabilidad: true, cierreEsperado: true, createdAt: true, cerradaAt: true, motivoPerdida: true, fuente: true } }),
    prisma.lead.findMany({ where: { userId, ...(desde ? { createdAt: { gte: desde } } : {}) }, select: { source: true, convertedAt: true } }),
    prisma.client.findMany({ where: { userId, internal: false, archivedAt: null }, select: { id: true, name: true, company: true, createdAt: true, ultimoContactoAt: true } }),
    prisma.document.findMany({ where: { userId, type: "FACTURA", clientId: { not: null }, ...SIN_INTERNOS }, select: FACTURA_SELECT }),
    prisma.payment.findMany({ where: { userId, clientId: { not: null }, ...SIN_INTERNOS }, select: PAGO_SELECT }),
    prisma.ticket.findMany({ where: { userId, status: { in: TICKET_ABIERTOS } }, select: { clientId: true, number: true, createdAt: true } }),
    prisma.monitoredSystem.findMany({ where: { userId, active: true, status: { in: ["caido", "degradado"] } }, select: { clientId: true, name: true, status: true } }),
    prisma.encuesta.findMany({ where: { userId, respondidaAt: desde ? { gte: desde } : { not: null } }, orderBy: { respondidaAt: "desc" }, select: { id: true, puntaje: true, comentario: true, respondidaAt: true, clientId: true, client: { select: { name: true, company: true } }, project: { select: { name: true } } } }),
    prisma.encuesta.count({ where: { userId, ...(desde ? { enviadaAt: { gte: desde } } : {}) } }),
    movimientos(userId),
  ]);

  // Embudo: las oportunidades creadas en el periodo. Pronóstico: todas las abiertas, sin importar cuándo nacieron.
  const delPeriodo = opos.filter((o) => enPeriodo(o.createdAt, desde));
  const cerradas = opos.filter((o) => (o.estado === "ganada" || o.estado === "perdida") && enPeriodo(o.cerradaAt ?? o.createdAt, desde));

  const agrupar = <T extends { clientId: string | null }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) if (x.clientId) m.set(x.clientId, [...(m.get(x.clientId) ?? []), x]);
    return m;
  };
  const facturasDe = agrupar(facturas), pagosDe = agrupar(pagos), ticketsDe = agrupar(tickets), sistemasDe = agrupar(sistemas);
  const reglas = reglasRiesgo(config?.reglasCrm);
  const nombre = (c: { name: string; company: string | null }) => c.company || c.name;

  const riesgo: FilaRiesgo[] = [];
  const ingresos: FilaIngreso[] = [];
  for (const c of clientes) {
    const fs = facturasDe.get(c.id) ?? [], ps = pagosDe.get(c.id) ?? [];
    const ultimo = masReciente(c.ultimoContactoAt, ultimos.get(c.id));
    const s = saludCliente({
      ultimoMovimiento: ultimo,
      vencido: vencidoDeFacturas(fs, ps, ahora),
      ticketsAbiertos: ticketsDe.get(c.id) ?? [],
      sistemas: sistemasDe.get(c.id) ?? [],
      verMontos: opciones.verDinero,
    }, reglas, ahora);
    if (s.nivel !== "sana") riesgo.push({ id: c.id, nombre: nombre(c), ...s, ultimoMovimiento: ultimo });
    if (opciones.verDinero && (fs.length || ps.length)) {
      const vida = ingresosDelCliente(fs, ps);
      if (vida.total <= 0.005) continue;
      const periodoMonto = entradasDelCliente(fs, ps).filter((e) => enPeriodo(e.fecha, desde)).reduce((a, e) => a + e.monto, 0);
      ingresos.push({
        id: c.id, nombre: nombre(c),
        periodo: Math.round(periodoMonto * 100) / 100,
        total: vida.total,
        pagos: vida.entradas,
        ticket: vida.entradas ? Math.round((vida.total / vida.entradas) * 100) / 100 : 0,
        meses: mesesEntre(c.createdAt, ahora),
        desde: c.createdAt,
      });
    }
  }
  riesgo.sort((a, b) => (a.nivel === b.nivel ? b.motivos.length - a.motivos.length : a.nivel === "riesgo" ? -1 : 1));
  ingresos.sort((a, b) => b.periodo - a.periodo || b.total - a.total);

  return {
    desde,
    reglas,
    hayEtapas: etapas.length > 0,
    totalOportunidades: opos.length,
    embudo: {
      oportunidades: delPeriodo.length,
      etapas: embudo(etapas, delPeriodo),
      tasaCierre: tasaCierre(cerradas),
      tiempoCierre: tiempoCierreDias(cerradas),
      ganadas: cerradas.filter((o) => o.estado === "ganada").length,
      perdidas: cerradas.filter((o) => o.estado === "perdida").length,
      porFuente: cerradasPorFuente(cerradas),
      porMotivo: perdidasPorMotivo(cerradas),
      leads: leadsPorFuente(leads),
      totalLeads: leads.length,
    },
    pronostico: pronostico(opos, ahora),
    ingresos,
    riesgo,
    satisfaccion: {
      ...nps(encuestas.map((e) => e.puntaje)),
      enviadas,
      comentarios: encuestas.filter((e) => e.comentario?.trim()).slice(0, 12).map((e) => ({ id: e.id, clientId: e.clientId, cliente: nombre(e.client), proyecto: e.project.name, puntaje: e.puntaje, comentario: e.comentario!.trim(), fecha: e.respondidaAt! })),
    },
  };
}

export type DatosReportes = Awaited<ReturnType<typeof datosReportes>>;

/** Salud de un solo cliente (para la ficha). Mismas reglas que «Clientes en riesgo». */
export async function saludDeUnCliente(userId: string, clientId: string, verDinero: boolean, ahora = new Date()) {
  const [cliente, config, facturas, pagos, tickets, sistemas, ultimos] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, userId }, select: { internal: true, ultimoContactoAt: true } }),
    prisma.companyConfig.findFirst({ where: { users: { some: { id: userId } } }, select: { reglasCrm: true } }),
    prisma.document.findMany({ where: { userId, clientId, type: "FACTURA" }, select: FACTURA_SELECT }),
    prisma.payment.findMany({ where: { userId, clientId }, select: PAGO_SELECT }),
    prisma.ticket.findMany({ where: { userId, clientId, status: { in: TICKET_ABIERTOS } }, select: { number: true, createdAt: true } }),
    prisma.monitoredSystem.findMany({ where: { userId, clientId, active: true, status: { in: ["caido", "degradado"] } }, select: { name: true, status: true } }),
    movimientos(userId, [clientId]),
  ]);
  if (!cliente || cliente.internal) return null;
  return saludCliente({
    ultimoMovimiento: masReciente(cliente.ultimoContactoAt, ultimos.get(clientId)),
    vencido: vencidoDeFacturas(facturas, pagos, ahora),
    ticketsAbiertos: tickets,
    sistemas,
    verMontos: verDinero,
  }, reglasRiesgo(config?.reglasCrm), ahora);
}
