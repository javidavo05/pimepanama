"use server";

/**
 * Acciones del equipo para Pime Clientes: alta y edición de clientes, cuenta del cliente
 * (invitar, restablecer, quitar acceso), tickets, horas, facturas de horas, pagos, fases y órdenes
 * de cambio. Todas pasan por getEmpresaUser (equipo + doble verificación) y filtran por su userId.
 */
import { enviarAlCliente } from "@/lib/motor/envios";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { invitarPersona, enviarRecuperacion } from "@/lib/portal/invitaciones";
import { registrarEvento } from "@/lib/portal/eventos";
import { decidirPagoReportado, facturarHoras, fijarEstimado, registrarHoras, registrarPago, responderComoPime, avanceDeFaseEvento, sugerirGarantia, clientePrincipal } from "@/lib/portal/empresa";
import { FASE_COBRO, FASE_ESTADOS, PAGO_METODOS, PROYECTO_TIPOS, TICKET_PRIORIDADES, TICKET_TIPOS, TICKET_TIPOS_INTERNOS, esUno } from "@/lib/portal/estados";
import { dinero } from "@/lib/portal/datos";
import { getSiteUrl } from "@/lib/site-url";
import { FUENTES_CLIENTE, limpiarEtiquetas, valorDeCampo } from "@/lib/crm/ficha";
import type { Prisma } from "@prisma/client";

export type Estado = { error?: string; ok?: boolean; mensaje?: string; enlace?: string; aviso?: boolean } | null;
const txt = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);
const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/[^\d.-]/g, ""));
/** Enlace de revisión de una fase: vacío = null; sin protocolo se le pone https://; undefined si no es una URL válida. */
const enlaceRevision = (v: string): string | null | undefined => {
  if (!v) return null;
  try { const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined; } catch { return undefined; }
};
const falla = (e: unknown): Estado => ({ error: e instanceof Error ? e.message : "No se pudo completar." });

function refrescar(clientId?: string | null, extra: string[] = []) {
  if (clientId) revalidatePath(`/empresa/clientes/${clientId}`);
  ["/empresa/clientes", "/empresa/tickets", "/empresa/dinero", "/empresa", ...extra].forEach((p) => revalidatePath(p));
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

export async function guardarClienteAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 60) || null;
  const datos = {
    name: txt(form.get("name"), 160),
    company: txt(form.get("company"), 160) || null,
    ruc: txt(form.get("ruc"), 60) || null,
    email: txt(form.get("email"), 160).toLowerCase() || null,
    phone: txt(form.get("phone"), 60) || null,
    address: txt(form.get("address"), 300) || null,
    city: txt(form.get("city"), 100) || null,
    country: txt(form.get("country"), 100) || "Panamá",
    notes: txt(form.get("notes"), 4000) || null,
    brandLine: form.get("brandLine") === "premium" ? "premium" : "normal",
    hourlyRate: txt(form.get("hourlyRate"), 20) ? num(form.get("hourlyRate")) : null,
  };
  if (!datos.name) return { error: "Escribe el nombre del contacto o de la empresa." };
  // Datos del CRM (fuente, industria, etiquetas y campos propios): solo si el formulario los trae.
  const crm: Partial<DatosCrm> = form.get("crm") === "1" ? await datosCrm(u.id, form, id) : {};
  if (datos.hourlyRate != null && (!Number.isFinite(datos.hourlyRate) || datos.hourlyRate < 0)) return { error: "La tarifa por hora no es válida." };
  let clientId = id;
  if (id) {
    const c = await prisma.client.findFirst({ where: { id, userId: u.id }, select: { id: true } });
    if (!c) return { error: "No encontré ese cliente." };
    await prisma.client.update({ where: { id }, data: { ...datos, ...crm } });
  } else {
    const dup = datos.email ? await prisma.client.findFirst({ where: { userId: u.id, email: { equals: datos.email, mode: "insensitive" } }, select: { id: true, name: true } }) : null;
    if (dup && form.get("confirmarDuplicado") !== "1") return { error: `Ya existe un cliente con ese correo: ${dup.name}. Ábrelo desde Clientes o vuelve a guardar para crear otro.` };
    const c = await prisma.client.create({ data: { ...datos, ...crm, userId: u.id } });
    clientId = c.id;
    // El primer contacto principal sale de los datos del cliente: nadie tiene que escribirlos dos veces.
    // El campo «Contacto» del formulario es la persona; se guarda como principal y decide.
    await prisma.contacto.create({ data: { userId: u.id, clientId: c.id, nombre: datos.name, email: datos.email, telefono: datos.phone, rol: "decide", principal: true } })
      .catch((e) => console.error("[clientes] contacto principal", e));
    await registrarEvento({ userId: u.id, clientId: c.id, entityType: "cliente", entityId: c.id, kind: "cliente_creado", title: "Cliente creado", visibility: "interno", actorEmpresaUserId: u.id });
    // Sin invitación automática: primero se revisa su cuenta (vista de revisión) y luego se invita desde la ficha.
  }
  refrescar(clientId);
  redirect(`/empresa/clientes/${clientId}`);
}

/** Fuente, industria, etiquetas y campos propios del formulario. Los campos propios se mezclan con lo ya guardado. */
type DatosCrm = { fuente: string | null; industria: string | null; etiquetas: string[]; camposExtra: Prisma.InputJsonValue };
async function datosCrm(userId: string, form: FormData, id: string | null): Promise<DatosCrm> {
  const fuente = txt(form.get("fuente"), 60);
  let etiquetas: unknown[] = [];
  try { const v = JSON.parse(String(form.get("etiquetas") ?? "[]")); if (Array.isArray(v)) etiquetas = v; } catch { etiquetas = []; }
  const [campos, previo] = await Promise.all([
    prisma.campoPersonalizado.findMany({ where: { userId, entidad: "cliente" }, select: { clave: true, tipo: true, opciones: true } }),
    id ? prisma.client.findFirst({ where: { id, userId }, select: { camposExtra: true } }) : null,
  ]);
  const extra: Record<string, unknown> = previo?.camposExtra && typeof previo.camposExtra === "object" && !Array.isArray(previo.camposExtra) ? { ...(previo.camposExtra as Record<string, unknown>) } : {};
  for (const k of campos) {
    if (!form.has(`campo_${k.clave}`)) continue;
    const v = valorDeCampo(k.tipo, k.opciones, txt(form.get(`campo_${k.clave}`), 500));
    if (v == null) delete extra[k.clave]; else extra[k.clave] = v;
  }
  return {
    fuente: (FUENTES_CLIENTE as readonly string[]).includes(fuente) ? fuente : null,
    industria: txt(form.get("industria"), 80) || null,
    etiquetas: limpiarEtiquetas(etiquetas),
    camposExtra: extra as Prisma.InputJsonValue,
  };
}

/** Lo que se le dice a quien invitó: enviada, o creada pero con el motivo exacto por el que el correo no salió. */
function resultadoInvitacion(r: { enlace: string; enviado: boolean; errorEnvio?: string }, ok: string): Estado {
  if (r.enviado) return { ok: true, enlace: r.enlace, mensaje: ok };
  return {
    ok: true,
    aviso: true,
    enlace: r.enlace,
    mensaje: `La invitación quedó creada, pero el correo no salió (${r.errorEnvio ?? "sin detalle"}). Copia el enlace y mándaselo tú.`,
  };
}

export async function invitarAlPortalAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const clientId = txt(form.get("clientId"), 60);
  const r = await invitarPersona({ empresaUserId: u.id, clientId, email: txt(form.get("email"), 160), fullName: txt(form.get("nombre"), 120) || null, role: form.get("rol") === "miembro" ? "miembro" : "principal", invitadoPor: u.fullName || "El equipo de Pime" });
  if (!r.ok) return { error: r.error };
  refrescar(clientId);
  return resultadoInvitacion(r, "Invitación enviada por correo. También puedes copiar el enlace.");
}

export async function restablecerAccesoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await prisma.clientUser.findFirst({ where: { id: txt(form.get("persona"), 60), userId: u.id }, select: { id: true, email: true, status: true, clientId: true } });
  if (!p) return { error: "No encontré a esa persona." };
  if (p.status === "invitado") {
    const r = await invitarPersona({ empresaUserId: u.id, clientId: p.clientId, email: p.email, invitadoPor: u.fullName });
    return r.ok ? resultadoInvitacion(r, `Invitación reenviada a ${p.email}.`) : { error: r.error };
  }
  await enviarRecuperacion(p.email);
  await registrarEvento({ userId: u.id, clientId: p.clientId, entityType: "cuenta", entityId: p.id, kind: "recuperacion", title: `Enviamos a ${p.email} un enlace para cambiar la contraseña`, visibility: "interno", actorEmpresaUserId: u.id });
  return { ok: true, mensaje: `Enviamos a ${p.email} un enlace para elegir una contraseña nueva.` };
}

export async function quitarAccesoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await prisma.clientUser.findFirst({ where: { id: txt(form.get("persona"), 60), userId: u.id }, select: { id: true, email: true, clientId: true } });
  if (!p) return { error: "No encontré a esa persona." };
  await prisma.clientUser.update({ where: { id: p.id }, data: { status: "revocado", revokedAt: new Date() } });
  await registrarEvento({ userId: u.id, clientId: p.clientId, entityType: "cuenta", entityId: p.id, kind: "acceso_quitado", title: `Quitamos el acceso de ${p.email}`, visibility: "interno", actorEmpresaUserId: u.id });
  refrescar(p.clientId);
  return { ok: true, mensaje: "Acceso quitado." };
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export async function crearTicketEquipoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const clientId = txt(form.get("clientId"), 60);
  const c = await prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { id: true, internal: true } });
  if (!c) return { error: "Elige un cliente." };
  const titulo = txt(form.get("titulo"), 160), detalle = txt(form.get("detalle"), 8000);
  const tipo = txt(form.get("tipo"), 20) || "soporte", prioridad = txt(form.get("prioridad"), 20) || "normal";
  if (!titulo) return { error: "Escribe el título del ticket." };
  // La empresa interna usa los tipos del equipo (error, mejora, tarea, incidente).
  if (!(c.internal ? esUno(TICKET_TIPOS_INTERNOS, tipo) : esUno(TICKET_TIPOS, tipo)) || !esUno(TICKET_PRIORIDADES, prioridad)) return { error: "Tipo o prioridad no válidos." };
  const projectIdPedido = txt(form.get("projectId"), 60) || null;
  // El proyecto tiene que ser del cliente elegido.
  const projectId = projectIdPedido
    ? (await prisma.project.findFirst({ where: { id: projectIdPedido, userId: u.id, OR: [{ clientId }, { clients: { some: { clientId } } }] }, select: { id: true } }))?.id ?? null
    : null;
  const t = await prisma.ticket.create({
    data: { userId: u.id, clientId, projectId, kind: tipo, priority: prioridad, title: titulo, source: "empresa", openedByEmpresaUserId: u.id, status: "en_revision", lastPimeActivityAt: new Date(),
      messages: detalle ? { create: { authorType: "pime", empresaUserId: u.id, body: detalle, internal: form.get("interno") === "1" } } : undefined },
  });
  await registrarEvento({ userId: u.id, clientId, projectId, entityType: "ticket", entityId: t.id, kind: "ticket_abierto", title: `Abrimos el ticket ${t.number}: ${titulo}`, visibility: c.internal ? "interno" : "cliente", actorEmpresaUserId: u.id });
  refrescar(clientId);
  redirect(`/empresa/tickets/${t.id}`);
}

export async function responderTicketEquipoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  try {
    await responderComoPime(u, txt(form.get("ticket"), 60), txt(form.get("mensaje"), 8000), { interno: form.get("interno") === "1", estado: txt(form.get("estado"), 30) || undefined });
  } catch (e) { return falla(e); }
  revalidatePath(`/empresa/tickets/${txt(form.get("ticket"), 60)}`);
  refrescar();
  return { ok: true };
}

export async function estimarTicketAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const horas = num(form.get("horas"));
  if (!Number.isFinite(horas) || horas <= 0 || horas > 400) return { error: "Escribe las horas estimadas (por ejemplo 1.5)." };
  try {
    const r = await fijarEstimado(u, txt(form.get("ticket"), 60), Math.round(horas * 60));
    revalidatePath(`/empresa/tickets/${txt(form.get("ticket"), 60)}`);
    return { ok: true, mensaje: r.requiereAprobacion ? "Estimado enviado. El cliente lo aprueba en su cuenta antes de empezar." : "Estimado guardado." };
  } catch (e) { return falla(e); }
}

export async function registrarHorasAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const minutos = Math.round(num(form.get("horas")) * 60) + Math.round(num(form.get("minutos")) || 0);
  try {
    const e = await registrarHoras(u, { clientId: txt(form.get("clientId"), 60), ticketId: txt(form.get("ticket"), 60) || null, projectId: txt(form.get("projectId"), 60) || null, minutos, nota: txt(form.get("nota"), 500), fecha: txt(form.get("fecha"), 10) || null, facturable: form.get("facturable") !== "0", garantia: form.get("garantia") === "1" });
    const t = txt(form.get("ticket"), 60);
    if (t) revalidatePath(`/empresa/tickets/${t}`);
    refrescar(txt(form.get("clientId"), 60));
    return { ok: true, mensaje: e.billable ? `Registradas: se cobran ${Math.round(e.billedMinutes)} min = ${dinero(e.amount)}.` : "Registradas sin cobro (garantía o no facturable)." };
  } catch (e) { return falla(e); }
}

export async function marcarGarantiaAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const id = txt(form.get("ticket"), 60);
  const t = await prisma.ticket.findFirst({ where: { id, userId: u.id }, select: { id: true, isWarranty: true } });
  if (!t) return { error: "No encontré ese ticket." };
  await prisma.ticket.update({ where: { id }, data: { isWarranty: !t.isWarranty } });
  await prisma.timeEntry.updateMany({ where: { ticketId: id, invoiceId: null }, data: t.isWarranty ? {} : { billable: false, billedMinutes: 0, amount: 0 } });
  revalidatePath(`/empresa/tickets/${id}`);
  return { ok: true, mensaje: t.isWarranty ? "Ya no es garantía: las horas nuevas se cobran." : "Marcado como garantía: sus horas sin facturar quedan sin cobro." };
}

export async function sugerirGarantiaAction(ticketId: string): Promise<boolean> {
  const u = await getEmpresaUser();
  return sugerirGarantia(u, ticketId);
}

// ─── Dinero ───────────────────────────────────────────────────────────────────

export async function facturarHorasAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  let docId: string;
  try {
    const doc = await facturarHoras(u, txt(form.get("clientId"), 60));
    docId = doc.id;
  } catch (e) { return falla(e); }
  refrescar(txt(form.get("clientId"), 60), ["/empresa/facturas"]);
  // A la factura en borrador: se revisa y se envía desde ahí.
  redirect(`/empresa/facturas/${docId}`);
}

export async function registrarPagoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const metodo = txt(form.get("metodo"), 20) || "transferencia";
  if (!esUno(PAGO_METODOS, metodo)) return { error: "Método no válido." };
  const monto = num(form.get("monto"));
  if (!Number.isFinite(monto) || monto <= 0) return { error: "Escribe el monto." };
  try {
    await registrarPago(u, { clientId: txt(form.get("clientId"), 60), documentId: txt(form.get("documentId"), 60) || null, monto, fecha: txt(form.get("fecha"), 10) || new Date().toISOString().slice(0, 10), metodo, referencia: txt(form.get("referencia"), 120), nota: txt(form.get("nota"), 500) });
    refrescar(txt(form.get("clientId"), 60), ["/empresa/facturas", "/empresa/cuentas-por-cobrar"]);
    return { ok: true, mensaje: `Pago de ${dinero(monto)} registrado.` };
  } catch (e) { return falla(e); }
}

export async function decidirPagoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  try {
    await decidirPagoReportado(u, txt(form.get("pago"), 60), form.get("decision") === "confirmar", txt(form.get("nota"), 300));
    refrescar(txt(form.get("clientId"), 60), ["/empresa/facturas", "/empresa/cuentas-por-cobrar"]);
    return { ok: true };
  } catch (e) { return falla(e); }
}

// ─── Proyectos: tipo, fases y órdenes de cambio ─────────────────────────────

async function proyectoDe(userId: string, id: string) {
  return prisma.project.findFirst({ where: { id, userId }, select: { id: true, name: true, clientId: true, clients: { select: { clientId: true } } } });
}

export async function guardarFaseAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await proyectoDe(u.id, txt(form.get("projectId"), 60));
  if (!p) return { error: "No encontré ese proyecto." };
  const id = txt(form.get("id"), 60) || null;
  const datos = {
    name: txt(form.get("name"), 160),
    description: txt(form.get("description"), 4000) || null,
    price: num(form.get("price")) || 0,
    billingPoint: txt(form.get("billingPoint"), 20) || "al_entregar",
    estimatedDays: num(form.get("estimatedDays")) ? Math.round(num(form.get("estimatedDays"))) : null,
    githubMilestone: num(form.get("githubMilestone")) ? Math.round(num(form.get("githubMilestone"))) : null,
    reviewUrl: enlaceRevision(txt(form.get("reviewUrl"), 500)),
  };
  if (datos.reviewUrl === undefined) return { error: "El enlace de revisión debe empezar con https://" };
  if (!datos.name) return { error: "Escribe el nombre de la fase." };
  if (!esUno(FASE_COBRO, datos.billingPoint)) return { error: "Elige cuándo se cobra." };
  if (id) {
    const f = await prisma.projectPhase.findFirst({ where: { id, projectId: p.id }, select: { id: true } });
    if (!f) return { error: "No encontré esa fase." };
    await prisma.projectPhase.update({ where: { id }, data: { ...datos, progressSource: datos.githubMilestone ? "github" : "manual" } });
  } else {
    const ultima = await prisma.projectPhase.aggregate({ where: { projectId: p.id }, _max: { sortOrder: true } });
    await prisma.projectPhase.create({ data: { ...datos, projectId: p.id, sortOrder: (ultima._max.sortOrder ?? -1) + 1, progressSource: datos.githubMilestone ? "github" : "manual" } });
    // Proyecto con repo: la fase nueva nace con su marcador en GitHub y su avance se mueve solo.
    if (!datos.githubMilestone) {
      const repo = await prisma.project.findUnique({ where: { id: p.id }, select: { repoName: true } });
      if (repo?.repoName) {
        try {
          const { prepararMarcadores } = await import("@/lib/portal/github-marcadores");
          const r = await prepararMarcadores(p.id);
          revalidatePath(`/empresa/proyectos/${p.id}`);
          return { ok: true, mensaje: `Fase guardada con su marcador en GitHub (${r.tareas} tarea${r.tareas === 1 ? "" : "s"}).${r.avisos.length ? ` ${r.avisos.join(" ")}` : ""}` };
        } catch (e) {
          revalidatePath(`/empresa/proyectos/${p.id}`);
          return { ok: true, mensaje: `Fase guardada. No se pudo crear el marcador en GitHub: ${e instanceof Error ? e.message : "error"}` };
        }
      }
    }
  }
  revalidatePath(`/empresa/proyectos/${p.id}`);
  const cid = clientePrincipal(p); if (cid) revalidatePath(`/empresa/clientes/${cid}`);
  return { ok: true, mensaje: "Fase guardada." };
}

export async function avanceFaseAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const status = txt(form.get("status"), 20);
  if (status && !esUno(FASE_ESTADOS, status)) return { error: "Estado no válido." };
  try {
    await avanceDeFaseEvento(u, txt(form.get("faseId"), 60), { status: status || undefined, progress: form.get("progress") != null ? num(form.get("progress")) : undefined });
    revalidatePath(`/empresa/proyectos/${txt(form.get("projectId"), 60)}`);
    return { ok: true };
  } catch (e) { return falla(e); }
}

export async function borrarFaseAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const f = await prisma.projectPhase.findFirst({ where: { id: txt(form.get("faseId"), 60), project: { userId: u.id } }, select: { id: true, projectId: true, invoiceId: true } });
  if (!f) return { error: "No encontré esa fase." };
  if (f.invoiceId) return { error: "Esta fase ya está facturada; no se puede borrar." };
  await prisma.projectPhase.delete({ where: { id: f.id } });
  revalidatePath(`/empresa/proyectos/${f.projectId}`);
  return { ok: true };
}

export async function tipoProyectoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await proyectoDe(u.id, txt(form.get("projectId"), 60));
  const kind = txt(form.get("kind"), 20);
  if (!p || !esUno(PROYECTO_TIPOS, kind)) return { error: "Datos no válidos." };
  await prisma.project.update({ where: { id: p.id }, data: { kind, portalVisible: form.get("portalVisible") !== "0" } });
  revalidatePath(`/empresa/proyectos/${p.id}`);
  return { ok: true, mensaje: "Guardado." };
}

/** Factura una fase en borrador con su precio. */
export async function facturarFaseAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const f = await prisma.projectPhase.findFirst({ where: { id: txt(form.get("faseId"), 60), project: { userId: u.id } }, include: { project: { include: { clients: { select: { clientId: true } } } } } });
  if (!f) return { error: "No encontré esa fase." };
  if (f.invoiceId) return { error: "Esta fase ya tiene factura." };
  const clientId = clientePrincipal(f.project);
  if (!clientId) return { error: "El proyecto no tiene cliente." };
  const c = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const { siguienteNumero } = await import("@/lib/numeracion");
  const impuesto = Number(u.config?.taxRatePercent ?? 0) || 0;
  const subtotal = Number(f.price);
  const doc = await prisma.$transaction(async (tx) => {
    const number = await siguienteNumero(u.id, "FACTURA", u.config?.invoicePrefix ?? "FAC", tx);
    const d = await tx.document.create({ data: {
      type: "FACTURA", status: "DRAFT", userId: u.id, companyId: u.configId ?? undefined, clientId, projectId: f.projectId, number, title: `${f.project.name} · ${f.name}`,
      clientName: c.name, clientEmail: c.email, clientCompany: c.company, clientAddress: c.address, clientRuc: c.ruc,
      content: { currency: "USD", lineItems: [{ description: `${f.project.name}: fase ${f.name}`, quantity: 1, unitPrice: subtotal, taxPercent: impuesto, discount: 0 }] },
      subtotal, taxAmount: Math.round(subtotal * impuesto) / 100, total: subtotal + Math.round(subtotal * impuesto) / 100, currency: "USD",
      issueDate: new Date(), dueDate: new Date(Date.now() + (u.config?.paymentTermsDays ?? 15) * 86_400_000),
    } });
    await tx.projectPhase.update({ where: { id: f.id }, data: { invoiceId: d.id } });
    return d;
  });
  await registrarEvento({ userId: u.id, clientId, projectId: f.projectId, entityType: "factura", entityId: doc.id, kind: "factura_fase", title: `Factura ${doc.number} de la fase ${f.name} en borrador`, visibility: "interno", actorEmpresaUserId: u.id });
  revalidatePath(`/empresa/proyectos/${f.projectId}`);
  return { ok: true, mensaje: `Factura ${doc.number} creada en borrador.`, enlace: `/empresa/facturas/${doc.id}` };
}

export async function guardarOrdenAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await proyectoDe(u.id, txt(form.get("projectId"), 60));
  if (!p) return { error: "No encontré ese proyecto." };
  const clientId = clientePrincipal(p);
  if (!clientId) return { error: "El proyecto no tiene cliente." };
  const titulo = txt(form.get("titulo"), 200);
  const descripcion = txt(form.get("descripcion"), 6000) || null;
  let fases: { name: string; price: number; billingPoint: string; estimatedDays: number | null; description: string | null }[] = [];
  try { fases = JSON.parse(String(form.get("fases") ?? "[]")); } catch { fases = []; }
  fases = fases.filter((f) => f && String(f.name ?? "").trim()).map((f) => ({ name: String(f.name).trim().slice(0, 160), description: f.description ? String(f.description).slice(0, 2000) : null, price: Number(f.price) || 0, billingPoint: esUno(FASE_COBRO, f.billingPoint) ? f.billingPoint : "al_entregar", estimatedDays: Number(f.estimatedDays) ? Math.round(Number(f.estimatedDays)) : null }));
  if (!titulo) return { error: "Escribe qué cambia en una línea." };
  if (!fases.length) return { error: "Agrega al menos una fase con su precio." };
  const enviar = form.get("enviar") === "1";
  const total = fases.reduce((a, f) => a + f.price, 0);
  const ticketId = txt(form.get("ticketId"), 60) || null;
  const o = await prisma.changeOrder.create({
    data: { userId: u.id, projectId: p.id, clientId, ticketId, title: titulo, description: descripcion, total, status: enviar ? "enviada" : "borrador", sentAt: enviar ? new Date() : null,
      phases: { create: fases.map((f, i) => ({ ...f, projectId: p.id, sortOrder: 1000 + i })) } },
  });
  let avisada = false;
  if (enviar) {
    await registrarEvento({ userId: u.id, clientId, projectId: p.id, entityType: "orden_de_cambio", entityId: o.id, kind: "orden_enviada", title: `Te enviamos la orden de cambio ${o.number}: ${titulo}`, detail: `Total ${dinero(total)}. Espera tu decisión.`, visibility: "cliente", actorEmpresaUserId: u.id });
    const personas = await prisma.clientUser.findMany({ where: { clientId, status: "activo" }, select: { email: true } });
    if (personas.length) {
      const { getPortalTicketUpdateEmail } = await import("@/lib/email-templates");
      const c = getPortalTicketUpdateEmail({ number: o.number, title: titulo, status: "Espera tu aprobación", message: `${descripcion ?? ""}\n\nTotal: ${dinero(total)}`.trim(), link: `${getSiteUrl()}/cliente/cambios/${o.id}` });
      await enviarAlCliente({ to: personas.map((x) => x.email), subject: `Orden de cambio ${o.number} · ${titulo}`, html: c.html, motivo: `orden ${o.number}` }).then((r) => { avisada = r.enviado; }).catch((e) => console.error("[orden] correo", e));
    }
  }
  revalidatePath(`/empresa/proyectos/${p.id}`);
  refrescar(clientId);
  return { ok: true, mensaje: enviar ? `Orden ${o.number} publicada en la cuenta del cliente${avisada ? " y avisada por correo" : " (sin correo: el cliente todavía no tiene cuenta activa o el envío falló)"}.` : `Orden ${o.number} guardada en borrador.` };
}

export async function enviarOrdenAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const o = await prisma.changeOrder.findFirst({ where: { id: txt(form.get("ordenId"), 60), userId: u.id, status: "borrador" } });
  if (!o) return { error: "Esa orden ya no está en borrador." };
  await prisma.changeOrder.update({ where: { id: o.id }, data: { status: "enviada", sentAt: new Date() } });
  await registrarEvento({ userId: u.id, clientId: o.clientId, projectId: o.projectId, entityType: "orden_de_cambio", entityId: o.id, kind: "orden_enviada", title: `Te enviamos la orden de cambio ${o.number}: ${o.title}`, detail: `Total ${dinero(o.total)}. Espera tu decisión.`, visibility: "cliente", actorEmpresaUserId: u.id });
  revalidatePath(`/empresa/proyectos/${o.projectId}`);
  return { ok: true, mensaje: "Enviada al cliente." };
}

/** Crea en GitHub el marcador (milestone + tareas) de cada fase que no lo tiene y el webhook del repo. */
export async function marcadoresGithubAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await proyectoDe(u.id, txt(form.get("projectId"), 60));
  if (!p) return { error: "No encontré ese proyecto." };
  try {
    const { prepararMarcadores } = await import("@/lib/portal/github-marcadores");
    const r = await prepararMarcadores(p.id);
    const { sincronizarProyecto } = await import("@/lib/portal/github-avance");
    await sincronizarProyecto(p.id).catch(() => null);
    revalidatePath(`/empresa/proyectos/${p.id}`);
    const base = r.fases ? `Listo: ${r.fases} fase(s) con marcador y ${r.tareas} tarea(s) en GitHub.` : "Todas las fases ya tenían su marcador en GitHub.";
    const hook = r.webhook === "nuevo" ? " Webhook creado: el avance se mueve al cerrar cada tarea." : r.webhook === "ya_estaba" ? " El webhook ya estaba puesto." : "";
    return { ok: true, mensaje: `${base}${hook}${r.avisos.length ? ` ${r.avisos.join(" ")}` : ""}` };
  } catch (e) { return falla(e); }
}

export async function sincronizarGithubAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await proyectoDe(u.id, txt(form.get("projectId"), 60));
  if (!p) return { error: "No encontré ese proyecto." };
  try {
    const { sincronizarProyecto } = await import("@/lib/portal/github-avance");
    const r = await sincronizarProyecto(p.id);
    revalidatePath(`/empresa/proyectos/${p.id}`);
    return { ok: true, mensaje: r.fases ? `Sincronizado: ${r.fases} fase(s), ${r.issues} tarea(s) nueva(s) contadas al cliente.` : "Ninguna fase tiene marcador de GitHub. Usa «Crear marcadores en GitHub»." };
  } catch (e) { return falla(e); }
}
