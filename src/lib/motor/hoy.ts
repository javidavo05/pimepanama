/**
 * Inicio «Hoy» (prompt maestro §3): lo que hay que hacer hoy y el dinero con colores.
 *   rojo  = vencido (alguien debe y ya pasó su fecha)
 *   azul  = por cobrar que todavía no vence
 *   verde = lo que entró
 * Todo en hora de Panamá (UTC−5) y con el mismo cálculo de saldo que la ficha y el proyecto.
 */
import { SIN_INTERNOS } from "@/lib/clientes/interno";
import { prisma } from "@/lib/prisma";
import { pagadoEfectivo, faltaDeFases, faltaDePlan, FASE_INICIADA } from "@/lib/portal/saldo";
import { avanceDeProyecto } from "@/lib/portal/avance";
import { fasesVigentes, FASE_COBRABLE, planesDelEquipoPorCobrar } from "@/lib/portal/datos";
import { eventosDelEquipo } from "@/lib/calendario/datos";

const DIA = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Medianoche de hoy en Panamá, en UTC. */
export function inicioDelDia(ahora = new Date()) {
  const p = new Date(ahora.getTime() - 5 * 3600_000);
  return new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), 5));
}

export type ItemAgenda = { id: string; hora: Date | null; todoElDia: boolean; tipo: "tarea" | "cita" | "reunion" | "cuota" | "factura" | "evento"; titulo: string; detalle: string | null; href: string | null };
export type Vencida = { id: string; numero: string | null; cliente: string; clienteId: string | null; falta: number; dias: number; href: string };

export async function datosHoy(userId: string, ahora = new Date()) {
  const hoy = inicioDelDia(ahora);
  const manana = new Date(hoy.getTime() + DIA);
  const en3 = new Date(hoy.getTime() + 3 * DIA);
  const mes = new Date(Date.UTC(new Date(ahora.getTime() - 5 * 3600_000).getUTCFullYear(), new Date(ahora.getTime() - 5 * 3600_000).getUTCMonth(), 1, 5));
  const mesPasado = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() - 1, 1, 5));

  const [calendario, facturas, pagos, entradas, tareas, citas, reuniones, sistemas, tickets, borradores, porConfirmar, ordenes, proyectos, fasesIniciadas, planes] = await Promise.all([
    eventosDelEquipo(userId, hoy, manana),
    prisma.document.findMany({
      where: { userId, type: "FACTURA", status: { notIn: ["DRAFT", "CANCELLED", "PAID"] }, ...SIN_INTERNOS },
      select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, dueDate: true, clientId: true, clientName: true, client: { select: { name: true, company: true } }, paymentSchedules: { where: { status: { in: ["PENDING", "OVERDUE"] } }, select: { id: true, description: true, amount: true, dueDate: true } } },
    }),
    prisma.payment.findMany({ where: { userId, status: "confirmado", documentId: { not: null }, ...SIN_INTERNOS }, select: { documentId: true, amount: true, status: true } }),
    prisma.payment.findMany({ where: { userId, status: "confirmado", paidAt: { gte: mesPasado }, ...SIN_INTERNOS }, select: { amount: true, paidAt: true } }),
    prisma.task.findMany({ where: { userId, completed: false, dueDate: { lt: manana } }, orderBy: { dueDate: "asc" }, take: 40, select: { id: true, title: true, dueDate: true, allDay: true, projectId: true, project: { select: { name: true } } } }),
    prisma.booking.findMany({ where: { userId, startTime: { gte: hoy, lt: manana }, status: { notIn: ["CANCELLED"] } }, orderBy: { startTime: "asc" }, select: { id: true, startTime: true, attendeeName: true, eventType: { select: { title: true } } } }),
    prisma.meeting.findMany({ where: { userId, meetingDate: { gte: hoy, lt: manana } }, orderBy: { meetingDate: "asc" }, select: { id: true, title: true, meetingDate: true, project: { select: { name: true } } } }),
    prisma.monitoredSystem.findMany({ where: { userId, active: true, status: { in: ["caido", "degradado"] } }, select: { id: true, name: true, status: true, statusChangedAt: true, client: { select: { name: true, company: true } } } }),
    prisma.ticket.findMany({ where: { userId, status: { in: ["abierto", "en_revision", "en_progreso"] } }, orderBy: { updatedAt: "desc" }, select: { id: true, number: true, title: true, priority: true, status: true, lastClientActivityAt: true, lastPimeActivityAt: true, client: { select: { name: true, company: true } } } }),
    prisma.document.findMany({ where: { userId, type: "FACTURA", status: "DRAFT" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, number: true, title: true, total: true, client: { select: { name: true, company: true } } } }),
    prisma.payment.findMany({ where: { userId, status: "por_confirmar" }, select: { id: true, amount: true, clientId: true, client: { select: { name: true, company: true } } } }),
    prisma.changeOrder.findMany({ where: { userId, status: "borrador" }, select: { id: true, number: true, title: true, projectId: true } }),
    prisma.project.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 8, select: { id: true, name: true, githubCheck: true, client: { select: { name: true, company: true } }, phases: { where: fasesVigentes, select: { id: true, name: true, price: true, progress: true, status: true } } } }),
    // Fases iniciadas que todavía no tienen factura viva: se deben igual (por cobrar, sin fecha de vencimiento).
    prisma.projectPhase.findMany({
      where: { AND: [fasesVigentes, { status: { in: [...FASE_INICIADA] } }, { project: { userId, status: { not: "CANCELLED" }, NOT: { client: { is: { internal: true } } } } }] },
      select: { ...FASE_COBRABLE, payments: { where: { status: "confirmado", documentId: null }, select: { documentId: true, phaseId: true, amount: true, status: true } } },
    }),
    // Proyectos que se cobran por su plan de pagos y todavía no lo facturan.
    planesDelEquipoPorCobrar(userId),
  ]);

  const nombre = (c: { name: string; company: string | null } | null | undefined, alterno?: string | null) => c?.company || c?.name || alterno || "Sin cliente";

  // Dinero: cada factura emitida se reparte entre vencido y por cobrar. Con plan de pagos, por cuota.
  let vencido = 0, porCobrar = 0, porVencer = 0;
  const vencidas: Vencida[] = [];
  const cuotasHoy: ItemAgenda[] = [];
  for (const f of facturas) {
    const falta = Math.max(0, r2(Number(f.total ?? 0) - pagadoEfectivo(f, pagos)));
    if (falta <= 0.005) continue;
    const cliente = nombre(f.client, f.clientName);
    if (f.paymentSchedules.length) {
      let v = 0;
      let fecha = null as Date | null;
      for (const s of f.paymentSchedules) {
        const m = Number(s.amount);
        if (s.dueDate < hoy) { v += m; fecha = fecha && fecha < s.dueDate ? fecha : s.dueDate; }
        else { porCobrar += m; if (s.dueDate < en3) porVencer += m; }
        if (s.dueDate >= hoy && s.dueDate < manana) cuotasHoy.push({ id: `cuota-${s.id}`, hora: null, todoElDia: true, tipo: "cuota", titulo: `Vence ${s.description}`, detalle: `${cliente} · USD ${m.toFixed(2)}`, href: `/empresa/facturas/${f.id}` });
      }
      v = Math.min(v, falta);
      if (v > 0.005) { vencido += v; vencidas.push({ id: f.id, numero: f.number, cliente, clienteId: f.clientId, falta: r2(v), dias: Math.floor((hoy.getTime() - (fecha ?? hoy).getTime()) / DIA), href: `/empresa/facturas/${f.id}` }); }
    } else if (f.dueDate && f.dueDate < hoy) {
      vencido += falta;
      vencidas.push({ id: f.id, numero: f.number, cliente, clienteId: f.clientId, falta, dias: Math.floor((hoy.getTime() - f.dueDate.getTime()) / DIA), href: `/empresa/facturas/${f.id}` });
    } else {
      porCobrar += falta;
      if (f.dueDate && f.dueDate < en3) porVencer += falta;
      if (f.dueDate && f.dueDate >= hoy && f.dueDate < manana) cuotasHoy.push({ id: `fac-${f.id}`, hora: null, todoElDia: true, tipo: "factura", titulo: `Vence ${f.number ?? "factura"}`, detalle: `${cliente} · USD ${falta.toFixed(2)}`, href: `/empresa/facturas/${f.id}` });
    }
  }
  for (const x of faltaDeFases(fasesIniciadas, fasesIniciadas.flatMap((f) => f.payments))) porCobrar += x.falta;
  for (const p of planes) porCobrar += faltaDePlan(p, p.payments);
  vencidas.sort((a, b) => b.dias - a.dias || b.falta - a.falta);

  const entroMes = r2(entradas.filter((p) => p.paidAt >= mes).reduce((a, p) => a + Number(p.amount), 0));
  const entroMesPasado = r2(entradas.filter((p) => p.paidAt < mes).reduce((a, p) => a + Number(p.amount), 0));

  const atrasadas = tareas.filter((t) => t.dueDate && t.dueDate < hoy);
  const agenda: ItemAgenda[] = [
    ...citas.map((c) => ({ id: `cita-${c.id}`, hora: c.startTime, todoElDia: false, tipo: "cita" as const, titulo: c.eventType?.title ?? "Cita", detalle: c.attendeeName, href: "/empresa/citas" })),
    ...reuniones.map((m) => ({ id: `reu-${m.id}`, hora: m.meetingDate, todoElDia: false, tipo: "reunion" as const, titulo: m.title, detalle: m.project?.name ?? null, href: `/empresa/reuniones/${m.id}` })),
    ...tareas.filter((t) => t.dueDate && t.dueDate >= hoy).map((t) => ({ id: `tarea-${t.id}`, hora: t.allDay ? null : t.dueDate, todoElDia: t.allDay, tipo: "tarea" as const, titulo: t.title, detalle: t.project?.name ?? null, href: t.projectId ? `/empresa/proyectos/${t.projectId}?tab=tareas` : "/empresa/tareas" })),
    ...cuotasHoy,
    ...calendario.eventos.map((e) => ({ id: `cal-${e.id}`, hora: e.todoElDia ? null : e.inicio, todoElDia: e.todoElDia, tipo: "evento" as const, titulo: e.titulo, detalle: e.lugar ? `Calendario · ${e.lugar}` : "Calendario", href: null })),
  ].sort((a, b) => (a.hora ? a.hora.getTime() : 0) - (b.hora ? b.hora.getTime() : 0));

  const sinResponder = tickets.filter((t) => t.lastClientActivityAt && (!t.lastPimeActivityAt || t.lastClientActivityAt > t.lastPimeActivityAt));
  const urgentes = tickets.filter((t) => t.priority === "urgente" || t.priority === "alta");

  return {
    dinero: { vencido: r2(vencido), porCobrar: r2(porCobrar), porVencer: r2(porVencer), entroMes, entroMesPasado },
    vencidas: vencidas.slice(0, 6),
    totalVencidas: vencidas.length,
    sistemas: sistemas.map((s) => ({ id: s.id, nombre: s.name, cliente: nombre(s.client), estado: s.status, desde: s.statusChangedAt })),
    tickets: { sinResponder: sinResponder.slice(0, 5).map((t) => ({ id: t.id, numero: t.number, titulo: t.title, cliente: nombre(t.client), urgente: t.priority === "urgente" || t.priority === "alta" })), urgentes: urgentes.length, abiertos: tickets.length },
    agenda,
    calendario: { estado: calendario.estado, error: calendario.error ?? null },
    tareasAtrasadas: atrasadas.length,
    decisiones: [
      ...porConfirmar.map((p) => ({ id: `pago-${p.id}`, titulo: `Pago reportado por ${nombre(p.client)}`, detalle: `USD ${Number(p.amount).toFixed(2)} · confírmalo`, href: p.clientId ? `/empresa/clientes/${p.clientId}` : "/empresa/dinero" })),
      ...borradores.map((d) => ({ id: `bor-${d.id}`, titulo: `Factura en borrador ${d.number ?? ""}`.trim(), detalle: `${nombre(d.client)} · USD ${Number(d.total ?? 0).toFixed(2)}`, href: `/empresa/facturas/${d.id}` })),
      ...ordenes.map((o) => ({ id: `oc-${o.id}`, titulo: `Orden de cambio ${o.number} sin enviar`, detalle: o.title, href: `/empresa/proyectos/${o.projectId}` })),
    ],
    proyectos: proyectos.map((p) => {
      const check = p.githubCheck as { commits7?: number; ultimoCommit?: { fecha: string } | null } | null;
      const diasSinActividad = check?.ultimoCommit ? Math.floor((Date.now() - Date.parse(check.ultimoCommit.fecha)) / DIA) : null;
      return { id: p.id, nombre: p.name, cliente: nombre(p.client), avance: avanceDeProyecto(p.phases), diasSinActividad };
    }),
  };
}
