"use server";

/** Acciones del asistente «Cobrar»: qué se le puede facturar a un cliente y crear esa factura ya ligada. */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { crearCobro, opcionesDeCobro, type Cobro } from "@/lib/motor/cobros";

export type OpcionesCobro = Awaited<ReturnType<typeof opcionesDeCobro>>;

export async function opcionesCobroAction(clientId: string): Promise<OpcionesCobro | { error: string }> {
  const u = await getEmpresaUser();
  try { return await opcionesDeCobro(u.id, clientId); } catch { return { error: "No se pudieron cargar los cobros de este cliente." }; }
}

export async function crearCobroAction(cobro: Cobro): Promise<{ id: string; number: string | null } | { error: string }> {
  const u = await getEmpresaUser();
  try {
    const r = await crearCobro(u, cobro);
    ["/empresa", "/empresa/dinero", "/empresa/facturas", "/empresa/clientes", "/empresa/cuentas-por-cobrar"].forEach((p) => revalidatePath(p));
    return r;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la factura." };
  }
}

/** «Revisar ahora»: la misma revisión única del motor (GitHub, fases, salud), a demanda. */
export async function verificarGithubAction(projectId: string): Promise<{ ok: true } | { error: string }> {
  const u = await getEmpresaUser();
  const p = await prisma.project.findFirst({ where: { id: projectId, userId: u.id }, select: { id: true } });
  if (!p) return { error: "No encontré ese proyecto." };
  const { revisarProyecto } = await import("@/lib/motor/sistemas");
  try {
    const r = await revisarProyecto(p.id);
    ["/empresa/sistemas", `/empresa/proyectos/${p.id}`].forEach((x) => revalidatePath(x));
    return r?.github?.error ? { error: r.github.error } : { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo revisar el sistema." };
  }
}
