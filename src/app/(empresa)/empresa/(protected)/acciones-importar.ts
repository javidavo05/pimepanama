"use server";

/**
 * Importar clientes desde CSV (fase 6 del CRM). El navegador lee el archivo y manda las celdas con el mapeo elegido;
 * aquí se vuelve a revisar todo contra los correos de hoy (por si alguien creó un cliente mientras tanto) y se crean
 * los clientes y su contacto principal en tres viajes a la base.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { CAMPOS_IMPORTAR, MAX_FILAS_IMPORTAR, contactoDeFila, revisarFilas, type Mapeo } from "@/lib/crm/csv-importar";

export type EstadoImportar = { ok?: boolean; error?: string; mensaje?: string; creados?: number; saltados?: number } | null;

const CAMPOS = new Set<string>(CAMPOS_IMPORTAR.map((c) => c.id));

export async function importarClientesAction(_: EstadoImportar, form: FormData): Promise<EstadoImportar> {
  const u = await getEmpresaUser();
  let datos: string[][];
  let mapeo: Mapeo;
  try {
    datos = JSON.parse(String(form.get("datos") ?? "[]"));
    const crudo = JSON.parse(String(form.get("mapeo") ?? "{}")) as Record<string, string>;
    mapeo = Object.fromEntries(Object.entries(crudo).map(([k, v]) => [Number(k), CAMPOS.has(v) ? v : ""])) as Mapeo;
  } catch {
    return { error: "No pude leer el archivo. Vuelve a subirlo." };
  }
  if (!Array.isArray(datos) || !datos.every((f) => Array.isArray(f))) return { error: "No pude leer el archivo. Vuelve a subirlo." };
  if (!datos.length) return { error: "El archivo no tiene filas de clientes." };
  if (datos.length > MAX_FILAS_IMPORTAR) return { error: `Son ${datos.length} filas; se pueden importar hasta ${MAX_FILAS_IMPORTAR} por vez. Divide el archivo en partes.` };
  if (!Object.values(mapeo).includes("name") && !Object.values(mapeo).includes("company")) return { error: "Elige qué columna es el Nombre o la Empresa." };
  const filas = datos.map((f) => f.map((c) => String(c ?? "").slice(0, 2000)));

  const existentes = await prisma.client.findMany({ where: { userId: u.id, email: { not: null } }, select: { email: true } });
  const revision = revisarFilas(filas, mapeo, existentes.map((c) => c.email ?? ""));
  const crear = revision.filas.filter((f) => f.estado === "crear");
  if (!crear.length) return { error: "No queda ningún cliente nuevo por crear: todas las filas tienen errores o ya existen." };

  try {
    // Clientes y contactos en una transacción: si algo falla, no queda nada a medias.
    const creados = await prisma.$transaction(async (tx) => {
    const nuevos = await tx.client.createManyAndReturn({
      data: crear.map((f) => ({
        userId: u.id, name: f.name, company: f.company, email: f.email, phone: f.phone, ruc: f.ruc,
        address: f.address, city: f.city, ...(f.country ? { country: f.country } : {}),
        fuente: f.fuente ?? "Importación", industria: f.industria, etiquetas: f.etiquetas, notes: f.notes,
        responsableId: u.miembro.esDueno ? null : u.miembro.id,
      })),
      select: { id: true },
    });
    // createManyAndReturn devuelve en el mismo orden en que se mandó.
    const contactos = nuevos.flatMap((c, i) => {
      const k = contactoDeFila(crear[i]);
      return k ? [{ userId: u.id, clientId: c.id, nombre: k.nombre, email: k.email, telefono: k.telefono, cargo: k.cargo, principal: true, rol: "decide" }] : [];
    });
    if (contactos.length) await tx.contacto.createMany({ data: contactos });
    return nuevos;
    }, { timeout: 30_000, maxWait: 10_000 });
    await Promise.all([
      prisma.activityEvent.createMany({
        data: creados.map((c) => ({ userId: u.id, clientId: c.id, entityType: "cliente", entityId: c.id, kind: "cliente_importado", title: "Cliente importado desde una hoja CSV", visibility: "interno", actorType: "pime", actorEmpresaUserId: u.miembro.id })),
      }).catch((e) => console.error("[importar] eventos sin guardar", e)),
    ]);
    revalidatePath("/empresa/clientes");
    const saltados = revision.filas.length - creados.length;
    return {
      ok: true, creados: creados.length, saltados,
      mensaje: `${creados.length} ${creados.length === 1 ? "cliente creado" : "clientes creados"}${saltados ? ` · ${saltados} ${saltados === 1 ? "fila saltada" : "filas saltadas"} por errores o correos repetidos` : ""}.`,
    };
  } catch (e) {
    console.error("[importar]", e);
    return { error: "No se pudieron crear los clientes. No se guardó nada a medias; intenta de nuevo." };
  }
}
