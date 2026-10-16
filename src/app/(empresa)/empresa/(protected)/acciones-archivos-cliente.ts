"use server";

/**
 * Archivos compartidos con un cliente (ArchivoCliente), desde el panel: listar, subir (hasta 20 MB, directo a R2
 * con enlace firmado), mostrar u ocultar en la cuenta del cliente, descargar y borrar. Todo filtrado por u.id.
 */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { r2, R2_BUCKET, deleteR2Object, generatePresignedUploadUrl } from "@/lib/r2";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { registrarEvento } from "@/lib/portal/eventos";
import { MAX_ARCHIVO, archivoValido, carpetaArchivos, llaveDeArchivos, nombreSeguro, tamanoLegible } from "@/lib/portal/documentos";

export type ArchivoPanel = { id: string; nombre: string; tamano: number | null; tipo: string | null; subidoPor: string; visibleCliente: boolean; createdAt: string; proyecto: string | null };
type Res<T> = ({ ok: true } & T) | { ok: false; error: string };

async function clienteDelEquipo(clientId: string) {
  const u = await getEmpresaUser();
  const c = await prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { id: true } });
  return c ? u : null;
}
function refrescar(clientId: string) {
  revalidatePath(`/empresa/clientes/${clientId}`);
  revalidatePath("/cliente/archivos");
  revalidatePath("/cliente/documentos");
}

export async function listarArchivosClienteAction(clientId: string, projectId?: string | null): Promise<Res<{ archivos: ArchivoPanel[] }>> {
  const u = await clienteDelEquipo(clientId);
  if (!u) return { ok: false, error: "No encontré ese cliente." };
  const filas = await prisma.archivoCliente.findMany({
    where: { userId: u.id, clientId, ...(projectId ? { projectId } : {}) },
    orderBy: { createdAt: "desc" },
    select: { id: true, nombre: true, tamano: true, tipo: true, subidoPor: true, visibleCliente: true, createdAt: true, project: { select: { name: true } } },
  });
  return { ok: true, archivos: filas.map((a) => ({ id: a.id, nombre: a.nombre, tamano: a.tamano, tipo: a.tipo, subidoPor: a.subidoPor, visibleCliente: a.visibleCliente, createdAt: a.createdAt.toISOString(), proyecto: a.project?.name ?? null })) };
}

export async function prepararSubidaArchivoAction(clientId: string, a: { nombre: string; tipo: string; tamano: number }): Promise<Res<{ url: string; key: string; tipo: string }>> {
  const u = await clienteDelEquipo(clientId);
  if (!u) return { ok: false, error: "No encontré ese cliente." };
  const invalido = archivoValido({ nombre: String(a.nombre ?? ""), tamano: Number(a.tamano) });
  if (invalido) return { ok: false, error: invalido };
  const tipo = String(a.tipo || "application/octet-stream").slice(0, 120);
  const key = `${carpetaArchivos(clientId)}${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${nombreSeguro(a.nombre)}`;
  try {
    return { ok: true, url: await generatePresignedUploadUrl(key, tipo), key, tipo };
  } catch {
    return { ok: false, error: "No pude preparar la subida (revisa la configuración de R2)." };
  }
}

export async function registrarArchivoPimeAction(clientId: string, a: { key: string; nombre: string; tipo: string; projectId?: string | null; visibleCliente?: boolean }): Promise<Res<{ mensaje: string }>> {
  const u = await clienteDelEquipo(clientId);
  if (!u) return { ok: false, error: "No encontré ese cliente." };
  if (!llaveDeArchivos(clientId, a.key)) return { ok: false, error: "No pude guardar el archivo. Vuelve a subirlo." };
  let tamano = 0;
  try { tamano = Number((await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: a.key }))).ContentLength ?? 0); }
  catch { return { ok: false, error: "El archivo no terminó de subir. Inténtalo otra vez." }; }
  const nombre = String(a.nombre ?? "").trim().slice(0, 200);
  const invalido = archivoValido({ nombre, tamano });
  if (invalido) { if (tamano > MAX_ARCHIVO) await deleteR2Object(a.key).catch(() => {}); return { ok: false, error: invalido }; }
  let projectId: string | null = null;
  if (a.projectId) projectId = (await prisma.project.findFirst({ where: { id: a.projectId, userId: u.id }, select: { id: true } }))?.id ?? null;
  const visible = a.visibleCliente !== false;
  const fila = await prisma.archivoCliente.create({ data: { userId: u.id, clientId, projectId, nombre, r2Key: a.key, tipo: a.tipo?.slice(0, 120) || null, tamano, subidoPor: "pime", visibleCliente: visible }, select: { id: true } });
  await registrarEvento({ userId: u.id, clientId, projectId, entityType: "archivo", entityId: fila.id, kind: "archivo_subido", title: visible ? `Pime compartió el archivo ${nombre}` : `Archivo interno: ${nombre}`, detail: tamanoLegible(tamano), visibility: visible ? "cliente" : "interno", actorType: "pime", actorEmpresaUserId: u.miembro.id });
  refrescar(clientId);
  return { ok: true, mensaje: visible ? `${nombre} quedó guardado y el cliente ya lo ve.` : `${nombre} quedó guardado, oculto para el cliente.` };
}

async function archivoDelEquipo(id: string) {
  const u = await getEmpresaUser();
  const a = await prisma.archivoCliente.findFirst({ where: { id, userId: u.id }, select: { id: true, clientId: true, nombre: true, r2Key: true, visibleCliente: true } });
  return a ? { u, a } : null;
}

export async function cambiarVisibilidadArchivoAction(id: string, visible: boolean): Promise<Res<{ mensaje: string }>> {
  const r = await archivoDelEquipo(id);
  if (!r) return { ok: false, error: "No encontré ese archivo." };
  await prisma.archivoCliente.update({ where: { id }, data: { visibleCliente: visible } });
  refrescar(r.a.clientId);
  return { ok: true, mensaje: visible ? "El cliente ya ve este archivo." : "Archivo oculto para el cliente." };
}

export async function borrarArchivoClienteAction(id: string): Promise<Res<{ mensaje: string }>> {
  const r = await archivoDelEquipo(id);
  if (!r) return { ok: false, error: "No encontré ese archivo." };
  await prisma.archivoCliente.delete({ where: { id } });
  await deleteR2Object(r.a.r2Key).catch((e) => console.error("[archivos] no se borró de R2", r.a.r2Key, e));
  await registrarEvento({ userId: r.u.id, clientId: r.a.clientId, entityType: "archivo", entityId: id, kind: "archivo_borrado", title: `Archivo borrado: ${r.a.nombre}`, visibility: "interno", actorEmpresaUserId: r.u.miembro.id });
  refrescar(r.a.clientId);
  return { ok: true, mensaje: `${r.a.nombre} se borró.` };
}

export async function enlaceArchivoClienteAction(id: string): Promise<Res<{ url: string }>> {
  const r = await archivoDelEquipo(id);
  if (!r) return { ok: false, error: "No encontré ese archivo." };
  const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: r.a.r2Key, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(r.a.nombre)}` }), { expiresIn: 300 });
  return { ok: true, url };
}
