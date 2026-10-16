/**
 * Embudo de ventas: lo que toca la base. Etapas por dueño y conversión de un lead en cliente
 * (la usan «Marcar ganada» de una oportunidad y el paso de un lead a GANADO).
 */
import type { Lead, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asignarClienteDeLead } from "@/lib/motor/enlaces";
import { ETAPAS_INICIALES, elegirClientePorCorreo, etiquetaFuente, normalizarCorreo, ordenarEtapas } from "./embudo";

type Db = Prisma.TransactionClient | typeof prisma;

/** Las etapas del dueño, ordenadas. Si todavía no tiene, crea las de siempre (Nuevo … Perdido). */
export async function asegurarEtapas(userId: string) {
  const etapas = await prisma.etapaEmbudo.findMany({ where: { userId } });
  if (etapas.length > 0) {
    // Un embudo sin columna de ganadas o perdidas no puede cerrar negocios: se agrega la que falte.
    const faltan = ETAPAS_INICIALES.filter((e) => e.tipo !== "abierta" && !etapas.some((x) => x.tipo === e.tipo));
    if (faltan.length === 0) return ordenarEtapas(etapas);
    await prisma.etapaEmbudo.createMany({ data: faltan.map((e, i) => ({ userId, nombre: e.nombre, probabilidad: e.probabilidad, tipo: e.tipo, orden: 100 + i })) });
  } else {
    await prisma.etapaEmbudo.createMany({ data: ETAPAS_INICIALES.map((e, orden) => ({ userId, nombre: e.nombre, probabilidad: e.probabilidad, tipo: e.tipo, orden })) });
  }
  return ordenarEtapas(await prisma.etapaEmbudo.findMany({ where: { userId } }));
}

/** El cliente que ya existe con ese correo (sin importar mayúsculas), o null. */
export async function clientePorCorreo(userId: string, email: string | null | undefined, db: Db = prisma) {
  const correo = normalizarCorreo(email);
  if (!correo) return null;
  const candidatos = await db.client.findMany({
    where: { userId, email: { contains: correo, mode: "insensitive" } },
    select: { id: true, email: true, archivedAt: true, createdAt: true, fuente: true, notes: true },
  });
  return elegirClientePorCorreo(candidatos, correo);
}

/**
 * Convierte un lead en cliente: reutiliza el cliente que ya tenga su correo o crea uno nuevo con sus datos
 * (nombre, empresa, correo, teléfono, dirección, fuente y notas). Marca el lead GANADO y convertido, y pasa
 * al cliente sus cotizaciones, las facturas que salieron de ellas y sus pagos.
 */
export async function convertirLeadEnCliente(db: Prisma.TransactionClient, userId: string, lead: Lead) {
  let clientId = lead.convertedClientId;
  let reutilizado = false;
  if (!clientId) {
    const existente = await clientePorCorreo(userId, lead.email, db);
    if (existente) {
      clientId = existente.id;
      reutilizado = true;
      // Solo completa lo que el cliente no tenía: nunca pisa datos que el equipo ya cargó.
      const extra: Prisma.ClientUpdateInput = {};
      if (!existente.fuente) extra.fuente = etiquetaFuente(lead.source);
      if (!existente.notes && lead.notes) extra.notes = lead.notes;
      if (Object.keys(extra).length) await db.client.update({ where: { id: existente.id }, data: extra });
    } else {
      const nuevo = await db.client.create({
        data: {
          name: lead.name,
          company: lead.company,
          email: lead.email?.trim() || null,
          phone: lead.phone,
          address: lead.address,
          city: lead.city,
          country: lead.country,
          fuente: etiquetaFuente(lead.source),
          notes: lead.notes,
          etiquetas: lead.etiquetas ?? [],
          responsableId: lead.responsableId,
          userId,
        },
      });
      clientId = nuevo.id;
    }
  }
  const actualizado = await db.lead.update({
    where: { id: lead.id },
    data: { status: "GANADO", convertedClientId: clientId, convertedAt: lead.convertedAt ?? new Date() },
  });
  await db.document.updateMany({ where: { leadId: lead.id, clientId: null }, data: { clientId } });
  await asignarClienteDeLead(lead.id, clientId, db);
  // Sus otras oportunidades también pasan al cliente.
  await db.oportunidad.updateMany({ where: { leadId: lead.id, clientId: null }, data: { clientId } });
  return { clientId, reutilizado, lead: actualizado };
}
