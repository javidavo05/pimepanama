/** Confirmar, cancelar o deshacer lo que propuso el asistente. Usa el mismo motor que la interfaz. */
import { prisma } from "@/lib/prisma";
import { crearCobro, type Equipo } from "@/lib/motor/cobros";
import { registrarPago } from "@/lib/portal/empresa";
import { registrarEvento } from "@/lib/portal/eventos";
import { unirClienteAProyecto } from "@/lib/motor/enlaces";

type PagoFase = { monto: number; fecha: string; metodo: string; referencia: string | null };
type Creado = { proyectoId: string | null; proyectoCreado: boolean; faseId: string | null; facturaId: string | null; pagos: string[] };

/**
 * Una fase con su factura y los pagos ya recibidos. Cada cosa creada queda anotada en la propuesta para poder
 * deshacerla; si algo falla a mitad, se deshace lo que alcanzó a crearse.
 */
async function crearFaseConPagos(u: U, actionId: string, p: Record<string, unknown>) {
  const c: Creado = { proyectoId: (p.proyectoId as string) || null, proyectoCreado: false, faseId: null, facturaId: null, pagos: [] };
  const anotar = () => prisma.assistantAction.update({ where: { id: actionId }, data: { payload: { ...p, creado: c } as object } });
  try {
    if (!c.proyectoId) {
      const nuevo = await prisma.project.create({ data: { userId: u.id, name: String(p.proyectoNuevo).slice(0, 200), clientId: (p.clienteId as string) || null, status: "ACTIVE" } });
      c.proyectoId = nuevo.id; c.proyectoCreado = true;
      if (p.clienteId) await unirClienteAProyecto(u.id, nuevo.id, String(p.clienteId));
    }
    const ultima = await prisma.projectPhase.aggregate({ where: { projectId: c.proyectoId }, _max: { sortOrder: true } });
    const estado = String(p.estado);
    const fase = await prisma.projectPhase.create({ data: { projectId: c.proyectoId, name: String(p.nombre).slice(0, 200), description: (p.descripcion as string) || null, price: Number(p.precio), status: estado, startedAt: estado === "pendiente" ? null : new Date(), completedAt: estado === "hecha" ? new Date() : null, progress: estado === "hecha" ? 100 : 0, sortOrder: (ultima._max.sortOrder ?? -1) + 1 } });
    c.faseId = fase.id;
    const pagos = (p.pagos as PagoFase[] | undefined) ?? [];
    if (pagos.length) {
      const f = await crearCobro(u, { tipo: "fase", faseId: fase.id, sinImpuesto: !p.conItbms });
      c.facturaId = f.id;
      for (const pg of pagos) {
        const r = await registrarPago(u, { clientId: String(p.clienteId), documentId: f.id, monto: pg.monto, fecha: pg.fecha, metodo: pg.metodo, referencia: pg.referencia, nota: "Registrado con el asistente" });
        c.pagos.push(r.id);
      }
    }
    await anotar();
    return c;
  } catch (e) {
    await deshacerCreado(u.id, c).catch(() => {});
    throw e;
  }
}

async function deshacerCreado(userId: string, c: Creado) {
  if (c.pagos.length) await prisma.payment.deleteMany({ where: { id: { in: c.pagos }, userId } });
  if (c.facturaId) {
    const otros = await prisma.payment.count({ where: { documentId: c.facturaId } });
    if (otros) throw new Error("La factura de la fase ya tiene otros pagos; anúlala desde la factura.");
    if (c.faseId) await prisma.projectPhase.updateMany({ where: { id: c.faseId }, data: { invoiceId: null } });
    await prisma.document.deleteMany({ where: { id: c.facturaId, userId } });
  }
  if (c.faseId) await prisma.projectPhase.deleteMany({ where: { id: c.faseId, project: { userId } } });
  if (c.proyectoCreado && c.proyectoId) {
    const resto = await prisma.projectPhase.count({ where: { projectId: c.proyectoId } });
    if (!resto) await prisma.project.deleteMany({ where: { id: c.proyectoId, userId } });
  }
}

type U = Equipo & { id: string };

export async function confirmarAccion(u: U, id: string) {
  const a = await prisma.assistantAction.findFirst({ where: { id, userId: u.id } });
  if (!a) throw new Error("No encontré esa propuesta.");
  if (a.status !== "propuesta") return a;
  const p = a.payload as Record<string, string | number | null>;
  try {
    let resultType = "", resultId = "", resultHref = "";
    if (a.kind === "factura") {
      const r = await crearCobro(u, { tipo: "monto", clientId: String(p.clienteId), projectId: (p.proyectoId as string) || null, concepto: String(p.concepto), monto: Number(p.monto) });
      resultType = "factura"; resultId = r.id; resultHref = `/empresa/facturas/${r.id}`;
    } else if (a.kind === "tarea") {
      const t = await prisma.task.create({ data: { userId: u.id, title: String(p.titulo).slice(0, 300), description: (p.detalle as string) || null, projectId: (p.proyectoId as string) || null, dueDate: p.vence ? new Date(`${p.vence}T17:00:00Z`) : null, allDay: !!p.vence } });
      resultType = "tarea"; resultId = t.id; resultHref = p.proyectoId ? `/empresa/proyectos/${p.proyectoId}?tab=tareas` : "/empresa/tareas";
    } else if (a.kind === "nota") {
      const proj = await prisma.project.findFirst({ where: { id: String(p.proyectoId), userId: u.id }, select: { id: true, clientId: true, clients: { select: { clientId: true }, take: 1 } } });
      const clientId = proj?.clientId ?? proj?.clients[0]?.clientId;
      if (!proj || !clientId) throw new Error("El proyecto no tiene cliente para guardar la nota.");
      const e = await prisma.activityEvent.create({ data: { userId: u.id, clientId, projectId: proj.id, entityType: "nota", kind: "nota_interna", title: String(p.texto).slice(0, 500), visibility: "interno", actorType: "pime", actorEmpresaUserId: u.id } });
      resultType = "nota"; resultId = e.id; resultHref = `/empresa/proyectos/${proj.id}`;
    } else if (a.kind === "fase") {
      const c = await crearFaseConPagos(u, a.id, a.payload as Record<string, unknown>);
      resultType = "fase"; resultId = c.faseId ?? ""; resultHref = `/empresa/proyectos/${c.proyectoId}?tab=fases`;
    } else if (a.kind === "pago") {
      const pg = await registrarPago(u, { clientId: String(p.clienteId), documentId: (p.facturaId as string) || null, monto: Number(p.monto), fecha: String(p.fecha), metodo: String(p.metodo), referencia: (p.referencia as string) || null, nota: "Registrado con el asistente" });
      resultType = "pago"; resultId = pg.id; resultHref = `/empresa/clientes/${p.clienteId}`;
    }
    return prisma.assistantAction.update({ where: { id: a.id }, data: { status: "hecha", decidedAt: new Date(), resultType, resultId, resultHref } });
  } catch (e) {
    await prisma.assistantAction.update({ where: { id: a.id }, data: { status: "fallida", decidedAt: new Date(), error: e instanceof Error ? e.message : "Falló" } });
    throw e;
  }
}

export async function cancelarAccion(userId: string, id: string) {
  await prisma.assistantAction.updateMany({ where: { id, userId, status: "propuesta" }, data: { status: "cancelada", decidedAt: new Date() } });
}

/** Deshacer: borra lo creado si todavía se puede (factura en borrador, tarea, nota, pago sin factura cerrada). */
export async function deshacerAccion(userId: string, id: string) {
  const a = await prisma.assistantAction.findFirst({ where: { id, userId, status: "hecha" } });
  if (!a?.resultId) throw new Error("No hay nada que deshacer.");
  if (a.resultType === "factura") {
    const d = await prisma.document.findFirst({ where: { id: a.resultId, userId }, select: { status: true } });
    if (d && d.status !== "DRAFT") throw new Error("La factura ya salió del borrador; anúlala desde la factura.");
    if (d) await prisma.document.delete({ where: { id: a.resultId } });
  } else if (a.resultType === "tarea") {
    await prisma.task.deleteMany({ where: { id: a.resultId, userId } });
  } else if (a.resultType === "nota") {
    await prisma.activityEvent.deleteMany({ where: { id: a.resultId, userId } });
  } else if (a.resultType === "fase") {
    const c = (a.payload as { creado?: Creado }).creado;
    if (c) await deshacerCreado(userId, c);
  } else if (a.resultType === "pago") {
    const pg = await prisma.payment.findFirst({ where: { id: a.resultId, userId }, select: { documentId: true, clientId: true, amount: true } });
    if (pg) {
      await prisma.payment.delete({ where: { id: a.resultId } });
      if (pg.documentId) { const { recalcularFactura } = await import("@/lib/portal/empresa"); await recalcularFactura(pg.documentId); }
      if (pg.clientId) await registrarEvento({ userId, clientId: pg.clientId, entityType: "pago", kind: "pago_deshecho", title: "Pago registrado por error, deshecho", visibility: "interno", actorType: "pime" });
    }
  }
  await prisma.assistantAction.update({ where: { id: a.id }, data: { status: "deshecha", decidedAt: new Date() } });
}
