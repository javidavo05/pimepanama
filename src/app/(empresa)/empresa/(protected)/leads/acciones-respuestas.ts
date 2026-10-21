"use server";

/**
 * Respuestas a leads por tandas (src/lib/leads/respuestas.ts): editar, descartar, preparar la propuesta y enviar.
 * El envío va por partes: cada llamada manda lo que alcanza en TIEMPO_POR_LLAMADA_MS y devuelve lo que falta,
 * para que la pantalla siga con la siguiente sin chocar con el límite de la función.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer } from "@/lib/auth/permisos";
import { asegurarPropuesta, enviarRespuesta, unaRespuesta, type RespuestaVista } from "@/lib/leads/respuestas";
import { PropuestaError } from "@/lib/leads/propuesta-prospecto";

const TIEMPO_POR_LLAMADA_MS = 150_000;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Resultado<T> = { ok: true; dato: T } | { ok: false; error: string };

async function usuario() {
  const u = await getEmpresaUser();
  if (!puedeVer(u.miembro.area, "leads")) throw new Error("Tu área no tiene acceso a leads.");
  return u;
}

async function devolver(userId: string, id: string): Promise<Resultado<RespuestaVista>> {
  const r = await unaRespuesta(userId, id);
  return r ? { ok: true, dato: r } : { ok: false, error: "No encontré esa respuesta." };
}

export async function guardarRespuestaAction(
  id: string,
  cambios: { para: string; asunto: string; cuerpo: string; adjuntarPdf: boolean },
): Promise<Resultado<RespuestaVista>> {
  const u = await usuario();
  const para = cambios.para.trim().toLowerCase().slice(0, 200);
  if (para && !CORREO_RE.test(para)) return { ok: false, error: "Ese correo no tiene un formato válido." };
  const r = await prisma.respuestaLead.updateMany({
    where: { id, userId: u.id, estado: { in: ["borrador", "fallo"] } },
    data: { para: para || null, asunto: cambios.asunto.trim().slice(0, 200), cuerpo: cambios.cuerpo.slice(0, 20_000), adjuntarPdf: cambios.adjuntarPdf },
  });
  if (!r.count) return { ok: false, error: "Esta respuesta ya se envió o está descartada: no se puede cambiar." };
  // Si el lead no tenía correo, el que se escribió aquí pasa a su ficha.
  if (para) {
    const fila = await prisma.respuestaLead.findFirst({ where: { id }, select: { leadId: true } });
    if (fila) await prisma.lead.updateMany({ where: { id: fila.leadId, userId: u.id, email: null }, data: { email: para } });
  }
  return devolver(u.id, id);
}

export async function descartarRespuestaAction(id: string, descartar: boolean): Promise<Resultado<RespuestaVista>> {
  const u = await usuario();
  const r = await prisma.respuestaLead.updateMany({
    where: { id, userId: u.id, estado: descartar ? { in: ["borrador", "fallo"] } : "descartada" },
    data: { estado: descartar ? "descartada" : "borrador", error: null },
  });
  if (!r.count) return { ok: false, error: "No se pudo cambiar: puede que ya se haya enviado." };
  revalidatePath("/empresa/leads");
  return devolver(u.id, id);
}

/** Marca (o desmarca) que el mensaje de LinkedIn ya se mandó a mano. Un lead NUEVO pasa a CONTACTADO. */
export async function marcarLinkedinAction(id: string, hecho: boolean): Promise<Resultado<RespuestaVista>> {
  const u = await usuario();
  const fila = await prisma.respuestaLead.findFirst({ where: { id, userId: u.id }, select: { leadId: true } });
  if (!fila) return { ok: false, error: "No encontré esa respuesta." };
  await prisma.respuestaLead.update({ where: { id }, data: { linkedinAt: hecho ? new Date() : null } });
  if (hecho) await prisma.lead.updateMany({ where: { id: fila.leadId, userId: u.id, status: "NUEVO" }, data: { status: "CONTACTADO" } });
  revalidatePath("/empresa/leads");
  return devolver(u.id, id);
}

/**
 * Redacta la propuesta en PDF para revisarla antes de enviar. La primera vez también reescribe el correo;
 * `rehacer` la vuelve a armar desde el correo tal como está ahora (después de editarlo).
 */
export async function prepararPropuestaAction(id: string, rehacer: boolean): Promise<Resultado<RespuestaVista>> {
  const u = await usuario();
  try {
    await asegurarPropuesta({ userId: u.id, supabaseUid: u.supabaseUid, id, soloPdf: rehacer });
  } catch (e) {
    return { ok: false, error: e instanceof PropuestaError || e instanceof Error ? e.message : "No se pudo redactar la propuesta." };
  }
  return devolver(u.id, id);
}

export type ResultadoEnvio = {
  enviadas: string[];
  fallos: { id: string; error: string }[];
  /** Las que no alcanzaron a salir en esta llamada: la pantalla las manda en la siguiente. */
  faltan: string[];
  respuestas: RespuestaVista[];
};

export async function enviarRespuestasAction(ids: string[], cuentaId: string): Promise<Resultado<ResultadoEnvio>> {
  const u = await usuario();
  const cuenta = await prisma.mailAccount.findFirst({ where: { id: cuentaId, userId: u.id, active: true } });
  if (!cuenta) return { ok: false, error: "Elige un buzón activo para enviar." };
  const lista = [...new Set(ids)].slice(0, 50);
  if (!lista.length) return { ok: false, error: "No hay respuestas seleccionadas." };

  const inicio = Date.now();
  const enviadas: string[] = [];
  const fallos: { id: string; error: string }[] = [];
  let i = 0;
  for (; i < lista.length; i++) {
    if (Date.now() - inicio > TIEMPO_POR_LLAMADA_MS) break;
    const r = await enviarRespuesta({ userId: u.id, supabaseUid: u.supabaseUid, configId: u.configId, id: lista[i], cuenta });
    if (r.ok) enviadas.push(lista[i]);
    else fallos.push({ id: lista[i], error: r.error });
  }

  const tocadas = lista.slice(0, i);
  const respuestas = (await Promise.all(tocadas.map((id) => unaRespuesta(u.id, id)))).filter((r): r is RespuestaVista => r != null);
  revalidatePath("/empresa/leads");
  return { ok: true, dato: { enviadas, fallos, faltan: lista.slice(i), respuestas } };
}
