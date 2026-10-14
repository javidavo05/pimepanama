/**
 * Invitaciones y recuperación de contraseña de la cuenta del cliente. Igual que en el portal de
 * B&B: el token viaja una sola vez en el enlace y en la base solo queda su SHA-256; vence en 7 días.
 * Los correos salen por Resend con la plantilla de la marca (no la de Supabase).
 */
import { enviarAlCliente } from "@/lib/motor/envios";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { getPortalInvitationEmail, getPortalPasswordResetEmail } from "@/lib/email-templates";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { registrarEvento } from "./eventos";

const DIAS_INVITACION = 7;
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const correoValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** errorEnvio: por qué no salió el correo (lo que respondió Resend); la invitación queda creada igual. */
export type ResultadoInvitacion = { ok: true; enlace: string; enviado: boolean; errorEnvio?: string; clientUserId: string } | { ok: false; error: string };

/** Invita (o vuelve a invitar) a una persona del cliente. Deja sin efecto las invitaciones anteriores. */
export async function invitarPersona(opts: {
  empresaUserId: string;
  clientId: string;
  email: string;
  fullName?: string | null;
  role?: "principal" | "miembro";
  invitadoPor?: string | null;
  invitadoPorClientUserId?: string | null;
}): Promise<ResultadoInvitacion> {
  const email = opts.email.trim().toLowerCase();
  if (!correoValido(email)) return { ok: false, error: "Escribe un correo válido." };
  const client = await prisma.client.findFirst({ where: { id: opts.clientId, userId: opts.empresaUserId }, select: { id: true, name: true, company: true, internal: true } });
  if (!client) return { ok: false, error: "No encontré ese cliente." };
  // La empresa interna somos nosotros: no tiene cuenta de cliente ni recibe correos.
  if (client.internal) return { ok: false, error: "Es la empresa interna: no lleva cuenta de cliente." };
  const equipo = await prisma.empresaUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (equipo) return { ok: false, error: "Ese correo es de una cuenta del equipo Pime. Usa otro correo para el cliente." };

  const existente = await prisma.clientUser.findFirst({ where: { clientId: client.id, email: { equals: email, mode: "insensitive" } } });
  const persona = existente
    ? await prisma.clientUser.update({
        where: { id: existente.id },
        data: {
          fullName: opts.fullName?.trim() || existente.fullName,
          role: opts.role ?? existente.role,
          status: existente.status === "activo" ? "activo" : "invitado",
          revokedAt: null,
          invitedAt: new Date(),
        },
      })
    : await prisma.clientUser.create({
        data: { userId: opts.empresaUserId, clientId: client.id, email, fullName: opts.fullName?.trim() || null, role: opts.role ?? "principal", status: "invitado", invitedAt: new Date() },
      });

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.clientInvitation.updateMany({ where: { clientUserId: persona.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.clientInvitation.create({
      data: { clientUserId: persona.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + DIAS_INVITACION * 86_400_000), createdByEmpresaUserId: opts.invitadoPorClientUserId ? null : opts.empresaUserId },
    }),
    prisma.client.update({ where: { id: client.id }, data: { portalEnabled: true } }),
  ]);

  const enlace = `${getSiteUrl()}/cliente/activar?token=${token}`;
  let enviado = false;
  let errorEnvio: string | undefined;
  try {
    const correo = getPortalInvitationEmail({ name: persona.fullName, company: client.company || client.name, link: enlace, invitedBy: opts.invitadoPor });
    const r = await enviarAlCliente({ to: email, subject: correo.subject, html: correo.html, motivo: `invitación ${email}` });
    enviado = r.enviado;
  } catch (e) {
    console.error("[portal] invitación sin enviar", e);
    errorEnvio = e instanceof Error ? e.message : "error desconocido";
  }
  await registrarEvento({
    userId: opts.empresaUserId, clientId: client.id, entityType: "cuenta", entityId: persona.id, kind: "invitacion",
    title: `Invitación a ${email}${enviado ? "" : ` (el correo falló: ${errorEnvio ?? "sin detalle"})`}`, visibility: "interno",
    actorType: opts.invitadoPorClientUserId ? "cliente" : "pime", actorClientUserId: opts.invitadoPorClientUserId ?? null,
  });
  return { ok: true, enlace, enviado, errorEnvio, clientUserId: persona.id };
}

export type InvitacionValida = { invitacionId: string; persona: { id: string; email: string; fullName: string | null; status: string }; cliente: { id: string; name: string; company: string | null; brandLine: string } };

export async function validarInvitacion(token: string | null | undefined): Promise<{ ok: true; data: InvitacionValida } | { ok: false; error: string }> {
  if (!token || token.length < 20) return { ok: false, error: "El enlace está incompleto. Ábrelo desde el correo." };
  const inv = await prisma.clientInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { clientUser: { include: { client: { select: { id: true, name: true, company: true, brandLine: true, archivedAt: true } } } } },
  });
  if (!inv) return { ok: false, error: "Este enlace no es válido. Pide uno nuevo a Pime." };
  if (inv.usedAt) return { ok: false, error: "Este enlace ya se usó. Si ya creaste tu contraseña, entra con tu correo." };
  if (inv.expiresAt.getTime() < Date.now()) return { ok: false, error: "Este enlace venció. Pide a Pime que te envíe uno nuevo." };
  if (inv.clientUser.status === "revocado" || inv.clientUser.client.archivedAt) return { ok: false, error: "Esta cuenta está desactivada. Escríbele a Pime." };
  const { clientUser: p } = inv;
  return { ok: true, data: { invitacionId: inv.id, persona: { id: p.id, email: p.email, fullName: p.fullName, status: p.status }, cliente: p.client } };
}

/** Crea la cuenta de Supabase (o la vincula si ya existe) y deja a la persona activa. */
export async function activarPersona(token: string, fullName: string, password: string): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (password.length < 10) return { ok: false, error: "La contraseña necesita al menos 10 caracteres." };
  const v = await validarInvitacion(token);
  if (!v.ok) return v;
  const { persona, invitacionId } = v.data;
  const admin = supabaseAdmin();

  const otra = await prisma.clientUser.findFirst({ where: { email: { equals: persona.email, mode: "insensitive" }, supabaseUid: { not: null }, NOT: { id: persona.id } }, select: { supabaseUid: true } });
  let uid = otra?.supabaseUid ?? null;
  if (uid) {
    // La misma persona ya tiene cuenta en otro cliente: se usa la misma (un correo, una contraseña).
    const { error } = await admin.auth.admin.updateUserById(uid, { password });
    if (error) return { ok: false, error: "No se pudo guardar la contraseña. Inténtalo de nuevo." };
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: persona.email, password, email_confirm: true, user_metadata: { full_name: fullName, cuenta: "cliente" } });
    if (error || !data.user) {
      return { ok: false, error: /registered|exists/i.test(error?.message ?? "") ? "Ese correo ya tiene una cuenta. Entra con tu contraseña o usa «Olvidé mi contraseña»." : "No se pudo crear la cuenta. Inténtalo de nuevo." };
    }
    uid = data.user.id;
  }

  await prisma.$transaction([
    prisma.clientUser.update({ where: { id: persona.id }, data: { supabaseUid: uid, status: "activo", activatedAt: new Date(), fullName: fullName.trim() || persona.fullName } }),
    prisma.clientInvitation.update({ where: { id: invitacionId }, data: { usedAt: new Date() } }),
  ]);
  const p = await prisma.clientUser.findUnique({ where: { id: persona.id }, select: { userId: true, clientId: true } });
  if (p) await registrarEvento({ userId: p.userId, clientId: p.clientId, entityType: "cuenta", entityId: persona.id, kind: "cuenta_activada", title: `${fullName || persona.email} activó su cuenta`, visibility: "interno", actorType: "cliente", actorClientUserId: persona.id });
  return { ok: true, email: persona.email };
}

/** «Olvidé mi contraseña» (desde afuera) o «restablecer acceso» (desde la ficha). Nunca dice si el correo existe. */
export async function enviarRecuperacion(emailCrudo: string): Promise<void> {
  const email = emailCrudo.trim().toLowerCase();
  if (!correoValido(email)) return;
  const persona = await prisma.clientUser.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: "activo", supabaseUid: { not: null } } });
  if (!persona) return;
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "recovery", email });
  const th = data?.properties?.hashed_token;
  if (error || !th) { console.error("[portal] recuperación", error); return; }
  const correo = getPortalPasswordResetEmail({ name: persona.fullName, link: `${getSiteUrl()}/cliente/nueva-clave?th=${encodeURIComponent(th)}` });
  try { await enviarAlCliente({ to: email, subject: correo.subject, html: correo.html, motivo: "recuperación de clave" }); } catch (e) { console.error("[portal] recuperación sin enviar", e); }
}
