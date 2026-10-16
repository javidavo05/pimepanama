"use server";

/**
 * Acciones de Documentos en la cuenta del cliente: aceptar una propuesta y registrar un archivo subido.
 * Cada una vuelve a leer la sesión (getPortalUser) y filtra por su clientId; nada que llegue del navegador
 * se usa sin comprobar que es de este cliente.
 */
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { r2, R2_BUCKET, deleteR2Object } from "@/lib/r2";
import { getPortalUser } from "@/lib/portal/sesion";
import { registrarEvento } from "@/lib/portal/eventos";
import { avisarAlEquipo } from "@/lib/portal/avisos";
import { dinero, proyectosDelCliente } from "@/lib/portal/datos";
import { MAX_ARCHIVO, archivoValido, llaveDeArchivos, nombreQueAcepta, puedeAceptarPropuesta, tamanoLegible } from "@/lib/portal/documentos";

export type EstadoDoc = { error?: string; ok?: boolean; mensaje?: string } | null;

async function origen() {
  const h = await headers();
  return { ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

// ─── Propuestas ───────────────────────────────────────────────────────────────

export async function aceptarPropuestaAction(_: EstadoDoc, form: FormData): Promise<EstadoDoc> {
  const p = await getPortalUser();
  const id = String(form.get("propuesta") ?? "");
  if (form.get("confirmo") !== "1") return { error: "Marca la casilla para confirmar que aceptas la propuesta." };
  const doc = await prisma.document.findFirst({ where: { id, clientId: p.clientId, type: "COTIZACION" }, select: { id: true, number: true, title: true, status: true, total: true, validUntil: true, projectId: true } });
  if (!doc) return { error: "No encontramos esa propuesta." };
  const puede = puedeAceptarPropuesta(doc, p.role);
  if (!puede.ok) return { error: puede.motivo };

  const quien = nombreQueAcepta(p);
  const o = await origen();
  // Solo pasa si sigue enviada: dos personas aceptando a la vez no la aceptan dos veces.
  const aceptada = await prisma.$transaction(async (tx) => {
    const cambio = await tx.document.updateMany({ where: { id: doc.id, clientId: p.clientId, status: "SENT" }, data: { status: "ACCEPTED", aceptadaAt: new Date(), aceptadaPor: quien } });
    if (cambio.count === 0) return false;
    await tx.approval.create({ data: { userId: p.client.userId, clientId: p.clientId, entityType: "propuesta", entityId: doc.id, decision: "aprobado", clientUserId: p.id, ...o } });
    return true;
  });
  if (!aceptada) return { error: "Esta propuesta ya no espera tu respuesta." };

  const nombre = doc.number ? `${doc.number}: ${doc.title}` : doc.title;
  await registrarEvento({ userId: p.client.userId, clientId: p.clientId, projectId: doc.projectId, entityType: "propuesta", entityId: doc.id, kind: "propuesta_aceptada", title: `Aceptaste la propuesta ${nombre}`, detail: `Total ${dinero(doc.total)} · aceptada por ${quien}`, visibility: "cliente", actorType: "cliente", actorClientUserId: p.id });
  await avisarAlEquipo(p.client.userId, `Propuesta aceptada · ${p.client.company || p.client.name}`, `${quien} aceptó ${nombre} por ${dinero(doc.total)}.`, `/empresa/cotizaciones/${doc.id}`);
  revalidatePath(`/cliente/propuestas/${doc.id}`);
  revalidatePath("/cliente/propuestas");
  revalidatePath("/cliente/documentos");
  revalidatePath("/cliente");
  return { ok: true };
}

// ─── Archivos ─────────────────────────────────────────────────────────────────

/**
 * Registra un archivo que el navegador ya subió a R2 con el enlace firmado de /api/cliente/archivos.
 * Se comprueba que la llave es de la carpeta de este cliente y que el objeto existe con su tamaño real.
 */
export async function registrarArchivoAction(_: EstadoDoc, form: FormData): Promise<EstadoDoc> {
  const p = await getPortalUser();
  const key = String(form.get("key") ?? "");
  const nombre = String(form.get("nombre") ?? "").trim().slice(0, 200);
  const tipo = String(form.get("tipo") ?? "").slice(0, 120) || null;
  const proyecto = String(form.get("proyecto") ?? "") || null;
  if (!llaveDeArchivos(p.clientId, key)) return { error: "No pudimos guardar el archivo. Vuelve a subirlo." };

  let tamano = 0;
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    tamano = Number(head.ContentLength ?? 0);
  } catch {
    return { error: "El archivo no terminó de subir. Inténtalo otra vez." };
  }
  const invalido = archivoValido({ nombre, tamano });
  if (invalido) {
    if (tamano > MAX_ARCHIVO) await deleteR2Object(key).catch(() => {});
    return { error: invalido };
  }

  let projectId: string | null = null;
  if (proyecto) {
    const pr = await prisma.project.findFirst({ where: { id: proyecto, ...proyectosDelCliente(p.clientId) }, select: { id: true } });
    projectId = pr?.id ?? null;
  }
  const a = await prisma.archivoCliente.create({ data: { userId: p.client.userId, clientId: p.clientId, projectId, nombre, r2Key: key, tipo, tamano, subidoPor: "cliente", visibleCliente: true }, select: { id: true } });
  const quien = p.fullName || p.email;
  await registrarEvento({ userId: p.client.userId, clientId: p.clientId, projectId, entityType: "archivo", entityId: a.id, kind: "archivo_subido", title: `Subiste el archivo ${nombre}`, detail: `${tamanoLegible(tamano)} · ${quien}`, visibility: "cliente", actorType: "cliente", actorClientUserId: p.id });
  await avisarAlEquipo(p.client.userId, `Archivo nuevo · ${p.client.company || p.client.name}`, `${quien} subió ${nombre} (${tamanoLegible(tamano)}).`, `/empresa/clientes/${p.clientId}`);
  revalidatePath("/cliente/archivos");
  revalidatePath("/cliente/documentos");
  return { ok: true, mensaje: `Listo: ${nombre} quedó guardado y el equipo de Pime ya lo puede ver.` };
}
