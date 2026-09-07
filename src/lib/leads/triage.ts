import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { classifyLead, type LeadKind } from "./classify";
import { notifyUser } from "@/lib/notifications/notify";

const KIND_LABEL: Record<Exclude<LeadKind, "prospecto">, string> = {
  spam: "Spam",
  proveedor: "Publicidad entrante",
  prueba: "Envío de prueba",
};

/**
 * Clasifica un lead recién entrado por el formulario y avisa al equipo.
 *
 * Corre DESPUÉS de responderle al visitante (`after()` en la ruta): la llamada
 * al modelo tarda un par de segundos y no hay razón para que el formulario se
 * quede pensando mientras tanto. El lead ya está guardado antes de llegar acá.
 *
 * Nunca lanza. Si la clasificación falla, igual sale el aviso: perder la
 * prioridad es molesto, perder el aviso de un cliente es el problema que este
 * sistema existe para no repetir.
 */
export async function triageLead(lead: Lead, opts: { repeat: boolean }) {
  let priority = lead.priority;
  let kind: LeadKind = "prospecto";
  let reason = "";

  try {
    const verdict = await classifyLead({
      name: lead.name,
      email: lead.email ?? "",
      company: lead.company,
      phone: lead.phone,
      // Las notas ya traen el mensaje del formulario con su fecha.
      message: lead.notes ?? "",
      receivedAt: lead.createdAt,
    });

    kind = verdict.kind;
    reason = verdict.reason;
    // Lo que no es un prospecto no se descarta solo: baja de prioridad y queda
    // en el tablero con el motivo escrito. Un falso positivo que se archiva
    // solo es exactamente el cliente perdido que queremos dejar de perder.
    priority = kind === "prospecto" ? verdict.priority : "BAJA";

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        priority,
        priorityReason:
          kind === "prospecto" ? reason : `${KIND_LABEL[kind]} según la IA — ${reason}`,
      },
    });
  } catch (err) {
    console.error("[triage] no se pudo clasificar el lead", lead.id, err);
  }

  const quien = lead.company ? `${lead.name} · ${lead.company}` : lead.name;
  const titulo =
    kind !== "prospecto"
      ? `${KIND_LABEL[kind]}: ${lead.name}`
      : opts.repeat
        ? `${lead.name} volvió a escribir`
        : priority === "ALTA"
          ? `Lead ALTA: ${quien}`
          : `Nuevo lead: ${quien}`;

  await notifyUser({
    userId: lead.userId,
    title: titulo,
    body: reason || (lead.notes ?? "").slice(0, 240),
    link: `/empresa/leads/${lead.id}`,
    tag: `lead-${lead.id}`,
    // El spam y la publicidad quedan en la campana, pero no suenan el teléfono.
    push: kind === "prospecto",
  });
}
