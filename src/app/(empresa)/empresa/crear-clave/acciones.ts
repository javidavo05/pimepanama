"use server";

/** El invitado al equipo crea su contraseña con el enlace del correo (token de un solo uso de Supabase). */
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { errorDeClave } from "@/lib/auth/reglas-clave";

export type EstadoClave = { error?: string } | null;

export async function crearClaveEquipoAction(_: EstadoClave, form: FormData): Promise<EstadoClave> {
  const th = String(form.get("th") ?? "");
  const tipo = String(form.get("t") ?? "invite") === "recovery" ? "recovery" : "invite";
  const clave = String(form.get("clave") ?? "");
  const debil = errorDeClave(clave);
  if (debil) return { error: debil };
  if (clave !== String(form.get("repetir") ?? "")) return { error: "Las dos contraseñas no coinciden." };
  const supabase = await createSupabaseServerClient();
  const { error: e1 } = await supabase.auth.verifyOtp({ type: tipo, token_hash: th });
  if (e1) return { error: "El enlace venció o ya se usó. Pídele al dueño que te invite otra vez." };
  const { error: e2 } = await supabase.auth.updateUser({ password: clave });
  if (e2) return { error: "No se pudo guardar la contraseña. Inténtalo de nuevo." };
  // Al entrar se crea su cuenta del equipo con su área y se le pide la doble verificación.
  redirect("/empresa");
}
