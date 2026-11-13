"use server";

/** Qué llave de OpenAI usa la plataforma. Solo el dueño la cambia; antes de guardar se prueba con OpenAI. */
import { revalidatePath } from "next/cache";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { guardarAlias, llavesOpenAI, probarLlave } from "@/lib/ai/llave-openai";

export async function cambiarLlaveOpenAIAction(alias: string): Promise<{ ok: true } | { error: string }> {
  const u = await getEmpresaUser();
  if (!u.miembro.esDueno) return { error: "Solo el dueño cambia la llave de OpenAI." };
  if (!u.configId) return { error: "Primero guarda los datos de la empresa en Configuración." };
  if (!llavesOpenAI().some((l) => l.alias === alias)) return { error: `No hay llave «${alias}» en el servidor.` };
  const prueba = await probarLlave(alias);
  if ("error" in prueba) return prueba;
  await guardarAlias(u.configId, alias);
  revalidatePath("/empresa/configuracion");
  return { ok: true };
}
