"use server";

/**
 * Embudo de ventas (fase 3 del CRM): etapas editables, oportunidades, ganar y perder, cotización desde la
 * oportunidad y edición completa del lead. Todo se filtra por el dueño (`u.id`); lo personal va con `u.miembro.id`.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { registrarEvento } from "@/lib/portal/eventos";
import { asegurarEtapas, convertirLeadEnCliente } from "@/lib/crm/embudo-datos";
import { FUENTES, MOTIVOS_PERDIDA, fasesDesdeLineas, moverEtapa, probabilidadValida, textoHistoria, type LineaCotizacion } from "@/lib/crm/embudo";
import { createDocumentAction, createProjectWithContractAction } from "@/app/(empresa)/empresa/actions";

export type EstadoEmbudo = { ok?: boolean; error?: string; mensaje?: string } | null;

const txt = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);
/** «1,250.50» → 1250.5; vacío o inválido → null. */
function monto(v: FormDataEntryValue | null): number | null {
  const s = txt(v, 30).replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
/** «2026-11-01» → mediodía UTC de ese día (no se corre de día por la zona horaria). */
function fechaDe(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
const fuenteValida = (v: string) => (FUENTES.some((f) => f.value === v) ? v : null);

function refrescar(id?: string, extra: string[] = []) {
  revalidatePath("/empresa/ventas");
  if (id) revalidatePath(`/empresa/ventas/${id}`);
  for (const p of extra) revalidatePath(p);
}

async function responsableValido(ownerId: string, id: string): Promise<string | null> {
  if (!id) return null;
  const equipo = await equipoDeLaEmpresa(ownerId);
  return equipo.some((p) => p.id === id) ? id : null;
}

/** Deja la historia de la oportunidad como nota en el lead o cliente (también aparece en su línea de tiempo). */
async function anotar(u: { id: string; miembro: { id: string } }, op: { titulo: string; leadId: string | null; clientId: string | null }, detalle: string) {
  if (!op.leadId && !op.clientId) return;
  try {
    await prisma.interaccion.create({
      data: { userId: u.id, leadId: op.leadId, clientId: op.clientId, autorId: u.miembro.id, tipo: "nota", resumen: textoHistoria(op.titulo, detalle) },
    });
  } catch (err) {
    console.error("[embudo] historia sin guardar", err);
  }
}

// ─── Etapas ──────────────────────────────────────────────────────────────────

export async function guardarEtapaAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const nombre = txt(form.get("nombre"), 60);
  if (!nombre) return { error: "La etapa necesita un nombre." };
  const e = await prisma.etapaEmbudo.findFirst({ where: { id, userId: u.id } });
  if (!e) return { error: "No encontré esa etapa." };
  // Ganado siempre es 100 % y Perdido 0 %: solo se les cambia el nombre.
  const probabilidad = e.tipo === "abierta" ? probabilidadValida(form.get("probabilidad"), e.probabilidad) : e.probabilidad;
  await prisma.etapaEmbudo.update({ where: { id }, data: { nombre, probabilidad } });
  refrescar(undefined, ["/empresa/ventas/etapas"]);
  return { ok: true, mensaje: `«${nombre}» guardada.` };
}

export async function agregarEtapaAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const nombre = txt(form.get("nombre"), 60);
  if (!nombre) return { error: "Escribe el nombre de la etapa." };
  const etapas = await asegurarEtapas(u.id);
  const abiertas = etapas.filter((e) => e.tipo === "abierta");
  if (abiertas.some((e) => e.nombre.toLowerCase() === nombre.toLowerCase())) return { error: "Ya tienes una etapa con ese nombre." };
  const orden = abiertas.reduce((m, e) => Math.max(m, e.orden), -1) + 1;
  await prisma.etapaEmbudo.create({ data: { userId: u.id, nombre, probabilidad: probabilidadValida(form.get("probabilidad"), 50), tipo: "abierta", orden } });
  refrescar(undefined, ["/empresa/ventas/etapas"]);
  return { ok: true, mensaje: `«${nombre}» quedó al final de las etapas abiertas.` };
}

export async function moverEtapaAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const dir = form.get("dir") === "subir" ? "subir" : "bajar";
  const etapas = await prisma.etapaEmbudo.findMany({ where: { userId: u.id } });
  const nuevos = moverEtapa(etapas, id, dir);
  if (!nuevos) return { error: dir === "subir" ? "Ya es la primera etapa." : "Ya es la última etapa abierta." };
  await prisma.$transaction(nuevos.map((n) => prisma.etapaEmbudo.update({ where: { id: n.id }, data: { orden: n.orden } })));
  refrescar(undefined, ["/empresa/ventas/etapas"]);
  return { ok: true };
}

export async function quitarEtapaAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const moverA = txt(form.get("moverA"), 40);
  const [e, abiertas, cuantas] = await Promise.all([
    prisma.etapaEmbudo.findFirst({ where: { id, userId: u.id } }),
    prisma.etapaEmbudo.findMany({ where: { userId: u.id, tipo: "abierta" }, select: { id: true, nombre: true, probabilidad: true } }),
    prisma.oportunidad.count({ where: { userId: u.id, etapaId: id } }),
  ]);
  if (!e) return { error: "No encontré esa etapa." };
  if (e.tipo !== "abierta") return { error: "Ganado y Perdido no se quitan: son donde terminan los negocios." };
  if (abiertas.length <= 1) return { error: "El embudo necesita al menos una etapa abierta." };
  if (cuantas > 0) {
    const destino = abiertas.find((a) => a.id === moverA && a.id !== id);
    if (!destino) return { error: `Tiene ${cuantas} oportunidad${cuantas === 1 ? "" : "es"}: elige a qué etapa pasan antes de quitarla.` };
    await prisma.$transaction([
      prisma.oportunidad.updateMany({ where: { userId: u.id, etapaId: id }, data: { etapaId: destino.id, probabilidad: destino.probabilidad } }),
      prisma.etapaEmbudo.delete({ where: { id } }),
    ]);
    refrescar(undefined, ["/empresa/ventas/etapas"]);
    return { ok: true, mensaje: `Quitada. Sus ${cuantas} oportunidad${cuantas === 1 ? "" : "es"} pasaron a «${destino.nombre}».` };
  }
  await prisma.etapaEmbudo.delete({ where: { id } });
  refrescar(undefined, ["/empresa/ventas/etapas"]);
  return { ok: true, mensaje: `«${e.nombre}» quitada.` };
}

// ─── Oportunidades ───────────────────────────────────────────────────────────

type DatosOp = { titulo: string; valor: number; etapaId: string; probabilidad: number; cierreEsperado: Date | null; responsableId: string | null; fuente: string | null; notas: string | null };

async function leerDatos(u: { id: string }, form: FormData): Promise<DatosOp | { error: string }> {
  const titulo = txt(form.get("titulo"), 140);
  if (!titulo) return { error: "Ponle un título a la oportunidad (por ejemplo, «Tienda en línea»)." };
  const valor = monto(form.get("valor"));
  if (valor == null) return { error: "Escribe el valor estimado en dólares (puede ser 0)." };
  const cierreTxt = txt(form.get("cierreEsperado"), 10);
  const cierreEsperado = cierreTxt ? fechaDe(cierreTxt) : null;
  if (cierreTxt && !cierreEsperado) return { error: "La fecha de cierre no es válida." };
  const etapaId = txt(form.get("etapaId"), 40);
  const etapa = await prisma.etapaEmbudo.findFirst({ where: { id: etapaId, userId: u.id, tipo: "abierta" } });
  if (!etapa) return { error: "Elige una etapa abierta." };
  return {
    titulo,
    valor,
    etapaId,
    probabilidad: probabilidadValida(form.get("probabilidad"), etapa.probabilidad),
    cierreEsperado,
    responsableId: await responsableValido(u.id, txt(form.get("responsableId"), 40)),
    fuente: fuenteValida(txt(form.get("fuente"), 30)),
    notas: txt(form.get("notas"), 4000) || null,
  };
}

export async function crearOportunidadAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const para = txt(form.get("para"), 10);
  const leadId = para === "lead" ? txt(form.get("leadId"), 40) : "";
  const clientId = para === "cliente" ? txt(form.get("clientId"), 40) : "";
  if (!leadId && !clientId) return { error: "Elige el lead o el cliente de esta oportunidad." };
  const [lead, client] = await Promise.all([
    leadId ? prisma.lead.findFirst({ where: { id: leadId, userId: u.id }, select: { id: true, convertedClientId: true } }) : null,
    clientId ? prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { id: true } }) : null,
  ]);
  if (leadId && !lead) return { error: "No encontré ese lead." };
  if (clientId && !client) return { error: "No encontré ese cliente." };
  await asegurarEtapas(u.id);
  const d = await leerDatos(u, form);
  if ("error" in d) return d;
  const etapa = await prisma.etapaEmbudo.findUnique({ where: { id: d.etapaId }, select: { nombre: true } });
  const op = await prisma.oportunidad.create({
    data: {
      userId: u.id,
      ...d,
      leadId: lead?.id ?? null,
      // Un lead ya convertido trae su cliente: la oportunidad queda en los dos.
      clientId: client?.id ?? lead?.convertedClientId ?? null,
      responsableId: d.responsableId ?? u.miembro.id,
    },
  });
  await anotar(u, op, `creada en ${etapa?.nombre ?? "el embudo"}`);
  refrescar(undefined, [lead ? `/empresa/leads/${lead.id}` : `/empresa/clientes/${op.clientId}`]);
  redirect(`/empresa/ventas/${op.id}`);
}

export async function guardarOportunidadAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const op = await prisma.oportunidad.findFirst({ where: { id, userId: u.id }, include: { etapa: { select: { nombre: true } } } });
  if (!op) return { error: "No encontré esa oportunidad." };
  // Cerrada: solo se corrigen título, valor, fuente, notas y responsable; la etapa queda en Ganado o Perdido.
  let d: DatosOp | { error: string };
  if (op.estado === "abierta") d = await leerDatos(u, form);
  else {
    const titulo = txt(form.get("titulo"), 140);
    const valor = monto(form.get("valor"));
    if (!titulo || valor == null) return { error: "El título y el valor son obligatorios." };
    d = { titulo, valor, etapaId: op.etapaId, probabilidad: op.probabilidad, cierreEsperado: op.cierreEsperado, responsableId: await responsableValido(u.id, txt(form.get("responsableId"), 40)), fuente: fuenteValida(txt(form.get("fuente"), 30)), notas: txt(form.get("notas"), 4000) || null };
  }
  if ("error" in d) return d;
  const actualizado = await prisma.oportunidad.update({ where: { id }, data: d, include: { etapa: { select: { nombre: true } } } });
  const cambios: string[] = [];
  if (actualizado.etapaId !== op.etapaId) cambios.push(`pasó de ${op.etapa.nombre} a ${actualizado.etapa.nombre}`);
  if (Number(actualizado.valor) !== Number(op.valor)) cambios.push(`valor de ${Number(op.valor).toFixed(2)} a ${d.valor.toFixed(2)} USD`);
  if (op.titulo !== actualizado.titulo) cambios.push(`antes se llamaba «${op.titulo}»`);
  if (cambios.length) await anotar(u, actualizado, cambios.join(" · "));
  refrescar(id, op.leadId ? [`/empresa/leads/${op.leadId}`] : []);
  return { ok: true, mensaje: "Cambios guardados." };
}

/** Mueve una oportunidad abierta a otra etapa abierta (selector de la tarjeta del tablero). */
export async function moverOportunidadAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const etapaId = txt(form.get("etapaId"), 40);
  const [op, etapa] = await Promise.all([
    prisma.oportunidad.findFirst({ where: { id, userId: u.id }, include: { etapa: { select: { nombre: true } } } }),
    prisma.etapaEmbudo.findFirst({ where: { id: etapaId, userId: u.id, tipo: "abierta" } }),
  ]);
  if (!op) return { error: "No encontré esa oportunidad." };
  if (op.estado !== "abierta") return { error: "Ya está cerrada; ábrela para moverla." };
  if (!etapa) return { error: "Elige una etapa abierta. Para ganar o perder, abre la oportunidad." };
  if (etapa.id === op.etapaId) return { ok: true };
  await prisma.oportunidad.update({ where: { id }, data: { etapaId: etapa.id, probabilidad: etapa.probabilidad } });
  await anotar(u, op, `pasó de ${op.etapa.nombre} a ${etapa.nombre}`);
  refrescar(id);
  return { ok: true, mensaje: `Ahora en ${etapa.nombre}.` };
}

export async function ganarOportunidadAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const op = await prisma.oportunidad.findFirst({
    where: { id, userId: u.id },
    include: { lead: true, cotizacion: { select: { id: true, content: true, total: true, projectId: true } } },
  });
  if (!op) return { error: "No encontré esa oportunidad." };
  if (op.estado === "ganada") return { ok: true, mensaje: "Ya estaba ganada." };
  const etapas = await asegurarEtapas(u.id);
  const ganada = etapas.find((e) => e.tipo === "ganada")!;

  // (a) El cliente: el de la oportunidad, o el lead convertido (reutiliza el que ya tenga su correo).
  let clientId = op.clientId;
  let reutilizado = false;
  if (!clientId && op.lead) {
    const r = await prisma.$transaction((tx) => convertirLeadEnCliente(tx, u.id, op.lead!), { timeout: 20_000 });
    clientId = r.clientId;
    reutilizado = r.reutilizado;
  } else if (op.lead && op.lead.status !== "GANADO") {
    await prisma.lead.update({ where: { id: op.lead.id }, data: { status: "GANADO", convertedClientId: op.lead.convertedClientId ?? clientId, convertedAt: op.lead.convertedAt ?? new Date() } });
  }
  if (!clientId) return { error: "La oportunidad no tiene lead ni cliente: elige uno antes de ganarla." };

  // (b) El proyecto, con las líneas de la cotización como fases (mismo alta que «Nuevo proyecto»).
  let projectId = op.projectId ?? op.cotizacion?.projectId ?? null;
  if (!projectId) {
    const lineas = ((op.cotizacion?.content as { lineItems?: LineaCotizacion[] } | null)?.lineItems) ?? [];
    const fases = fasesDesdeLineas(lineas);
    const presupuesto = op.cotizacion?.total != null ? Number(op.cotizacion.total) : Number(op.valor);
    try {
      const r = await createProjectWithContractAction({
        name: op.titulo,
        clientIds: [clientId],
        description: op.notas ?? undefined,
        totalBudget: presupuesto > 0 ? presupuesto : undefined,
        phases: fases.map((f) => ({ name: f.name, price: f.price, billingPoint: "al_entregar", deliverables: [] })),
        contract: null,
      });
      projectId = r.project.id;
    } catch (err) {
      return { error: err instanceof Error ? `No pude crear el proyecto: ${err.message}` : "No pude crear el proyecto." };
    }
  }
  // (c) La oportunidad queda ganada, con su cliente y proyecto; la cotización, ligada al proyecto.
  const ahora = new Date();
  const escrituras: Prisma.PrismaPromise<unknown>[] = [
    prisma.oportunidad.update({ where: { id }, data: { estado: "ganada", etapaId: ganada.id, probabilidad: 100, cerradaAt: ahora, clientId, projectId, motivoPerdida: null } }),
  ];
  if (op.cotizacion && !op.cotizacion.projectId) escrituras.push(prisma.document.update({ where: { id: op.cotizacion.id }, data: { projectId, clientId } }));
  await prisma.$transaction(escrituras);
  await Promise.all([
    anotar(u, { ...op, clientId }, `ganada por ${Number(op.valor).toFixed(2)} USD`),
    registrarEvento({ userId: u.id, clientId, projectId, entityType: "oportunidad", entityId: op.id, kind: "oportunidad_ganada", title: `Ganada: ${op.titulo}`, detail: `${Number(op.valor).toFixed(2)} USD`, visibility: "interno", actorEmpresaUserId: u.miembro.id }),
  ]);
  refrescar(id, ["/empresa/clientes", `/empresa/clientes/${clientId}`, "/empresa/proyectos", "/empresa/leads", ...(op.leadId ? [`/empresa/leads/${op.leadId}`] : [])]);
  return { ok: true, mensaje: `Ganada. ${op.lead && !op.clientId ? (reutilizado ? "Se usó el cliente que ya tenía ese correo" : "Se creó el cliente") + " y su proyecto." : "Se creó su proyecto."}` };
}

export async function perderOportunidadAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const elegido = txt(form.get("motivo"), 60);
  const otro = txt(form.get("otro"), 300);
  const motivo = elegido === "otro" ? otro : (MOTIVOS_PERDIDA as readonly string[]).includes(elegido) ? elegido : "";
  if (!motivo) return { error: elegido === "otro" ? "Escribe el motivo." : "Elige por qué se perdió." };
  const op = await prisma.oportunidad.findFirst({ where: { id, userId: u.id } });
  if (!op) return { error: "No encontré esa oportunidad." };
  const etapas = await asegurarEtapas(u.id);
  const perdida = etapas.find((e) => e.tipo === "perdida")!;
  await prisma.oportunidad.update({ where: { id }, data: { estado: "perdida", etapaId: perdida.id, probabilidad: 0, motivoPerdida: motivo, cerradaAt: new Date() } });
  await anotar(u, op, `perdida: ${motivo}`);
  refrescar(id);
  return { ok: true, mensaje: "Marcada como perdida." };
}

/** Vuelve a abrir una oportunidad cerrada en la primera etapa abierta (el proyecto creado, si hubo, se queda). */
export async function reabrirOportunidadAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const op = await prisma.oportunidad.findFirst({ where: { id, userId: u.id } });
  if (!op) return { error: "No encontré esa oportunidad." };
  const primera = (await asegurarEtapas(u.id)).find((e) => e.tipo === "abierta")!;
  await prisma.oportunidad.update({ where: { id }, data: { estado: "abierta", etapaId: primera.id, probabilidad: primera.probabilidad, cerradaAt: null, motivoPerdida: null } });
  await anotar(u, op, `reabierta en ${primera.nombre}`);
  refrescar(id);
  return { ok: true, mensaje: `Abierta otra vez en ${primera.nombre}.` };
}

/** Crea el borrador de la cotización con los datos de la oportunidad y abre el armador de siempre para terminarla. */
export async function crearCotizacionAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const op = await prisma.oportunidad.findFirst({ where: { id, userId: u.id }, include: { lead: true, client: true } });
  if (!op) return { error: "No encontré esa oportunidad." };
  if (op.cotizacionId) redirect(`/empresa/cotizaciones/${op.cotizacionId}`);
  const quien = op.client ?? op.lead;
  const tasa = Number(u.config?.taxRatePercent ?? 7);
  const valor = Number(op.valor);
  const impuesto = Math.round(valor * tasa) / 100;
  const doc = await createDocumentAction({
    type: "COTIZACION",
    title: op.titulo,
    clientName: quien?.name ?? undefined,
    clientEmail: quien?.email ?? undefined,
    clientCompany: quien?.company ?? undefined,
    clientAddress: quien?.address ?? undefined,
    clientRuc: op.client?.ruc ?? undefined,
    clientId: op.clientId ?? undefined,
    leadId: op.clientId ? undefined : op.leadId ?? undefined,
    content: { lineItems: [{ description: op.titulo, quantity: 1, unitPrice: valor, taxPercent: tasa, discount: 0 }], notes: "", terms: "", currency: u.config?.currency ?? "USD", pdfPaymentMethodIds: [] },
    subtotal: valor,
    taxAmount: impuesto,
    total: Math.round((valor + impuesto) * 100) / 100,
    currency: u.config?.currency ?? "USD",
    status: "DRAFT",
  });
  await prisma.oportunidad.update({ where: { id }, data: { cotizacionId: doc.id } });
  await anotar(u, op, `cotización ${doc.number ?? ""} en borrador`.replace(/\s+/g, " "));
  refrescar(id);
  redirect(`/empresa/cotizaciones/${doc.id}`);
}

/** Liga una cotización que ya existe (del mismo lead o cliente) a la oportunidad. */
export async function vincularCotizacionAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const cotizacionId = txt(form.get("cotizacionId"), 40);
  const op = await prisma.oportunidad.findFirst({ where: { id, userId: u.id } });
  if (!op) return { error: "No encontré esa oportunidad." };
  if (!cotizacionId) {
    await prisma.oportunidad.update({ where: { id }, data: { cotizacionId: null } });
    refrescar(id);
    return { ok: true, mensaje: "Cotización desligada." };
  }
  const doc = await prisma.document.findFirst({ where: { id: cotizacionId, userId: u.id, type: "COTIZACION" }, select: { id: true, number: true, total: true } });
  if (!doc) return { error: "No encontré esa cotización." };
  await prisma.oportunidad.update({ where: { id }, data: { cotizacionId: doc.id } });
  await anotar(u, op, `ligada a la cotización ${doc.number ?? ""}`.trim());
  refrescar(id);
  return { ok: true, mensaje: `Ligada a ${doc.number ?? "la cotización"}.` };
}

// ─── Lead (detalle editable) ─────────────────────────────────────────────────

export async function guardarLeadAction(_: EstadoEmbudo, form: FormData): Promise<EstadoEmbudo> {
  const u = await getEmpresaUser();
  const id = txt(form.get("id"), 40);
  const lead = await prisma.lead.findFirst({ where: { id, userId: u.id }, select: { id: true } });
  if (!lead) return { error: "No encontré ese lead." };
  const name = txt(form.get("name"), 120);
  if (!name) return { error: "El lead necesita un nombre." };
  const email = txt(form.get("email"), 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El correo no es válido." };
  const valorTxt = txt(form.get("estimatedValue"), 30);
  const estimatedValue = monto(form.get("estimatedValue"));
  if (valorTxt && estimatedValue == null) return { error: "El valor estimado debe ser un número." };
  const segTxt = txt(form.get("nextFollowUpAt"), 10);
  const nextFollowUpAt = segTxt ? fechaDe(segTxt) : null;
  if (segTxt && !nextFollowUpAt) return { error: "La fecha de seguimiento no es válida." };
  const source = fuenteValida(txt(form.get("source"), 30));
  const etiquetas = [...new Set(txt(form.get("etiquetas"), 600).split(",").map((t) => t.trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
  await prisma.lead.update({
    where: { id },
    data: {
      name,
      company: txt(form.get("company"), 120) || null,
      email: email || null,
      phone: txt(form.get("phone"), 40) || null,
      address: txt(form.get("address"), 200) || null,
      city: txt(form.get("city"), 80) || null,
      ...(source ? { source: source as LeadSource } : {}),
      estimatedValue,
      nextFollowUpAt,
      lostReason: txt(form.get("lostReason"), 300) || null,
      etiquetas,
      notes: txt(form.get("notes"), 4000) || null,
    },
  });
  revalidatePath("/empresa/leads");
  revalidatePath(`/empresa/leads/${id}`);
  return { ok: true, mensaje: "Datos del lead guardados." };
}
