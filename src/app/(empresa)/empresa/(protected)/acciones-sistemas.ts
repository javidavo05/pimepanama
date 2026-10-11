"use server";

/** Acciones del equipo sobre el Pulso: alta y edición de sistemas, probar, rotar el secreto, cerrar errores. */
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { keyDesdeNombre, ESTADO_LABEL, type EstadoSistema } from "@/lib/pulso/reglas";
import { direccionValida, sondearSistema } from "@/lib/pulso/sondeo";
import { registrarEvento } from "@/lib/portal/eventos";

export type EstadoSistemaForm = { error?: string; ok?: boolean; mensaje?: string } | null;
const txt = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);

function refrescar(id?: string, clientId?: string) {
  revalidatePath("/empresa/sistemas");
  if (id) revalidatePath(`/empresa/sistemas/${id}`);
  if (clientId) revalidatePath(`/empresa/clientes/${clientId}`);
}

async function delEquipo(userId: string, id: string) {
  return prisma.monitoredSystem.findFirst({ where: { id, userId }, select: { id: true, clientId: true, secretVersion: true, name: true, projectId: true } });
}

export async function guardarSistemaAction(_: EstadoSistemaForm, form: FormData): Promise<EstadoSistemaForm> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 60) || null;
  const name = txt(form.get("name"), 120);
  const clientId = txt(form.get("clientId"), 60);
  const projectId = txt(form.get("projectId"), 60) || null;
  const url = txt(form.get("url"), 300) || null;
  const healthUrl = txt(form.get("healthUrl"), 300) || null;
  const portalVisible = form.get("portalVisible") === "1";
  if (!name) return { error: "Escribe el nombre del sistema." };
  if (!clientId) return { error: "Elige de qué cliente es." };
  for (const [v, n] of [[url, "La dirección del sistema"], [healthUrl, "La dirección de salud"]] as const) {
    if (v && !direccionValida(v)) return { error: `${n} tiene que empezar con https://.` };
  }
  const cliente = await prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { id: true } });
  if (!cliente) return { error: "No encontré ese cliente." };
  if (projectId) {
    const p = await prisma.project.findFirst({ where: { id: projectId, userId: u.id }, select: { id: true } });
    if (!p) return { error: "No encontré ese proyecto." };
  }
  const datos = { name, clientId, projectId, url, healthUrl, portalVisible };

  if (id) {
    const s = await delEquipo(u.id, id);
    if (!s) return { error: "No encontré ese sistema." };
    await prisma.monitoredSystem.update({ where: { id }, data: datos });
    refrescar(id, clientId);
    return { ok: true, mensaje: "Cambios guardados." };
  }

  const s = await prisma.monitoredSystem.create({ data: { ...datos, userId: u.id, key: keyDesdeNombre(name, randomBytes(3).toString("hex")) } });
  await registrarEvento({ userId: u.id, clientId, projectId, entityType: "monitored_system", entityId: s.id, kind: "sistema_conectado", title: `${name} conectado al pulso de Pime`, visibility: "interno", actorEmpresaUserId: u.id });
  if (healthUrl) await sondearSistema(s.id);
  refrescar(s.id, clientId);
  redirect(`/empresa/sistemas/${s.id}?nuevo=1`);
}

export async function probarSistemaAction(_: EstadoSistemaForm, form: FormData): Promise<EstadoSistemaForm> {
  const u = await getEmpresaUser();
  const s = await delEquipo(u.id, txt(form.get("id"), 60));
  if (!s) return { error: "No encontré ese sistema." };
  const r = await sondearSistema(s.id);
  refrescar(s.id, s.clientId);
  if (!r) return { error: "Este sistema no tiene dirección de salud. Agrégala para que Pime lo consulte." };
  return r.ok
    ? { ok: true, mensaje: `Respondió bien en ${r.ms} ms. Estado: ${ESTADO_LABEL[r.status as EstadoSistema]}.` }
    : { error: `No respondió bien: ${r.error ?? "sin detalle"}. Estado: ${ESTADO_LABEL[r.status as EstadoSistema]}.` };
}

export async function rotarSecretoAction(_: EstadoSistemaForm, form: FormData): Promise<EstadoSistemaForm> {
  const u = await getEmpresaUser();
  const s = await delEquipo(u.id, txt(form.get("id"), 60));
  if (!s) return { error: "No encontré ese sistema." };
  await prisma.monitoredSystem.update({ where: { id: s.id }, data: { secretVersion: { increment: 1 } } });
  await registrarEvento({ userId: u.id, clientId: s.clientId, projectId: s.projectId, entityType: "monitored_system", entityId: s.id, kind: "sistema_secreto_rotado", title: `${s.name}: secreto del pulso cambiado`, visibility: "interno", actorEmpresaUserId: u.id });
  refrescar(s.id);
  return { ok: true, mensaje: "Secreto nuevo listo. El anterior ya no vale: actualiza PIME_PULSO_SECRET en el sistema." };
}

export async function resolverIncidenteAction(form: FormData): Promise<void> {
  const u = await getEmpresaUser();
  const inc = await prisma.systemIncident.findFirst({ where: { id: txt(form.get("id"), 60), system: { userId: u.id } }, select: { id: true, systemId: true, resolvedAt: true } });
  if (!inc) return;
  await prisma.systemIncident.update({ where: { id: inc.id }, data: { resolvedAt: inc.resolvedAt ? null : new Date() } });
  refrescar(inc.systemId);
}

export async function activarSistemaAction(form: FormData): Promise<void> {
  const u = await getEmpresaUser();
  const s = await prisma.monitoredSystem.findFirst({ where: { id: txt(form.get("id"), 60), userId: u.id }, select: { id: true, active: true, clientId: true } });
  if (!s) return;
  await prisma.monitoredSystem.update({ where: { id: s.id }, data: { active: !s.active, ...(s.active ? { status: "sin_senal", alertedStatus: null, failCount: 0 } : {}) } });
  refrescar(s.id, s.clientId);
}
