"use server";

/** Acciones del asistente «Cobrar»: qué se le puede facturar a un cliente y crear esa factura ya ligada. */
import { revalidatePath } from "next/cache";
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

export async function verificarGithubAction(projectId: string): Promise<{ ok: true } | { error: string }> {
  const u = await getEmpresaUser();
  const { verificarConGithub } = await import("@/lib/motor/verificar-github");
  try {
    await verificarConGithub(u.id, projectId);
    revalidatePath(`/empresa/proyectos/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer GitHub." };
  }
}
