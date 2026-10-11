"use server";

/**
 * Acciones de la cuenta del cliente. Cada una vuelve a leer la sesión (getPortalUser) y filtra por
 * su clientId: nunca se confía en un id que llegue del navegador sin comprobar que es de ese cliente.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPortalUser } from "@/lib/portal/sesion";
import { adjuntosValidos } from "@/lib/portal/adjuntos";
import { avisarAlEquipo, avisarAlEquipoTicket } from "@/lib/portal/avisos";
import { registrarEvento } from "@/lib/portal/eventos";
import { invitarPersona } from "@/lib/portal/invitaciones";
import { PAGO_METODOS, TICKET_TIPOS, esUno } from "@/lib/portal/estados";
import { dinero, proyectosDelCliente } from "@/lib/portal/datos";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Estado = { error?: string; ok?: boolean; mensaje?: string } | null;

const texto = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);
async function origen() {
  const h = await headers();
  return { ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export async function crearTicketAction(_: Estado, form: FormData): Promise<Estado> {
  const p = await getPortalUser();
  const titulo = texto(form.get("titulo"), 160);
  const detalle = texto(form.get("detalle"), 8000);
  const tipo = String(form.get("tipo") ?? "soporte");
  const proyectoId = String(form.get("proyecto") ?? "") || null;
  if (!titulo) return { error: "Escribe en una línea qué pasa o qué necesitas." };
  if (!detalle) return { error: "Cuéntanos el detalle: qué hiciste, qué esperabas y qué pasó." };
  if (!esUno(TICKET_TIPOS, tipo) || tipo === "incidente") return { error: "Elige qué tipo de pedido es." };

  let projectId: string | null = null;
  if (proyectoId) {
    const pr = await prisma.project.findFirst({ where: { id: proyectoId, ...proyectosDelCliente(p.clientId) }, select: { id: true } });
    projectId = pr?.id ?? null;
  }
  let adjuntos: ReturnType<typeof adjuntosValidos> = [];
  try { adjuntos = adjuntosValidos(p.clientId, JSON.parse(String(form.get("adjuntos") ?? "[]"))); } catch { adjuntos = []; }

  const ahora = new Date();
  const ticket = await prisma.ticket.create({
    data: {
      userId: p.client.userId, clientId: p.clientId, projectId, kind: tipo, title: titulo, source: "portal",
      openedByClientUserId: p.id, lastClientActivityAt: ahora,
      messages: { create: { authorType: "cliente", clientUserId: p.id, body: detalle } },
    },
    select: { id: true, number: true, messages: { select: { id: true } } },
  });
  if (adjuntos.length) {
    await prisma.ticketAttachment.createMany({ data: adjuntos.map((a) => ({ ticketId: ticket.id, messageId: ticket.messages[0]?.id, r2Key: a.key, fileName: a.fileName, contentType: a.contentType, sizeBytes: a.sizeBytes, uploadedByClientUserId: p.id })) });
  }
  await registrarEvento({ userId: p.client.userId, clientId: p.clientId, projectId, entityType: "ticket", entityId: ticket.id, kind: "ticket_abierto", title: `Abriste el ticket ${ticket.number}: ${titulo}`, visibility: "cliente", actorType: "cliente", actorClientUserId: p.id });
  await avisarAlEquipoTicket(ticket.id, detalle, true);
  redirect(`/cliente/tickets/${ticket.id}?nuevo=1`);
}

export async function responderTicketAction(_: Estado, form: FormData): Promise<Estado> {
  const p = await getPortalUser();
  const id = String(form.get("ticket") ?? "");
  const cuerpo = texto(form.get("mensaje"), 8000);
  const t = await prisma.ticket.findFirst({ where: { id, clientId: p.clientId }, select: { id: true, status: true } });
  if (!t) return { error: "No encontramos ese ticket." };
  let adjuntos: ReturnType<typeof adjuntosValidos> = [];
  try { adjuntos = adjuntosValidos(p.clientId, JSON.parse(String(form.get("adjuntos") ?? "[]"))); } catch { adjuntos = []; }
  if (!cuerpo && !adjuntos.length) return { error: "Escribe un mensaje o adjunta una imagen." };

  const reabrir = t.status === "resuelto" || t.status === "cerrado" || t.status === "esperando_cliente";
  await prisma.ticket.update({
    where: { id: t.id },
    data: {
      lastClientActivityAt: new Date(),
      ...(reabrir ? { status: "en_revision", closedAt: null, resolvedAt: null } : {}),
      messages: {
        create: {
          authorType: "cliente", clientUserId: p.id, body: cuerpo || "(adjuntó archivos)",
          attachments: adjuntos.length ? { create: adjuntos.map((a) => ({ ticketId: t.id, r2Key: a.key, fileName: a.fileName, contentType: a.contentType, sizeBytes: a.sizeBytes, uploadedByClientUserId: p.id })) } : undefined,
        },
      },
    },
  });
  await avisarAlEquipoTicket(t.id, cuerpo || "Adjuntó archivos", false);
  revalidatePath(`/cliente/tickets/${t.id}`);
  return { ok: true };
}

/** Aprobar o rechazar el estimado de horas de un ticket (cuando pasa de 2 horas). */
export async function decidirEstimadoAction(_: Estado, form: FormData): Promise<Estado> {
  const p = await getPortalUser();
  const id = String(form.get("ticket") ?? "");
  const decision = String(form.get("decision") ?? "");
  const comentario = texto(form.get("comentario"), 1000) || null;
  if (decision !== "aprobado" && decision !== "rechazado") return { error: "Elige aprobar o no aprobar." };
  if (decision === "rechazado" && !comentario) return { error: "Cuéntanos por qué, así ajustamos la propuesta." };
  const t = await prisma.ticket.findFirst({ where: { id, clientId: p.clientId, estimateStatus: "pendiente" }, select: { id: true, number: true, title: true, estimatedMinutes: true } });
  if (!t) return { error: "Este estimado ya no espera tu decisión." };
  const o = await origen();
  await prisma.$transaction([
    prisma.approval.create({ data: { userId: p.client.userId, clientId: p.clientId, entityType: "estimado", entityId: t.id, decision, clientUserId: p.id, comment: comentario, ...o } }),
    prisma.ticket.update({ where: { id: t.id }, data: { estimateStatus: decision, status: decision === "aprobado" ? "en_progreso" : "en_revision", lastClientActivityAt: new Date() } }),
    prisma.ticketMessage.create({ data: { ticketId: t.id, authorType: "sistema", body: decision === "aprobado" ? `${p.fullName || p.email} aprobó el estimado.` : `${p.fullName || p.email} no aprobó el estimado: ${comentario}` } }),
  ]);
  await registrarEvento({ userId: p.client.userId, clientId: p.clientId, entityType: "ticket", entityId: t.id, kind: `estimado_${decision}`, title: `${decision === "aprobado" ? "Aprobaste" : "No aprobaste"} el estimado de ${t.number}`, visibility: "cliente", actorType: "cliente", actorClientUserId: p.id });
  await avisarAlEquipo(p.client.userId, `Estimado ${decision} · ${p.client.company || p.client.name}`, `${t.number} ${t.title}`, `/empresa/tickets/${t.id}`);
  revalidatePath(`/cliente/tickets/${t.id}`);
  revalidatePath("/cliente");
  return { ok: true };
}

// ─── Órdenes de cambio ───────────────────────────────────────────────────────

export async function decidirOrdenAction(_: Estado, form: FormData): Promise<Estado> {
  const p = await getPortalUser();
  const id = String(form.get("orden") ?? "");
  const decision = String(form.get("decision") ?? "");
  const comentario = texto(form.get("comentario"), 2000) || null;
  if (!["aprobado", "rechazado", "solicita_cambios"].includes(decision)) return { error: "Elige una opción." };
  if (decision !== "aprobado" && !comentario) return { error: "Escribe qué te gustaría cambiar, así ajustamos la propuesta." };
  const orden = await prisma.changeOrder.findFirst({ where: { id, clientId: p.clientId, status: "enviada" }, select: { id: true, number: true, title: true, total: true, projectId: true } });
  if (!orden) return { error: "Esta orden ya no espera tu decisión." };
  const o = await origen();
  const nuevoEstado = decision === "aprobado" ? "aprobada" : decision === "rechazado" ? "rechazada" : "borrador";
  await prisma.$transaction([
    prisma.approval.create({ data: { userId: p.client.userId, clientId: p.clientId, entityType: "orden_de_cambio", entityId: orden.id, decision, clientUserId: p.id, comment: comentario, ...o } }),
    prisma.changeOrder.update({ where: { id: orden.id }, data: { status: nuevoEstado, decidedAt: new Date(), decidedByClientUserId: p.id, decisionComment: comentario } }),
  ]);
  if (decision === "aprobado") {
    // Las fases de la orden pasan al final del proyecto, en el orden en que vienen en la orden.
    const [ultima, nuevas] = await Promise.all([
      prisma.projectPhase.aggregate({ where: { projectId: orden.projectId, OR: [{ changeOrderId: null }, { changeOrder: { status: "aprobada" }, NOT: { changeOrderId: orden.id } }] }, _max: { sortOrder: true } }),
      prisma.projectPhase.findMany({ where: { changeOrderId: orden.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } }),
    ]);
    const base = (ultima._max.sortOrder ?? -1) + 1;
    await prisma.$transaction(nuevas.map((f, i) => prisma.projectPhase.update({ where: { id: f.id }, data: { sortOrder: base + i } })));
  }
  const verbo = decision === "aprobado" ? "Aprobaste" : decision === "rechazado" ? "No aprobaste" : "Pediste ajustes a";
  await registrarEvento({ userId: p.client.userId, clientId: p.clientId, projectId: orden.projectId, entityType: "orden_de_cambio", entityId: orden.id, kind: `orden_${decision}`, title: `${verbo} la orden de cambio ${orden.number}: ${orden.title}`, detail: decision === "aprobado" ? `Total ${dinero(orden.total)}` : comentario, visibility: "cliente", actorType: "cliente", actorClientUserId: p.id });
  await avisarAlEquipo(p.client.userId, `Orden ${orden.number} ${nuevoEstado} · ${p.client.company || p.client.name}`, orden.title, `/empresa/proyectos/${orden.projectId}`);
  revalidatePath(`/cliente/cambios/${orden.id}`);
  revalidatePath("/cliente");
  return { ok: true };
}

// ─── Pagos ────────────────────────────────────────────────────────────────────

/** El cliente reporta una transferencia con su comprobante; queda «por confirmar» hasta que Pime la vea. */
export async function reportarPagoAction(_: Estado, form: FormData): Promise<Estado> {
  const p = await getPortalUser();
  const facturaId = String(form.get("factura") ?? "") || null;
  const monto = Number(String(form.get("monto") ?? "").replace(/[^\d.]/g, ""));
  const fecha = String(form.get("fecha") ?? "");
  const metodo = String(form.get("metodo") ?? "transferencia");
  const referencia = texto(form.get("referencia"), 120) || null;
  if (!Number.isFinite(monto) || monto <= 0) return { error: "Escribe el monto que pagaste." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elige la fecha del pago." };
  if (!esUno(PAGO_METODOS, metodo)) return { error: "Elige cómo pagaste." };
  if (facturaId) {
    const f = await prisma.document.findFirst({ where: { id: facturaId, clientId: p.clientId, type: "FACTURA" }, select: { id: true } });
    if (!f) return { error: "No encontramos esa factura." };
  }
  let comprobante: string | null = null;
  try { comprobante = adjuntosValidos(p.clientId, JSON.parse(String(form.get("adjuntos") ?? "[]")))[0]?.key ?? null; } catch { comprobante = null; }

  await prisma.payment.create({
    data: { userId: p.client.userId, clientId: p.clientId, documentId: facturaId, amount: monto, paidAt: new Date(`${fecha}T12:00:00Z`), method: metodo, reference: referencia, receiptR2Key: comprobante, status: "por_confirmar", reportedByClientUserId: p.id },
  });
  await registrarEvento({ userId: p.client.userId, clientId: p.clientId, entityType: "pago", kind: "pago_reportado", title: `Reportaste un pago de ${dinero(monto)}`, detail: "Pime lo confirma al verlo en la cuenta.", visibility: "cliente", actorType: "cliente", actorClientUserId: p.id });
  await avisarAlEquipo(p.client.userId, `Pago reportado · ${p.client.company || p.client.name}`, `${dinero(monto)}${referencia ? ` · ref. ${referencia}` : ""}`, `/empresa/clientes/${p.clientId}`);
  revalidatePath("/cliente/facturas");
  revalidatePath("/cliente");
  return { ok: true, mensaje: "Listo. Pime confirma el pago al verlo en la cuenta y tu saldo se actualiza." };
}

// ─── Cuenta ───────────────────────────────────────────────────────────────────

export async function cambiarClaveAction(_: Estado, form: FormData): Promise<Estado> {
  await getPortalUser();
  const clave = String(form.get("clave") ?? "");
  if (clave.length < 10) return { error: "La contraseña necesita al menos 10 caracteres." };
  if (clave !== String(form.get("repetir") ?? "")) return { error: "Las dos contraseñas no coinciden." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: clave });
  if (error) return { error: /reauth|recent/i.test(error.message) ? "Por seguridad, sal y vuelve a entrar antes de cambiarla." : "No se pudo cambiar la contraseña. Inténtalo de nuevo." };
  return { ok: true, mensaje: "Contraseña cambiada." };
}

export async function invitarCompaneroAction(_: Estado, form: FormData): Promise<Estado> {
  const p = await getPortalUser();
  if (p.role !== "principal") return { error: "Solo la persona principal de la cuenta puede invitar a otras." };
  const r = await invitarPersona({ empresaUserId: p.client.userId, clientId: p.clientId, email: String(form.get("email") ?? ""), fullName: texto(form.get("nombre"), 120), role: "miembro", invitadoPor: p.fullName || p.email, invitadoPorClientUserId: p.id });
  if (!r.ok) return { error: r.error };
  revalidatePath("/cliente/cuenta");
  return { ok: true, mensaje: r.enviado ? "Invitación enviada." : "La invitación quedó lista, pero el correo no salió. Pide a Pime que la reenvíe." };
}

export async function quitarCompaneroAction(_: Estado, form: FormData): Promise<Estado> {
  const p = await getPortalUser();
  if (p.role !== "principal") return { error: "Solo la persona principal de la cuenta puede quitar accesos." };
  const id = String(form.get("persona") ?? "");
  if (id === p.id) return { error: "No puedes quitarte el acceso a ti mismo." };
  const otra = await prisma.clientUser.findFirst({ where: { id, clientId: p.clientId }, select: { id: true, email: true } });
  if (!otra) return { error: "No encontramos a esa persona." };
  await prisma.clientUser.update({ where: { id: otra.id }, data: { status: "revocado", revokedAt: new Date() } });
  await registrarEvento({ userId: p.client.userId, clientId: p.clientId, entityType: "cuenta", entityId: otra.id, kind: "acceso_quitado", title: `${p.fullName || p.email} quitó el acceso de ${otra.email}`, visibility: "cliente", actorType: "cliente", actorClientUserId: p.id });
  revalidatePath("/cliente/cuenta");
  return { ok: true, mensaje: "Acceso quitado." };
}
