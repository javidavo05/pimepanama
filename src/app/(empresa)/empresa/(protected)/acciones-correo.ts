"use server";

/**
 * Correo uno a uno desde la ficha del cliente (fase 5 del CRM). Sale por Resend con `enviarAlCliente`, queda
 * como interacción «correo» saliente en la ficha y mueve el último contacto del cliente.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { enviarAlCliente } from "@/lib/motor/envios";
import { getSiteUrl } from "@/lib/site-url";
import { getEmailLogoUrl } from "@/lib/company-logo";
import { correoHtml, cuerpoHtml, primerNombre, rellenarTexto, variablesDesconocidas } from "@/lib/crm/correo";

export type EstadoCorreo = { ok?: boolean; error?: string; mensaje?: string } | null;
export type PlantillaBreve = { id: string; nombre: string; asunto: string; cuerpo: string };

const txt = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);
const correoValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Lo que el panel necesita al abrirse: plantillas, la empresa del cliente y quién firma. */
export async function datosCorreoClienteAction(clientId: string): Promise<{ plantillas: PlantillaBreve[]; empresa: string; miNombre: string } | null> {
  const u = await getEmpresaUser();
  const [cliente, plantillas] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { name: true, company: true } }),
    prisma.plantillaCorreo.findMany({ where: { userId: u.id }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, nombre: true, asunto: true, cuerpo: true } }),
  ]);
  if (!cliente) return null;
  return { plantillas, empresa: cliente.company || cliente.name, miNombre: u.miembro.fullName || u.miembro.email };
}

export async function enviarCorreoClienteAction(_: EstadoCorreo, form: FormData): Promise<EstadoCorreo> {
  const u = await getEmpresaUser();
  const clientId = txt(form.get("clientId"), 40);
  const contactoId = txt(form.get("contactoId"), 40);
  const asuntoBase = txt(form.get("asunto"), 200);
  const cuerpoBase = txt(form.get("cuerpo"), 20_000);
  if (!asuntoBase) return { error: "Escribe el asunto." };
  if (!cuerpoBase) return { error: "Escribe el mensaje." };
  const raras = variablesDesconocidas(`${asuntoBase} ${cuerpoBase}`);
  if (raras.length) return { error: `Estas variables no existen: ${raras.map((r) => `{{${r}}}`).join(", ")}.` };

  const [cliente, contacto] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { id: true, name: true, company: true, email: true, internal: true } }),
    contactoId && contactoId !== "cliente"
      ? prisma.contacto.findFirst({ where: { id: contactoId, clientId, userId: u.id }, select: { id: true, nombre: true, email: true } })
      : Promise.resolve(null),
  ]);
  if (!cliente) return { error: "No encontré ese cliente." };
  if (cliente.internal) return { error: "Este es un cliente interno: no recibe correos." };
  const email = (contacto?.email ?? (contactoId === "cliente" ? cliente.email : null) ?? "").trim();
  if (!correoValido(email)) return { error: "Elige un contacto con un correo válido." };

  const nombreContacto = contacto?.nombre ?? cliente.name;
  const datos = { nombre: primerNombre(nombreContacto), contacto: nombreContacto, empresa: cliente.company || cliente.name, mi_nombre: u.miembro.fullName || u.miembro.email };
  const asunto = rellenarTexto(asuntoBase, datos).trim();
  try {
    await enviarAlCliente({
      to: email,
      subject: asunto,
      html: correoHtml({ cuerpo: cuerpoHtml(cuerpoBase, datos), preheader: asunto, logoUrl: getEmailLogoUrl(), siteUrl: getSiteUrl() }),
      motivo: `correo de la ficha ${cliente.id}`,
    });
  } catch (e) {
    console.error("[correo] ficha", e);
    return { error: `No salió el correo: ${e instanceof Error ? e.message : "error del servicio de correo"}. Revisa la dirección y vuelve a intentar.` };
  }
  const ahora = new Date();
  await Promise.all([
    prisma.interaccion.create({ data: { userId: u.id, clientId: cliente.id, contactoId: contacto?.id ?? null, autorId: u.miembro.id, tipo: "correo", direccion: "saliente", resumen: asunto, ocurrioAt: ahora } }),
    prisma.client.update({ where: { id: cliente.id }, data: { ultimoContactoAt: ahora } }),
  ]);
  revalidatePath(`/empresa/clientes/${cliente.id}`);
  return { ok: true, mensaje: `Correo enviado a ${email}. Quedó en el historial del cliente.` };
}
