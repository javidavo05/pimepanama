"use server";

/** Fusionar dos clientes duplicados (fase 6 del CRM). La lógica y la transacción viven en src/lib/crm/duplicados-fusion.ts. */
import { revalidatePath } from "next/cache";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { fusionarClientes } from "@/lib/crm/duplicados-fusion";
import { CAMPO_LABEL } from "@/lib/crm/duplicados";

export type EstadoFusion = { ok?: boolean; error?: string; mensaje?: string; quedaId?: string } | null;

export async function fusionarClientesAction(_: EstadoFusion, form: FormData): Promise<EstadoFusion> {
  const u = await getEmpresaUser();
  const quedaId = String(form.get("queda") ?? "").slice(0, 40);
  const otroId = String(form.get("otro") ?? "").slice(0, 40);
  if (!quedaId || !otroId || quedaId === otroId) return { error: "Elige dos clientes distintos." };
  if (form.get("confirmado") !== "1") return { error: "Confirma la fusión antes de seguir." };
  try {
    const r = await fusionarClientes(u.id, quedaId, otroId);
    revalidatePath("/empresa/clientes");
    revalidatePath("/empresa/clientes/duplicados");
    revalidatePath(`/empresa/clientes/${quedaId}`);
    const datos = r.completados.length ? ` Se completaron: ${r.completados.map((c) => CAMPO_LABEL[c].toLowerCase()).join(", ")}.` : "";
    return { ok: true, quedaId, mensaje: `«${r.nombreOtro}» quedó fusionado: se movieron ${r.movidos} ${r.movidos === 1 ? "registro" : "registros"}.${datos}` };
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m === "cliente no encontrado") return { error: "Uno de los dos clientes ya no existe. Recarga la página." };
    if (m === "interna") return { error: "La empresa interna no se fusiona dentro de un cliente. Déjala como la que queda." };
    console.error("[fusionar]", e);
    return { error: "No se pudo fusionar. No se movió nada; intenta de nuevo." };
  }
}
