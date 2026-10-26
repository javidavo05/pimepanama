"use server";

/** El cerebro de la IA de toda la plataforma (OpenAI o Claude). Lo cambia el dueño desde Jarvis. */
import { revalidatePath } from "next/cache";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { cerebrosDisponibles, guardarCerebro, NOMBRE_CEREBRO, type Cerebro } from "@/lib/ai/cerebro";

export async function cambiarCerebroAction(cerebro: Cerebro): Promise<{ ok: true } | { error: string }> {
  const u = await getEmpresaUser();
  if (u.miembro.area && u.miembro.area !== "dueno") return { error: "Solo el dueño cambia el cerebro de la plataforma." };
  if (!u.configId) return { error: "Primero guarda los datos de la empresa en Configuración." };
  if (cerebro !== "openai" && cerebro !== "claude") return { error: "Ese cerebro no existe." };
  if (!cerebrosDisponibles()[cerebro]) return { error: `${NOMBRE_CEREBRO[cerebro]} no tiene su llave en el servidor.` };
  await guardarCerebro(u.configId, cerebro);
  revalidatePath("/empresa");
  return { ok: true };
}
