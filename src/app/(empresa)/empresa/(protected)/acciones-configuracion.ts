"use server";

/** Configuración de clientes: tarifas por línea, línea de cada cliente y envíos a clientes. */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";

export type EstadoConfig = { error?: string; ok?: boolean; mensaje?: string } | null;
const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(/[^\d.]/g, ""));

function refrescar() {
  ["/empresa/configuracion", "/empresa/configuracion/clientes", "/empresa/clientes"].forEach((p) => revalidatePath(p));
}

export async function guardarTarifasAction(_: EstadoConfig, form: FormData): Promise<EstadoConfig> {
  const u = await getEmpresaUser();
  if (!u.configId) return { error: "Primero guarda los datos de la empresa en Configuración." };
  const normal = num(form.get("normal")), premium = num(form.get("premium"));
  if (!(normal > 0) || !(premium > 0) || normal > 10000 || premium > 10000) return { error: "Escribe tarifas mayores que cero." };
  await prisma.companyConfig.update({ where: { id: u.configId }, data: { hourlyRateNormal: normal, hourlyRatePremium: premium } });
  refrescar();
  return { ok: true, mensaje: `Tarifas guardadas: Normal $${normal} y Premium $${premium} la hora. Aplican a las horas que se registren desde ahora.` };
}

export async function cambiarLineaAction(clientId: string, linea: "normal" | "premium"): Promise<EstadoConfig> {
  const u = await getEmpresaUser();
  const c = await prisma.client.findFirst({ where: { id: clientId, userId: u.id }, select: { id: true } });
  if (!c) return { error: "No encontré ese cliente." };
  await prisma.client.update({ where: { id: c.id }, data: { brandLine: linea === "premium" ? "premium" : "normal" } });
  refrescar();
  revalidatePath(`/empresa/clientes/${c.id}`);
  return { ok: true };
}

export async function enviosClientesAction(_: EstadoConfig, form: FormData): Promise<EstadoConfig> {
  const u = await getEmpresaUser();
  if (!u.configId) return { error: "Primero guarda los datos de la empresa en Configuración." };
  const encender = form.get("encender") === "1";
  await prisma.companyConfig.update({ where: { id: u.configId }, data: { clientEmailsEnabled: encender } });
  refrescar();
  return { ok: true, mensaje: encender ? "Envíos a clientes encendidos." : "Envíos a clientes apagados. No sale ningún correo a clientes." };
}
