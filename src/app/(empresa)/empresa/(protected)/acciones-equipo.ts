"use server";

/**
 * Equipo de la empresa (fase 0 del plan CRM): invitar por correo con un área, cambiar el área, desactivar y
 * volver a activar. Solo el dueño. El invitado entra con su propio correo (crea su contraseña con el enlace) y,
 * al entrar por primera vez, queda como miembro con los datos de la empresa (src/lib/auth/equipo.ts).
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { areaValida, AREA_LABEL } from "@/lib/auth/permisos";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { enviarAlCliente } from "@/lib/motor/envios";
import { getSiteUrl } from "@/lib/site-url";

export type EstadoEquipo = { ok?: boolean; error?: string; mensaje?: string; enlace?: string } | null;
const txt = (v: FormDataEntryValue | null, max = 160) => String(v ?? "").trim().slice(0, max);
const correoValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

async function soloDueno() {
  const u = await getEmpresaUser();
  if (!u.miembro.esDueno) throw new Error("Solo el dueño administra el equipo.");
  return u;
}

/** Enlace para que el invitado cree su contraseña en /empresa/crear-clave. Si ya tiene cuenta, uno de recuperación. */
async function enlaceDeAcceso(email: string): Promise<string | null> {
  const base = `${getSiteUrl()}/empresa/crear-clave`;
  const inv = await supabaseAdmin().auth.admin.generateLink({ type: "invite", email });
  const thInv = inv.data?.properties?.hashed_token;
  if (!inv.error && thInv) return `${base}?th=${encodeURIComponent(thInv)}&t=invite`;
  const rec = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
  const thRec = rec.data?.properties?.hashed_token;
  return thRec ? `${base}?th=${encodeURIComponent(thRec)}&t=recovery` : null;
}
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function invitarMiembroAction(_: EstadoEquipo, form: FormData): Promise<EstadoEquipo> {
  const u = await soloDueno();
  const email = txt(form.get("email")).toLowerCase();
  const fullName = txt(form.get("fullName"), 120) || null;
  const area = txt(form.get("area"), 20);
  if (!correoValido(email)) return { error: "Escribe un correo válido." };
  if (!areaValida(area) || area === "dueno") return { error: "Elige el área: Ventas, Proyectos o Finanzas." };
  const yaEquipo = await prisma.empresaUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (yaEquipo) return { error: "Ese correo ya es del equipo." };
  const esCliente = await prisma.clientUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (esCliente) return { error: "Ese correo es de la cuenta de un cliente. Usa otro correo para el equipo." };

  await prisma.empresaInvite.upsert({
    where: { email },
    create: { ownerId: u.id, email, fullName, area },
    update: { ownerId: u.id, fullName, area, acceptedAt: null, revokedAt: null, createdAt: new Date() },
  });
  const enlace = await enlaceDeAcceso(email);
  if (!enlace) return { error: "La invitación quedó guardada, pero no pude generar el enlace de acceso. Inténtalo de nuevo." };

  const empresa = u.config?.name ?? "Pime";
  const html = `<p>Hola${fullName ? ` ${esc(fullName)}` : ""}:</p><p>${esc(u.miembro.fullName ?? empresa)} te invitó al equipo de ${esc(empresa)} en Pime Suite, en el área de <b>${AREA_LABEL[area]}</b>.</p><p><a href="${enlace}">Crear mi contraseña y entrar</a></p><p>Después te pedirá activar la doble verificación (app o huella).</p>`;
  let enviado = false;
  try { enviado = (await enviarAlCliente({ to: email, subject: `Te invitaron al equipo de ${empresa}`, html, motivo: "invitación al equipo" })).enviado; } catch (e) { console.error("[equipo] invitación", e); }
  revalidatePath("/empresa/configuracion");
  return enviado
    ? { ok: true, mensaje: `Invitación enviada a ${email}.` }
    : { ok: true, mensaje: "La invitación quedó lista, pero el correo no salió. Comparte este enlace con la persona:", enlace };
}

export async function cambiarAreaAction(_: EstadoEquipo, form: FormData): Promise<EstadoEquipo> {
  const u = await soloDueno();
  const area = txt(form.get("area"), 20);
  if (!areaValida(area) || area === "dueno") return { error: "Elige Ventas, Proyectos o Finanzas." };
  const id = txt(form.get("id"), 60);
  const r = await prisma.empresaUser.updateMany({ where: { id, ownerId: u.id }, data: { area } });
  if (!r.count) {
    const inv = await prisma.empresaInvite.updateMany({ where: { id, ownerId: u.id }, data: { area } });
    if (!inv.count) return { error: "No encontré a esa persona." };
  }
  revalidatePath("/empresa/configuracion");
  return { ok: true, mensaje: `Ahora es de ${AREA_LABEL[area]}.` };
}

export async function activarMiembroAction(form: FormData): Promise<void> {
  const u = await soloDueno();
  const id = txt(form.get("id"), 60);
  const m = await prisma.empresaUser.findFirst({ where: { id, ownerId: u.id }, select: { id: true, activo: true } });
  if (m) await prisma.empresaUser.update({ where: { id: m.id }, data: { activo: !m.activo } });
  revalidatePath("/empresa/configuracion");
}

export async function anularInvitacionAction(form: FormData): Promise<void> {
  const u = await soloDueno();
  await prisma.empresaInvite.updateMany({ where: { id: txt(form.get("id"), 60), ownerId: u.id, acceptedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/empresa/configuracion");
}

/** Responsable de un cliente o de un lead: un miembro activo del equipo (o el dueño), o nadie. */
export async function asignarResponsableAction(_: EstadoEquipo, form: FormData): Promise<EstadoEquipo> {
  const u = await getEmpresaUser();
  const tipo = txt(form.get("tipo"), 10);
  const id = txt(form.get("id"), 60);
  const responsableId = txt(form.get("responsableId"), 60) || null;
  if (responsableId && responsableId !== u.id) {
    const ok = await prisma.empresaUser.findFirst({ where: { id: responsableId, ownerId: u.id, activo: true }, select: { id: true } });
    if (!ok) return { error: "Esa persona no es del equipo." };
  }
  if (tipo === "cliente") {
    const r = await prisma.client.updateMany({ where: { id, userId: u.id }, data: { responsableId } });
    if (!r.count) return { error: "No encontré ese cliente." };
    revalidatePath(`/empresa/clientes/${id}`);
    revalidatePath("/empresa/clientes");
  } else if (tipo === "lead") {
    const r = await prisma.lead.updateMany({ where: { id, userId: u.id }, data: { responsableId } });
    if (!r.count) return { error: "No encontré ese lead." };
    revalidatePath(`/empresa/leads/${id}`);
    revalidatePath("/empresa/leads");
  } else return { error: "Tipo inválido." };
  return { ok: true, mensaje: responsableId ? "Responsable asignado." : "Sin responsable." };
}
