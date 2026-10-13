/**
 * Lo que hace falta saber de cada cliente al elegirlo en una reunión: sus proyectos con la fase en curso,
 * cuánto debe y lo último que se habló. Se carga para todos los clientes de una vez (cuatro consultas en
 * paralelo), así al elegir un cliente o un proyecto la ficha sale al instante, sin otra ida a la base.
 */
import { prisma } from "@/lib/prisma";
import { avanceDeProyecto, faseActual } from "@/lib/portal/avance";
import { fasesVigentes, FASE_COBRABLE } from "@/lib/portal/datos";
import { saldoCliente } from "@/lib/portal/saldo";

export type ProyectoDeCliente = { id: string; name: string; status: string; avance: number; fase: string | null };
export type ResumenClienteReunion = {
  proyectos: ProyectoDeCliente[];
  porCobrar: number;
  pagado: number;
  reuniones: number;
  ultima: { title: string; fecha: string; resumen: string | null } | null;
};
/** Proyecto para los selectores: con su cliente principal (el de ProjectClient si el espejo legacy está vacío). */
export type ProyectoOpcion = { id: string; name: string; clientId: string | null; status: string };

export async function contextoClientes(userId: string, excluirReunion?: string) {
  const [proyectos, facturas, pagos, reuniones] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, name: true, status: true, clientId: true,
        clients: { select: { clientId: true }, take: 1 },
        phases: { where: fasesVigentes, orderBy: { sortOrder: "asc" }, select: { ...FASE_COBRABLE, name: true, progress: true, sortOrder: true } },
      },
    }),
    prisma.document.findMany({ where: { userId, type: "FACTURA", clientId: { not: null } }, select: { id: true, clientId: true, status: true, total: true, amountPaid: true } }),
    prisma.payment.findMany({ where: { userId, clientId: { not: null } }, select: { clientId: true, documentId: true, phaseId: true, amount: true, status: true } }),
    prisma.meeting.findMany({
      where: { userId, ...(excluirReunion ? { id: { not: excluirReunion } } : {}), OR: [{ clientId: { not: null } }, { projectId: { not: null } }] },
      orderBy: { meetingDate: "desc" },
      take: 500,
      select: { clientId: true, projectId: true, title: true, meetingDate: true, contextSummary: true },
    }),
  ]);

  const opciones: ProyectoOpcion[] = proyectos.map((p) => ({ id: p.id, name: p.name, status: p.status, clientId: p.clientId ?? p.clients[0]?.clientId ?? null }));
  const clienteDe = new Map(opciones.map((p) => [p.id, p.clientId]));

  const porCliente = new Map<string, ResumenClienteReunion>();
  const de = (id: string) => {
    let r = porCliente.get(id);
    if (!r) porCliente.set(id, (r = { proyectos: [], porCobrar: 0, pagado: 0, reuniones: 0, ultima: null }));
    return r;
  };

  // Activos primero (ya vienen del más reciente al más viejo).
  const orden = (s: string) => (s === "ACTIVE" ? 0 : s === "PAUSED" ? 1 : 2);
  for (const p of [...proyectos].sort((a, b) => orden(a.status) - orden(b.status))) {
    const cid = clienteDe.get(p.id);
    if (!cid) continue;
    de(cid).proyectos.push({ id: p.id, name: p.name, status: p.status, avance: avanceDeProyecto(p.phases), fase: faseActual(p.phases)?.name ?? null });
  }

  const clientes = new Set([...facturas.map((f) => f.clientId!), ...pagos.map((p) => p.clientId!), ...clienteDe.values()].filter((x): x is string => !!x));
  for (const cid of clientes) {
    const fasesSinFactura = proyectos.filter((p) => clienteDe.get(p.id) === cid && p.status !== "CANCELLED").flatMap((p) => p.phases);
    const s = saldoCliente(facturas.filter((f) => f.clientId === cid), pagos.filter((p) => p.clientId === cid), fasesSinFactura);
    const r = de(cid);
    r.porCobrar = s.pendiente;
    r.pagado = s.pagado;
  }

  for (const m of reuniones) {
    const cid = m.clientId ?? (m.projectId ? clienteDe.get(m.projectId) ?? null : null);
    if (!cid) continue;
    const r = de(cid);
    r.reuniones += 1;
    if (!r.ultima) r.ultima = { title: m.title, fecha: m.meetingDate.toISOString(), resumen: m.contextSummary };
  }

  return { proyectos: opciones, resumenes: Object.fromEntries(porCliente) as Record<string, ResumenClienteReunion> };
}

/**
 * El proyecto de una reunión que solo tiene cliente: si el cliente tiene un único proyecto en curso (activo
 * o en pausa), es ese. Con varios no se adivina: se elige a mano, con los suyos arriba.
 */
export async function proyectoUnicoDelCliente(userId: string, clientId: string): Promise<string | null> {
  const enCurso = await prisma.project.findMany({
    where: { userId, status: { in: ["ACTIVE", "PAUSED"] }, OR: [{ clientId }, { clients: { some: { clientId } } }] },
    select: { id: true },
    take: 2,
  });
  return enCurso.length === 1 ? enCurso[0].id : null;
}
