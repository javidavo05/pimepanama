"use server";

/** Compartir (o dejar de compartir) la minuta ejecutiva de una reunión en la cuenta del cliente. */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { registrarEvento } from "@/lib/portal/eventos";

export type EstadoCompartir = { ok?: boolean; error?: string; mensaje?: string } | null;

export async function compartirMinutaAction(_: EstadoCompartir, form: FormData): Promise<EstadoCompartir> {
  const u = await getEmpresaUser();
  const id = String(form.get("meetingId") ?? "");
  const compartir = form.get("compartir") === "1";
  const m = await prisma.meeting.findFirst({ where: { id, userId: u.id }, select: { id: true, title: true, clientId: true, projectId: true, compartidaCliente: true, executiveMinutes: true } });
  if (!m) return { error: "No encontré esa reunión." };
  if (!m.clientId) return { error: "Asigna un cliente a la reunión antes de compartirla." };
  if (compartir && !m.executiveMinutes) return { error: "La minuta ejecutiva todavía no está lista." };
  if (m.compartidaCliente === compartir) return { ok: true, mensaje: compartir ? "Ya estaba compartida." : "Ya no estaba compartida." };
  await prisma.meeting.update({ where: { id: m.id }, data: { compartidaCliente: compartir } });
  if (compartir) {
    await registrarEvento({ userId: u.id, clientId: m.clientId, projectId: m.projectId, entityType: "reunion", entityId: m.id, kind: "minuta_compartida", title: `Pime compartió la minuta de «${m.title}»`, visibility: "cliente", actorType: "pime", actorEmpresaUserId: u.miembro.id });
  }
  revalidatePath(`/empresa/reuniones/${m.id}`);
  revalidatePath("/cliente/reuniones");
  revalidatePath(`/cliente/reuniones/${m.id}`);
  revalidatePath("/cliente/documentos");
  return { ok: true, mensaje: compartir ? "El cliente ya ve la minuta ejecutiva en su cuenta." : "La minuta dejó de verse en la cuenta del cliente." };
}
