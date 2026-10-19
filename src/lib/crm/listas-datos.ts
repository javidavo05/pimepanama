/**
 * Datos de la lista de clientes (fase 6 del CRM): una sola carga para la página y la exportación, así lo que se
 * descarga es exactamente lo que se ve filtrado. Seis consultas juntas: cuenta el viaje a la base, no las filas.
 */
import { prisma } from "@/lib/prisma";
import { saldoCliente, FASE_INICIADA } from "@/lib/portal/saldo";
import { fasesVigentes, FASE_COBRABLE, PLAN_COBRABLE } from "@/lib/portal/datos";
import { TICKET_ABIERTOS } from "@/lib/portal/estados";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { opcionesDe, pasaFiltros, type Filtros } from "./listas";

type Quien = { id: string; miembro: { id: string; esDueno: boolean } };

export async function cargarClientes(u: Quien, f: Filtros) {
  const busca = f.q;
  const maxPor = (rows: { clientId: string | null; _max: { updatedAt?: Date | null; createdAt?: Date | null; ocurrioAt?: Date | null } }[]) =>
    new Map(rows.map((r) => [r.clientId, (r._max.updatedAt ?? r._max.createdAt ?? r._max.ocurrioAt)?.getTime() ?? 0]));
  const [clientes, mDocs, mPagos, mTickets, mProyectos, mInteracciones, equipo] = await Promise.all([
    prisma.client.findMany({
      where: {
        userId: u.id, archivedAt: null,
        ...(busca ? { OR: [{ name: { contains: busca, mode: "insensitive" } }, { company: { contains: busca, mode: "insensitive" } }, { email: { contains: busca, mode: "insensitive" } }, { ruc: { contains: busca } }, { phone: { contains: busca } }] } : {}),
      },
      select: {
        id: true, name: true, company: true, email: true, phone: true, ruc: true, brandLine: true, internal: true, updatedAt: true,
        responsableId: true, fuente: true, industria: true, etiquetas: true, ultimoContactoAt: true,
        documents: { where: { type: "FACTURA" }, select: { id: true, status: true, total: true, amountPaid: true } },
        payments: { select: { documentId: true, phaseId: true, amount: true, status: true } },
        // Fases iniciadas sin factura: se deben igual (saldo.ts).
        projects: { where: { status: { not: "CANCELLED" } }, select: { ...PLAN_COBRABLE, phases: { where: { AND: [fasesVigentes, { status: { in: [...FASE_INICIADA] } }] }, select: FASE_COBRABLE } } },
        tickets: { where: { status: { in: TICKET_ABIERTOS } }, select: { id: true } },
        portalUsers: { where: { status: { not: "revocado" } }, select: { status: true } },
        _count: { select: { projects: { where: { status: "ACTIVE" } }, projectLinks: { where: { project: { status: "ACTIVE" } } } } },
      },
    }),
    prisma.document.groupBy({ by: ["clientId"], where: { userId: u.id, clientId: { not: null } }, _max: { createdAt: true } }).then(maxPor),
    prisma.payment.groupBy({ by: ["clientId"], where: { userId: u.id, clientId: { not: null } }, _max: { createdAt: true } }).then(maxPor),
    prisma.ticket.groupBy({ by: ["clientId"], where: { userId: u.id }, _max: { updatedAt: true } }).then(maxPor),
    prisma.project.groupBy({ by: ["clientId"], where: { userId: u.id, clientId: { not: null } }, _max: { createdAt: true } }).then(maxPor),
    prisma.interaccion.groupBy({ by: ["clientId"], where: { userId: u.id, clientId: { not: null } }, _max: { ocurrioAt: true } }).then(maxPor),
    equipoDeLaEmpresa(u.id),
  ]);
  const nombreDe = new Map(equipo.map((e) => [e.id, e.nombre]));

  const todas = clientes.map((c) => {
    const trato = Math.max(0, ...[mDocs, mPagos, mTickets, mProyectos].map((m) => m.get(c.id) ?? 0));
    const movimiento = Math.max(c.updatedAt.getTime(), trato);
    // Último contacto: lo anotado (ficha o interacciones) o, si es más reciente, el último documento, pago o proyecto
    // creado, o el último movimiento de un ticket. De documentos, pagos y proyectos cuenta la creación: la revisión de
    // GitHub y los recordatorios los tocan solos cada día y todos parecerían contactados «hoy». Editar la ficha (asignar responsable, etiquetas) no cuenta como contacto.
    const contacto = Math.max(c.ultimoContactoAt?.getTime() ?? 0, mInteracciones.get(c.id) ?? 0, trato);
    return {
      id: c.id, name: c.name, company: c.company, email: c.email, phone: c.phone, ruc: c.ruc,
      brandLine: c.brandLine, internal: c.internal, responsableId: c.responsableId,
      responsable: c.responsableId ? nombreDe.get(c.responsableId) ?? null : null,
      fuente: c.fuente, industria: c.industria, etiquetas: c.etiquetas,
      saldo: saldoCliente(c.documents, c.payments, c.projects.flatMap((p) => p.phases), c.projects).pendiente,
      tickets: c.tickets.length,
      proyectos: Math.max(c._count.projects, c._count.projectLinks),
      cuenta: !c.portalUsers.length ? "Sin cuenta" : c.portalUsers.some((p) => p.status === "activo") ? "Cuenta activa" : "Invitado",
      movimiento, contacto,
    };
  });
  type Fila = (typeof todas)[number];

  const ahora = Date.now();
  const nombre = (c: Fila) => (c.company || c.name).toLocaleLowerCase("es");
  const filas = todas.filter((c) => pasaFiltros(c, f, u.miembro, ahora)).sort((a, b) =>
    // La empresa interna va arriba, separada de los clientes.
    Number(b.internal) - Number(a.internal) ||
    (f.orden === "az" ? nombre(a).localeCompare(nombre(b), "es")
      : f.orden === "saldo" ? b.saldo - a.saldo || b.movimiento - a.movimiento
      : f.orden === "contacto" ? a.contacto - b.contacto
      : b.movimiento - a.movimiento));

  const externos = todas.filter((c) => !c.internal);
  return {
    filas,
    total: todas.length,
    externos: externos.length,
    porCobrar: externos.reduce((a, c) => a + c.saldo, 0),
    equipo,
    opciones: {
      etiquetas: opcionesDe(todas.flatMap((c) => c.etiquetas)),
      fuentes: opcionesDe(todas.map((c) => c.fuente)),
      industrias: opcionesDe(todas.map((c) => c.industria)),
    },
  };
}

export type FilaCliente = Awaited<ReturnType<typeof cargarClientes>>["filas"][number];
