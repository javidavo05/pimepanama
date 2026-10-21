"use server";

/**
 * Ficha 360 del cliente (CRM fases 1 y 2): contactos, conversaciones y notas, archivar y restaurar,
 * campos propios y la historia unificada con «cargar más». Todo filtra por el dueño (`u.id`); el autor
 * de una conversación es quien entró (`u.miembro.id`).
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer } from "@/lib/auth/permisos";
import { registrarEvento } from "@/lib/portal/eventos";
import { ROLES_CONTACTO, TIPOS_CAMPO, claveDeCampo } from "@/lib/crm/ficha";
import { TIPOS_INTERACCION, historiaDelCliente, historiaDelLead, tiposValidos, type PaginaHistoria } from "@/lib/crm/historia";

export type EstadoCrm = { ok?: boolean; error?: string; mensaje?: string } | null;

const txt = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);
const esUno = <T extends string>(lista: readonly T[], v: string): v is T => (lista as readonly string[]).includes(v);

async function clienteDe(userId: string, clientId: string) {
  return prisma.client.findFirst({ where: { id: clientId, userId }, select: { id: true, name: true, company: true, archivedAt: true } });
}

function refrescar(clientId: string) {
  revalidatePath(`/empresa/clientes/${clientId}`);
}

// ─── Contactos ───────────────────────────────────────────────────────────────

export async function guardarContactoAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  const clientId = txt(form.get("clientId"), 60);
  const c = await clienteDe(u.id, clientId);
  if (!c) return { error: "No encontré ese cliente." };
  const id = txt(form.get("id"), 60) || null;
  const rol = txt(form.get("rol"), 20) || "otro";
  const datos = {
    nombre: txt(form.get("nombre"), 160),
    cargo: txt(form.get("cargo"), 120) || null,
    email: txt(form.get("email"), 160).toLowerCase() || null,
    telefono: txt(form.get("telefono"), 60) || null,
    rol: esUno(ROLES_CONTACTO, rol) ? rol : "otro",
  };
  if (!datos.nombre) return { error: "Escribe el nombre del contacto." };
  if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return { error: "El correo no parece válido. Revísalo o déjalo vacío." };
  const principal = form.get("principal") === "1";
  try {
    if (id) {
      const k = await prisma.contacto.findFirst({ where: { id, userId: u.id, clientId }, select: { id: true } });
      if (!k) return { error: "No encontré ese contacto." };
      await prisma.$transaction([
        ...(principal ? [prisma.contacto.updateMany({ where: { clientId, userId: u.id, NOT: { id } }, data: { principal: false } })] : []),
        prisma.contacto.update({ where: { id }, data: { ...datos, ...(principal && { principal: true }) } }),
      ]);
    } else {
      // El primero de la empresa nace principal.
      const hay = await prisma.contacto.count({ where: { clientId, userId: u.id } });
      const esPrincipal = principal || hay === 0;
      await prisma.$transaction([
        ...(esPrincipal ? [prisma.contacto.updateMany({ where: { clientId, userId: u.id }, data: { principal: false } })] : []),
        prisma.contacto.create({ data: { ...datos, userId: u.id, clientId, principal: esPrincipal } }),
      ]);
    }
  } catch (e) {
    console.error("[crm] contacto", e);
    return { error: "No se pudo guardar el contacto. Intenta de nuevo." };
  }
  refrescar(clientId);
  return { ok: true, mensaje: id ? "Contacto actualizado." : `${datos.nombre} quedó en los contactos.` };
}

export async function borrarContactoAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  const k = await prisma.contacto.findFirst({ where: { id: txt(form.get("id"), 60), userId: u.id }, select: { id: true, clientId: true, nombre: true, principal: true } });
  if (!k) return { error: "No encontré ese contacto." };
  await prisma.contacto.delete({ where: { id: k.id } });
  // Si era el principal, pasa a serlo el más antiguo que quede.
  if (k.principal) {
    const otro = await prisma.contacto.findFirst({ where: { clientId: k.clientId, userId: u.id }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (otro) await prisma.contacto.update({ where: { id: otro.id }, data: { principal: true } });
  }
  refrescar(k.clientId);
  return { ok: true, mensaje: `Borramos a ${k.nombre}. Sus conversaciones siguen en la historia.` };
}

export async function marcarPrincipalAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  const k = await prisma.contacto.findFirst({ where: { id: txt(form.get("id"), 60), userId: u.id }, select: { id: true, clientId: true, nombre: true } });
  if (!k) return { error: "No encontré ese contacto." };
  await prisma.$transaction([
    prisma.contacto.updateMany({ where: { clientId: k.clientId, userId: u.id }, data: { principal: false } }),
    prisma.contacto.update({ where: { id: k.id }, data: { principal: true } }),
  ]);
  refrescar(k.clientId);
  return { ok: true, mensaje: `${k.nombre} es ahora el contacto principal.` };
}

// ─── Conversaciones y notas ──────────────────────────────────────────────────

/** «2026-10-16T14:30» en hora de Panamá (UTC-5, sin horario de verano) → Date. */
function fechaHoraPanama(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function diaPanama(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function registrarInteraccionAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  // Con cliente o con lead (la comunicación del lead usa el mismo formulario).
  const clientId = txt(form.get("clientId"), 60);
  const c = clientId ? await clienteDe(u.id, clientId) : null;
  const lead = clientId ? null : await prisma.lead.findFirst({ where: { id: txt(form.get("leadId"), 60), userId: u.id }, select: { id: true, name: true, company: true } });
  if (!c && !lead) return { error: clientId ? "No encontré ese cliente." : "No encontré ese lead." };
  const quien = c ? c.company || c.name : lead!.company || lead!.name;
  const tipo = txt(form.get("tipo"), 20);
  if (!esUno(TIPOS_INTERACCION, tipo)) return { error: "Elige qué fue: llamada, WhatsApp, visita, nota, correo o reunión." };
  const resumen = txt(form.get("resumen"), 4000);
  if (!resumen) return { error: tipo === "nota" ? "Escribe la nota." : "Escribe de qué hablaron, aunque sea en una línea." };
  const direccionPedida = txt(form.get("direccion"), 20);
  const direccion = (tipo === "llamada" || tipo === "whatsapp") && (direccionPedida === "entrante" || direccionPedida === "saliente") ? direccionPedida : null;
  const duracion = tipo === "llamada" ? Math.round(Number(txt(form.get("duracionMin"), 6))) : NaN;
  const ocurrio = fechaHoraPanama(txt(form.get("ocurrioAt"), 20)) ?? new Date();
  if (ocurrio.getTime() > Date.now() + 10 * 60_000) return { error: "La fecha está en el futuro. Si es algo por hacer, ponlo como próximo paso." };
  const proximoPaso = txt(form.get("proximoPaso"), 300) || null;
  const fechaPaso = diaPanama(txt(form.get("proximoPasoFecha"), 10));
  if (fechaPaso && !proximoPaso) return { error: "Escribe cuál es el próximo paso para esa fecha." };
  let contactoId = txt(form.get("contactoId"), 60) || null;
  if (contactoId && c) {
    const k = await prisma.contacto.findFirst({ where: { id: contactoId, clientId, userId: u.id }, select: { id: true } });
    contactoId = k?.id ?? null;
  } else contactoId = null;
  const esContacto = tipo !== "nota";
  try {
    await prisma.$transaction([
      prisma.interaccion.create({
        data: {
          userId: u.id, clientId: c?.id ?? null, leadId: lead?.id ?? null, contactoId, autorId: u.miembro.id, tipo, direccion, resumen,
          resultado: txt(form.get("resultado"), 300) || null,
          duracionMin: Number.isFinite(duracion) && duracion > 0 ? Math.min(duracion, 1440) : null,
          proximoPaso, ocurrioAt: ocurrio, fijada: form.get("fijada") === "1",
        },
      }),
      // Una nota no es contacto con el cliente: no mueve «último contacto».
      ...(esContacto && c
        ? [prisma.client.updateMany({ where: { id: c.id, userId: u.id, OR: [{ ultimoContactoAt: null }, { ultimoContactoAt: { lt: ocurrio } }] }, data: { ultimoContactoAt: ocurrio } })]
        : []),
      // Un lead NUEVO con el que ya se habló queda CONTACTADO.
      ...(esContacto && lead ? [prisma.lead.updateMany({ where: { id: lead.id, userId: u.id, status: "NUEVO" }, data: { status: "CONTACTADO" } })] : []),
      ...(proximoPaso && fechaPaso
        ? [prisma.task.create({ data: { userId: u.id, clientId: c?.id ?? null, leadId: lead?.id ?? null, responsableId: u.miembro.id, title: proximoPaso, description: `${quien}: ${resumen.slice(0, 500)}`, dueDate: fechaPaso, allDay: true } })]
        : []),
    ]);
  } catch (e) {
    console.error("[crm] interaccion", e);
    return { error: "No se pudo guardar. Intenta de nuevo." };
  }
  if (c) refrescar(c.id);
  else revalidatePath(`/empresa/leads/${lead!.id}`);
  revalidatePath("/empresa/tareas");
  const queda = tipo === "nota" ? "Nota guardada." : "Conversación registrada.";
  return { ok: true, mensaje: proximoPaso && fechaPaso ? `${queda} El próximo paso quedó en tus tareas.` : queda };
}

export async function fijarInteraccionAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  const i = await prisma.interaccion.findFirst({ where: { id: txt(form.get("id"), 60), userId: u.id }, select: { id: true, clientId: true, leadId: true, fijada: true } });
  if (!i) return { error: "No encontré esa nota." };
  await prisma.interaccion.update({ where: { id: i.id }, data: { fijada: !i.fijada } });
  if (i.clientId) refrescar(i.clientId);
  if (i.leadId) revalidatePath(`/empresa/leads/${i.leadId}`);
  return { ok: true, mensaje: i.fijada ? "Ya no está fijada." : "Fijada arriba de la historia." };
}

export async function borrarInteraccionAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  const i = await prisma.interaccion.findFirst({ where: { id: txt(form.get("id"), 60), userId: u.id }, select: { id: true, clientId: true, leadId: true, autorId: true } });
  if (!i) return { error: "No encontré esa nota." };
  // Solo quien la escribió o el dueño.
  if (i.autorId && i.autorId !== u.miembro.id && !u.miembro.esDueno) return { error: "Solo quien la escribió o el dueño puede borrarla." };
  await prisma.interaccion.delete({ where: { id: i.id } });
  if (i.clientId) refrescar(i.clientId);
  if (i.leadId) revalidatePath(`/empresa/leads/${i.leadId}`);
  return { ok: true, mensaje: "Borrada." };
}

// ─── Archivar y restaurar ────────────────────────────────────────────────────

export async function archivarClienteAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  const c = await clienteDe(u.id, txt(form.get("clientId"), 60));
  if (!c) return { error: "No encontré ese cliente." };
  const archivar = form.get("archivar") === "1";
  await prisma.client.update({ where: { id: c.id }, data: { archivedAt: archivar ? new Date() : null } });
  await registrarEvento({ userId: u.id, clientId: c.id, entityType: "cliente", entityId: c.id, kind: archivar ? "cliente_archivado" : "cliente_restaurado", title: archivar ? "Cliente archivado" : "Cliente restaurado", visibility: "interno", actorEmpresaUserId: u.miembro.id });
  refrescar(c.id);
  revalidatePath("/empresa/clientes");
  revalidatePath("/empresa/clientes/archivados");
  return { ok: true, mensaje: archivar ? "Archivado: ya no sale en la lista de clientes. Su historia se conserva." : "Restaurado: vuelve a la lista de clientes." };
}

// ─── Campos propios ──────────────────────────────────────────────────────────

export async function guardarCampoAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  if (!puedeVer(u.miembro.area, "empresa")) return { error: "Solo el dueño define los campos propios." };
  const id = txt(form.get("id"), 60) || null;
  const etiqueta = txt(form.get("etiqueta"), 60);
  const tipo = txt(form.get("tipo"), 20);
  if (!etiqueta) return { error: "Escribe el nombre del campo." };
  if (!esUno(TIPOS_CAMPO, tipo)) return { error: "Elige el tipo de dato." };
  const opciones = tipo === "opcion" ? [...new Set(txt(form.get("opciones"), 2000).split(/[\n,]/).map((x) => x.trim().slice(0, 60)).filter(Boolean))].slice(0, 30) : [];
  if (tipo === "opcion" && opciones.length < 2) return { error: "Escribe al menos dos opciones, separadas por coma." };
  try {
    if (id) {
      const k = await prisma.campoPersonalizado.findFirst({ where: { id, userId: u.id }, select: { id: true } });
      if (!k) return { error: "No encontré ese campo." };
      // La clave no cambia: así los valores ya guardados siguen apuntando al mismo campo.
      await prisma.campoPersonalizado.update({ where: { id }, data: { etiqueta, tipo, opciones } });
    } else {
      const clave = claveDeCampo(etiqueta);
      const ya = await prisma.campoPersonalizado.findFirst({ where: { userId: u.id, entidad: "cliente", clave }, select: { id: true } });
      if (ya) return { error: "Ya hay un campo con ese nombre." };
      const ultimo = await prisma.campoPersonalizado.aggregate({ where: { userId: u.id, entidad: "cliente" }, _max: { orden: true } });
      await prisma.campoPersonalizado.create({ data: { userId: u.id, entidad: "cliente", clave, etiqueta, tipo, opciones, orden: (ultimo._max.orden ?? -1) + 1 } });
    }
  } catch (e) {
    console.error("[crm] campo", e);
    return { error: "No se pudo guardar el campo. Intenta de nuevo." };
  }
  revalidatePath("/empresa/configuracion/campos");
  return { ok: true, mensaje: id ? "Campo actualizado." : `Listo: «${etiqueta}» ya sale al editar cada cliente.` };
}

export async function borrarCampoAction(_: EstadoCrm, form: FormData): Promise<EstadoCrm> {
  const u = await getEmpresaUser();
  if (!puedeVer(u.miembro.area, "empresa")) return { error: "Solo el dueño define los campos propios." };
  const k = await prisma.campoPersonalizado.findFirst({ where: { id: txt(form.get("id"), 60), userId: u.id }, select: { id: true, etiqueta: true } });
  if (!k) return { error: "No encontré ese campo." };
  await prisma.campoPersonalizado.delete({ where: { id: k.id } });
  revalidatePath("/empresa/configuracion/campos");
  return { ok: true, mensaje: `Quitamos «${k.etiqueta}». Lo ya escrito en cada cliente no se borra, solo deja de mostrarse.` };
}

// ─── Historia: cargar más y filtrar ──────────────────────────────────────────

export async function cargarHistoriaAction(clientId: string, antes: string | null, tipos: string[]): Promise<PaginaHistoria | { error: string }> {
  const u = await getEmpresaUser();
  const c = await clienteDe(u.id, String(clientId).slice(0, 60));
  if (!c) return { error: "No encontré ese cliente." };
  try {
    return await historiaDelCliente(u.id, c.id, { antes, tipos: tiposValidos(tipos) });
  } catch (e) {
    console.error("[crm] historia", e);
    return { error: "No se pudo cargar la historia. Intenta de nuevo." };
  }
}

export async function cargarHistoriaLeadAction(leadId: string, antes: string | null, tipos: string[]): Promise<PaginaHistoria | { error: string }> {
  const u = await getEmpresaUser();
  const l = await prisma.lead.findFirst({ where: { id: String(leadId).slice(0, 60), userId: u.id }, select: { id: true } });
  if (!l) return { error: "No encontré ese lead." };
  try {
    return await historiaDelLead(u.id, l.id, { antes, tipos: tiposValidos(tipos) });
  } catch (e) {
    console.error("[crm] comunicación del lead", e);
    return { error: "No se pudo cargar la comunicación. Intenta de nuevo." };
  }
}
