"use server";

/**
 * Lista de clientes (fase 6 del CRM): vistas guardadas de cada miembro y acciones sobre varios clientes a la vez
 * (asignar responsable, agregar o quitar etiqueta, archivar). Cada acción toca solo clientes de la empresa.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { filtrosGuardables, leerFiltros } from "@/lib/crm/listas";

export type EstadoLista = { ok?: boolean; error?: string; mensaje?: string } | null;

const txt = (v: FormDataEntryValue | null, max = 80) => String(v ?? "").trim().slice(0, max);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// ─── Vistas guardadas ────────────────────────────────────────────────────────

export async function guardarVistaAction(_: EstadoLista, form: FormData): Promise<EstadoLista> {
  const u = await getEmpresaUser();
  const nombre = txt(form.get("nombre"), 60);
  if (!nombre) return { error: "Ponle un nombre a la vista, por ejemplo «Sin contacto hace 60 días»." };
  const filtros = filtrosGuardables(leerFiltros(Object.fromEntries(new URLSearchParams(txt(form.get("query"), 2000)))));
  if (!Object.keys(filtros).length) return { error: "Elige al menos un filtro o una búsqueda antes de guardar la vista." };
  const cuantas = await prisma.vistaGuardada.count({ where: { miembroId: u.miembro.id, entidad: "clientes" } });
  if (cuantas >= 30) return { error: "Ya tienes 30 vistas guardadas. Borra alguna para guardar otra." };
  // Mismo nombre = se actualiza esa vista, no se duplica.
  const ya = await prisma.vistaGuardada.findFirst({ where: { miembroId: u.miembro.id, entidad: "clientes", nombre }, select: { id: true } });
  if (ya) await prisma.vistaGuardada.update({ where: { id: ya.id }, data: { filtros } });
  else await prisma.vistaGuardada.create({ data: { miembroId: u.miembro.id, entidad: "clientes", nombre, filtros } });
  revalidatePath("/empresa/clientes");
  return { ok: true, mensaje: ya ? `Vista «${nombre}» actualizada.` : `Vista «${nombre}» guardada.` };
}

export async function borrarVistaAction(_: EstadoLista, form: FormData): Promise<EstadoLista> {
  const u = await getEmpresaUser();
  const r = await prisma.vistaGuardada.deleteMany({ where: { id: txt(form.get("id"), 40), miembroId: u.miembro.id } });
  if (!r.count) return { error: "Esa vista ya no existe." };
  revalidatePath("/empresa/clientes");
  return { ok: true, mensaje: "Vista borrada." };
}

// ─── Acciones sobre varios clientes ──────────────────────────────────────────

export async function accionMasivaAction(_: EstadoLista, form: FormData): Promise<EstadoLista> {
  const u = await getEmpresaUser();
  const ids = [...new Set(form.getAll("ids").map((v) => txt(v, 40)).filter(Boolean))].slice(0, 200);
  const accion = txt(form.get("accion"), 20);
  if (!ids.length) return { error: "Marca al menos un cliente." };
  const donde = { id: { in: ids }, userId: u.id, archivedAt: null };

  if (accion === "asignar") {
    const responsableId = txt(form.get("responsableId"), 40);
    const equipo = await equipoDeLaEmpresa(u.id);
    const persona = equipo.find((e) => e.id === responsableId);
    if (responsableId && !persona) return { error: "Esa persona ya no está en el equipo." };
    const r = await prisma.client.updateMany({ where: donde, data: { responsableId: responsableId || null } });
    revalidatePath("/empresa/clientes");
    return { ok: true, mensaje: persona ? `${plural(r.count, "cliente", "clientes")} a cargo de ${persona.nombre}.` : `${plural(r.count, "cliente", "clientes")} sin responsable.` };
  }

  if (accion === "etiquetar" || accion === "quitar-etiqueta") {
    const etiqueta = txt(form.get("etiqueta"), 40);
    if (!etiqueta) return { error: accion === "etiquetar" ? "Escribe la etiqueta que quieres agregar." : "Elige la etiqueta que quieres quitar." };
    // Un solo viaje a la base: el arreglo se cambia en Postgres, sin repetir la etiqueta.
    const n = accion === "etiquetar"
      ? await prisma.$executeRaw`UPDATE "Client" SET "etiquetas" = array_append("etiquetas", ${etiqueta}), "updatedAt" = now()
          WHERE "id" = ANY(${ids}::text[]) AND "userId" = ${u.id} AND "archivedAt" IS NULL AND NOT (${etiqueta} = ANY("etiquetas"))`
      : await prisma.$executeRaw`UPDATE "Client" SET "etiquetas" = array_remove("etiquetas", ${etiqueta}), "updatedAt" = now()
          WHERE "id" = ANY(${ids}::text[]) AND "userId" = ${u.id} AND (${etiqueta} = ANY("etiquetas"))`;
    revalidatePath("/empresa/clientes");
    if (!n) return { ok: true, mensaje: accion === "etiquetar" ? `Esos clientes ya tenían «${etiqueta}».` : `Ninguno de esos clientes tenía «${etiqueta}».` };
    return { ok: true, mensaje: accion === "etiquetar" ? `«${etiqueta}» agregada a ${plural(n, "cliente", "clientes")}.` : `«${etiqueta}» quitada de ${plural(n, "cliente", "clientes")}.` };
  }

  if (accion === "archivar") {
    if (form.get("confirmado") !== "1") return { error: "Confirma el archivo antes de seguir." };
    const propios = await prisma.client.findMany({ where: donde, select: { id: true, internal: true } });
    if (propios.some((c) => c.internal)) return { error: "La empresa interna no se archiva. Desmárcala y vuelve a intentar." };
    const suyos = propios.map((c) => c.id);
    if (!suyos.length) return { error: "Esos clientes ya no están en la lista." };
    const r = await prisma.client.updateMany({ where: { id: { in: suyos }, userId: u.id }, data: { archivedAt: new Date() } });
    await prisma.activityEvent.createMany({
      data: suyos.map((clientId) => ({ userId: u.id, clientId, entityType: "cliente", entityId: clientId, kind: "cliente_archivado", title: "Cliente archivado desde la lista", visibility: "interno", actorType: "pime", actorEmpresaUserId: u.miembro.id })),
    }).catch((e) => console.error("[listas] eventos de archivo sin guardar", e));
    revalidatePath("/empresa/clientes");
    return { ok: true, mensaje: `${plural(r.count, "cliente archivado", "clientes archivados")}. Su historial queda guardado.` };
  }

  return { error: "No reconozco esa acción." };
}
