"use server";

/**
 * Plantillas de correo y campañas (fase 5 del CRM). Solo las áreas que ven «campanas» (src/lib/auth/permisos.ts).
 * Una campaña se guarda como borrador, se revisa y se envía por tandas desde su página.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer } from "@/lib/auth/permisos";
import { variablesDesconocidas } from "@/lib/crm/correo";
import { elegirDestinatarios, normalizarFiltro } from "@/lib/crm/campanas";
import { datosDelSegmento, enviarLote } from "@/lib/crm/campanas-servidor";

export type EstadoCampana = { ok?: boolean; error?: string; mensaje?: string; faltan?: number } | null;

const txt = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);

async function usuario() {
  const u = await getEmpresaUser();
  if (!puedeVer(u.miembro.area, "campanas")) throw new Error("Tu área no tiene acceso a campañas.");
  return u;
}

function revisarTextos(nombre: string, asunto: string, cuerpo: string): string | null {
  if (!nombre) return "Ponle un nombre para encontrarla después.";
  if (!asunto) return "Escribe el asunto del correo.";
  if (!cuerpo) return "Escribe el cuerpo del correo.";
  const raras = variablesDesconocidas(`${asunto} ${cuerpo}`);
  if (raras.length) return `Estas variables no existen: ${raras.map((r) => `{{${r}}}`).join(", ")}. Usa los botones para insertar las que sí.`;
  return null;
}

// ─── Plantillas ──────────────────────────────────────────────────────────────

export async function guardarPlantillaAction(_: EstadoCampana, form: FormData): Promise<EstadoCampana> {
  const u = await usuario();
  const id = txt(form.get("id"), 40);
  const nombre = txt(form.get("nombre"), 120);
  const asunto = txt(form.get("asunto"), 200);
  const cuerpo = txt(form.get("cuerpo"), 20_000);
  const error = revisarTextos(nombre, asunto, cuerpo);
  if (error) return { error };
  if (id) {
    const r = await prisma.plantillaCorreo.updateMany({ where: { id, userId: u.id }, data: { nombre, asunto, cuerpo } });
    if (!r.count) return { error: "No encontré esa plantilla." };
  } else {
    await prisma.plantillaCorreo.create({ data: { userId: u.id, nombre, asunto, cuerpo } });
  }
  revalidatePath("/empresa/campanas/plantillas");
  redirect("/empresa/campanas/plantillas?guardada=1");
}

export async function duplicarPlantillaAction(form: FormData): Promise<void> {
  const u = await usuario();
  const p = await prisma.plantillaCorreo.findFirst({ where: { id: txt(form.get("id"), 40), userId: u.id } });
  if (!p) return;
  await prisma.plantillaCorreo.create({ data: { userId: u.id, nombre: `${p.nombre} (copia)`.slice(0, 120), asunto: p.asunto, cuerpo: p.cuerpo } });
  revalidatePath("/empresa/campanas/plantillas");
}

export async function borrarPlantillaAction(form: FormData): Promise<void> {
  const u = await usuario();
  await prisma.plantillaCorreo.deleteMany({ where: { id: txt(form.get("id"), 40), userId: u.id } });
  revalidatePath("/empresa/campanas/plantillas");
}

// ─── Campañas ────────────────────────────────────────────────────────────────

export async function guardarCampanaAction(_: EstadoCampana, form: FormData): Promise<EstadoCampana> {
  const u = await usuario();
  const id = txt(form.get("id"), 40);
  const nombre = txt(form.get("nombre"), 120);
  const asunto = txt(form.get("asunto"), 200);
  const cuerpo = txt(form.get("cuerpo"), 20_000);
  const error = revisarTextos(nombre, asunto, cuerpo);
  if (error) return { error };
  let filtro;
  try { filtro = normalizarFiltro(JSON.parse(txt(form.get("filtro"), 5000) || "{}")); } catch { filtro = normalizarFiltro({}); }
  let campanaId = id;
  if (id) {
    const r = await prisma.campana.updateMany({ where: { id, userId: u.id, estado: "borrador" }, data: { nombre, asunto, cuerpo, filtro } });
    if (!r.count) return { error: "Esa campaña ya se envió o no existe: no se puede cambiar." };
  } else {
    campanaId = (await prisma.campana.create({ data: { userId: u.id, nombre, asunto, cuerpo, filtro }, select: { id: true } })).id;
  }
  revalidatePath("/empresa/campanas");
  redirect(`/empresa/campanas/${campanaId}`);
}

export async function borrarCampanaAction(form: FormData): Promise<void> {
  const u = await usuario();
  await prisma.campana.deleteMany({ where: { id: txt(form.get("id"), 40), userId: u.id, estado: "borrador" } });
  revalidatePath("/empresa/campanas");
  redirect("/empresa/campanas");
}

/**
 * Primer clic: congela la lista de destinatarios (CampanaEnvio) y empieza a enviar. Los clics siguientes
 * («Continuar envío») mandan la siguiente tanda. «preparando» evita que dos clics armen la lista dos veces.
 */
export async function enviarCampanaAction(_: EstadoCampana, form: FormData): Promise<EstadoCampana> {
  const u = await usuario();
  const id = txt(form.get("id"), 40);
  const c = await prisma.campana.findFirst({ where: { id, userId: u.id }, select: { id: true, estado: true, filtro: true } });
  if (!c) return { error: "No encontré esa campaña." };
  if (c.estado === "enviada") return { ok: true, mensaje: "Esta campaña ya terminó de enviarse." };
  if (c.estado === "preparando") return { error: "Se está armando la lista de destinatarios. Espera unos segundos y vuelve a intentar." };

  if (c.estado === "borrador") {
    const { clientes, bajas } = await datosDelSegmento(u.id);
    const { destinatarios } = elegirDestinatarios(clientes, normalizarFiltro(c.filtro), bajas);
    if (!destinatarios.length) return { error: "Este segmento no tiene a quién enviarle. Cambia los filtros de la campaña." };
    const tomada = await prisma.campana.updateMany({ where: { id: c.id, estado: "borrador" }, data: { estado: "preparando" } });
    if (!tomada.count) return { error: "Otra persona ya empezó este envío. Recarga la página." };
    try {
      await prisma.campanaEnvio.createMany({ data: destinatarios.map((d) => ({ campanaId: c.id, email: d.email, nombre: d.nombre, clientId: d.clientId })) });
      await prisma.campana.update({ where: { id: c.id }, data: { estado: "enviando" } });
    } catch (e) {
      console.error("[campañas] armar destinatarios", e);
      await prisma.campanaEnvio.deleteMany({ where: { campanaId: c.id } });
      await prisma.campana.update({ where: { id: c.id }, data: { estado: "borrador" } });
      return { error: "No pude armar la lista de destinatarios. No salió ningún correo; vuelve a intentar." };
    }
  }

  let r;
  try {
    r = await enviarLote({ campanaId: c.id, userId: u.id, miNombre: u.miembro.fullName || u.config?.name || "El equipo de Pime" });
  } catch (e) {
    console.error("[campañas] lote", e);
    return { error: "El envío se cortó. Lo que ya salió queda marcado; toca «Continuar envío» para seguir." };
  }
  revalidatePath(`/empresa/campanas/${c.id}`);
  revalidatePath("/empresa/campanas");
  const fallos = r.fallos ? ` ${r.fallos} no salieron (ver la lista).` : "";
  if (r.terminada) return { ok: true, mensaje: `Listo: salieron ${r.enviados} correos en esta tanda y la campaña terminó.${fallos}` };
  return { ok: true, faltan: r.faltan, mensaje: `Salieron ${r.enviados} correos. Faltan ${r.faltan}: toca «Continuar envío» para mandar la siguiente tanda.${fallos}` };
}
