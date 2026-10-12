/**
 * Confirmar, cancelar o deshacer lo que hizo o propuso el asistente. Usa el mismo motor que las
 * herramientas (operaciones.ts) y deshace con los pasos anotados (pasos.ts).
 */
import { prisma } from "@/lib/prisma";
import { OPERACIONES, type U } from "./operaciones";
import { deshacerPasos, type Paso } from "./pasos";

/** Acciones de antes del motor nuevo (0050): una fase con su factura y pagos. Solo se pueden deshacer. */
type CreadoViejo = { proyectoId: string | null; proyectoCreado: boolean; faseId: string | null; facturaId: string | null; pagos: string[] };

async function deshacerViejo(userId: string, c: CreadoViejo) {
  if (c.pagos.length) await prisma.payment.deleteMany({ where: { id: { in: c.pagos }, userId } });
  if (c.facturaId) {
    const otros = await prisma.payment.count({ where: { documentId: c.facturaId } });
    if (otros) throw new Error("La factura de la fase ya tiene otros pagos; anúlala desde la factura.");
    if (c.faseId) await prisma.projectPhase.updateMany({ where: { id: c.faseId }, data: { invoiceId: null } });
    await prisma.document.deleteMany({ where: { id: c.facturaId, userId } });
  }
  if (c.faseId) await prisma.projectPhase.deleteMany({ where: { id: c.faseId, project: { userId } } });
  if (c.proyectoCreado && c.proyectoId) {
    await prisma.contract.updateMany({ where: { projectId: c.proyectoId, userId }, data: { projectId: null } });
    const resto = await prisma.projectPhase.count({ where: { projectId: c.proyectoId } });
    if (!resto) await prisma.project.deleteMany({ where: { id: c.proyectoId, userId } });
  }
}

export async function confirmarAccion(u: U, id: string) {
  // Se toma la propuesta de una sola vez: dos toques seguidos no la ejecutan dos veces.
  const tomada = await prisma.assistantAction.updateMany({ where: { id, userId: u.id, status: "propuesta" }, data: { status: "hecha", decidedAt: new Date() } });
  const a = await prisma.assistantAction.findFirst({ where: { id, userId: u.id } });
  if (!a) throw new Error("No encontré esa propuesta.");
  if (!tomada.count) return a;
  const payload = a.payload as Record<string, unknown>;
  const op = OPERACIONES[a.kind];
  try {
    if (!op || payload.v !== 2) throw new Error("Esta propuesta es de una versión anterior del asistente. Pídela de nuevo.");
    // Se vuelve a validar contra la base: pudo cambiar algo desde que se propuso.
    const datos = Object.fromEntries(Object.entries(payload).filter(([k]) => k !== "v" && k !== "motivo"));
    const h = await op.ejecutar(u, datos);
    return prisma.assistantAction.update({ where: { id: a.id }, data: { payload: { ...payload, pasos: h.pasos } as object, resultType: h.resultType, resultId: h.resultId, resultHref: h.href } });
  } catch (e) {
    await prisma.assistantAction.update({ where: { id: a.id }, data: { status: "fallida", error: e instanceof Error ? e.message.slice(0, 1000) : "Falló" } });
    throw e;
  }
}

export async function cancelarAccion(userId: string, id: string) {
  await prisma.assistantAction.updateMany({ where: { id, userId, status: "propuesta" }, data: { status: "cancelada", decidedAt: new Date() } });
}

/** Deshace lo que hizo una acción. Si algo ya no se puede (por ejemplo, la factura recibió otro pago), avisa. */
export async function deshacerAccion(userId: string, id: string) {
  const tomada = await prisma.assistantAction.updateMany({ where: { id, userId, status: "hecha" }, data: { status: "deshecha", decidedAt: new Date() } });
  if (!tomada.count) throw new Error("No hay nada que deshacer.");
  const a = await prisma.assistantAction.findFirstOrThrow({ where: { id, userId } });
  const payload = a.payload as { v?: number; pasos?: Paso[]; creado?: CreadoViejo };
  try {
    if (payload.v === 2) await deshacerPasos(userId, payload.pasos ?? []);
    else if (a.kind === "fase" && payload.creado) await deshacerViejo(userId, payload.creado);
    else throw new Error("Esta acción es de una versión anterior; cámbiala a mano.");
  } catch (e) {
    await prisma.assistantAction.update({ where: { id: a.id }, data: { status: "hecha", error: e instanceof Error ? e.message.slice(0, 1000) : "No se pudo deshacer" } });
    throw e;
  }
}
