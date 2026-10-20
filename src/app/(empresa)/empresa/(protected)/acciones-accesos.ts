"use server";

/**
 * Acceso del cliente a su sistema: enlace en producción y accesos (panel, usuario, clave). Lo que se guarda aquí
 * lo ve el cliente en la ficha de su proyecto. La clave se guarda cifrada y nunca vuelve al navegador del equipo
 * salvo que se pida verla.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { decryptPassword, encryptPassword } from "@/lib/mail/crypto";
import { registrarEvento } from "@/lib/portal/eventos";

export type Estado = { error?: string; ok?: boolean; mensaje?: string; valor?: string } | null;
const txt = (v: FormDataEntryValue | null, max = 500) => String(v ?? "").trim().slice(0, max);
const url = (v: string) => (!v ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`);

async function proyecto(userId: string, id: string) {
  return prisma.project.findFirst({ where: { id, userId }, select: { id: true, name: true, clientId: true, clients: { select: { clientId: true } } } });
}

export async function guardarEnlaceAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await proyecto(u.id, txt(form.get("projectId"), 60));
  if (!p) return { error: "No encontré ese proyecto." };
  const liveUrl = url(txt(form.get("liveUrl"), 300));
  await prisma.project.update({ where: { id: p.id }, data: { liveUrl } });
  revalidatePath(`/empresa/proyectos/${p.id}`);
  return { ok: true, mensaje: liveUrl ? "Enlace guardado: el cliente lo ve en su cuenta." : "Enlace quitado." };
}

export async function guardarAccesoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const p = await proyecto(u.id, txt(form.get("projectId"), 60));
  if (!p) return { error: "No encontré ese proyecto." };
  const id = txt(form.get("id"), 60) || null;
  const label = txt(form.get("label"), 120);
  if (!label) return { error: "Escribe qué es (por ejemplo «Panel de administración»)." };
  const clave = String(form.get("secret") ?? "");
  const datos = { label, url: url(txt(form.get("url"), 300)), username: txt(form.get("username"), 200) || null, notes: txt(form.get("notes"), 1000) || null };
  try {
    if (id) {
      const a = await prisma.projectAccess.findFirst({ where: { id, projectId: p.id }, select: { id: true } });
      if (!a) return { error: "No encontré ese acceso." };
      await prisma.projectAccess.update({ where: { id }, data: { ...datos, ...(clave ? { secretEnc: encryptPassword(clave) } : {}) } });
    } else {
      const n = await prisma.projectAccess.count({ where: { projectId: p.id } });
      await prisma.projectAccess.create({ data: { ...datos, projectId: p.id, sortOrder: n, secretEnc: clave ? encryptPassword(clave) : null } });
      const clientId = p.clientId ?? p.clients[0]?.clientId;
      if (clientId) await registrarEvento({ userId: u.id, clientId, projectId: p.id, entityType: "acceso", kind: "acceso", title: `Nuevo acceso a tu sistema: ${label}`, detail: "Lo ves en la ficha de tu proyecto.", visibility: "cliente", actorType: "pime", actorEmpresaUserId: u.id });
    }
  } catch (e) {
    return { error: e instanceof Error && e.message.includes("MAIL_ENCRYPTION_KEY") ? "Falta la llave de cifrado (MAIL_ENCRYPTION_KEY) para guardar claves." : "No se pudo guardar el acceso." };
  }
  revalidatePath(`/empresa/proyectos/${p.id}`);
  return { ok: true, mensaje: "Acceso guardado: el cliente lo ve en su cuenta." };
}

export async function borrarAccesoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const a = await prisma.projectAccess.findFirst({ where: { id: txt(form.get("id"), 60), project: { userId: u.id } }, select: { id: true, projectId: true } });
  if (!a) return { error: "No encontré ese acceso." };
  await prisma.projectAccess.delete({ where: { id: a.id } });
  revalidatePath(`/empresa/proyectos/${a.projectId}`);
  return { ok: true };
}

export async function verClaveEquipoAction(_: Estado, form: FormData): Promise<Estado> {
  const u = await getEmpresaUser();
  const a = await prisma.projectAccess.findFirst({ where: { id: txt(form.get("id"), 60), project: { userId: u.id } }, select: { secretEnc: true } });
  if (!a?.secretEnc) return { error: "Este acceso no tiene clave guardada." };
  try { return { ok: true, valor: decryptPassword(a.secretEnc) }; } catch { return { error: "No se pudo descifrar la clave." }; }
}

/**
 * Mensaje listo para mandarle al cliente con los accesos de sus proyectos (o de uno solo), claves incluidas.
 * Se arma en el servidor para que las claves solo viajen cuando alguien del equipo toca «Copiar».
 */
export async function textoAccesosAction(clientId: string, projectId?: string): Promise<Estado> {
  const u = await getEmpresaUser();
  const c = await prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { name: true } });
  if (!c) return { error: "No encontré ese cliente." };
  const proyectos = await prisma.project.findMany({
    where: { userId: u.id, ...(projectId ? { id: projectId } : {}), OR: [{ clientId }, { clients: { some: { clientId } } }] },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: { name: true, liveUrl: true, accesses: { orderBy: { sortOrder: "asc" }, select: { label: true, url: true, username: true, notes: true, secretEnc: true } } },
  });
  const conAlgo = proyectos.filter((p) => p.liveUrl || p.accesses.length);
  if (!conAlgo.length) return { error: "Todavía no hay accesos guardados." };
  let bloques: string[];
  try {
    bloques = conAlgo.map((p) => [
      `*${p.name}*`,
      ...(p.liveUrl ? [`Sistema: ${p.liveUrl}`] : []),
      ...p.accesses.map((a) => [
        "", a.label,
        ...(a.url ? [`Dirección: ${a.url}`] : []),
        ...(a.username ? [`Usuario: ${a.username}`] : []),
        ...(a.secretEnc ? [`Clave: ${decryptPassword(a.secretEnc)}`] : []),
        ...(a.notes ? [`Nota: ${a.notes}`] : []),
      ].join("\n")),
    ].join("\n"));
  } catch {
    return { error: "No se pudo descifrar una de las claves." };
  }
  const nombre = c.name.trim().split(/\s+/)[0];
  return { ok: true, valor: [`Hola${nombre ? ` ${nombre}` : ""}, estos son tus accesos:`, ...bloques].join("\n\n") };
}
