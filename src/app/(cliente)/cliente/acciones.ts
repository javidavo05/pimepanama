"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { activarPersona, enviarRecuperacion } from "@/lib/portal/invitaciones";

export type Estado = { error?: string; ok?: boolean } | null;

/** Crear contraseña desde la invitación y entrar de una vez. */
export async function activarCuentaAction(_: Estado, form: FormData): Promise<Estado> {
  const token = String(form.get("token") ?? "");
  const nombre = String(form.get("nombre") ?? "").trim();
  const clave = String(form.get("clave") ?? "");
  const repetir = String(form.get("repetir") ?? "");
  if (!nombre) return { error: "Escribe tu nombre." };
  if (clave !== repetir) return { error: "Las dos contraseñas no coinciden." };
  const r = await activarPersona(token, nombre, clave);
  if (!r.ok) return { error: r.error };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: clave });
  if (error) return { error: "Tu cuenta quedó lista, pero no pudimos abrirla. Entra con tu correo y contraseña." };
  redirect("/cliente");
}

/** «Olvidé mi contraseña». Siempre responde lo mismo para no revelar qué correos tienen cuenta. */
export async function recuperarAction(_: Estado, form: FormData): Promise<Estado> {
  await enviarRecuperacion(String(form.get("email") ?? ""));
  return { ok: true };
}

/** Elegir contraseña nueva desde el enlace del correo. */
export async function nuevaClaveAction(_: Estado, form: FormData): Promise<Estado> {
  const th = String(form.get("th") ?? "");
  const clave = String(form.get("clave") ?? "");
  if (clave.length < 10) return { error: "La contraseña necesita al menos 10 caracteres." };
  if (clave !== String(form.get("repetir") ?? "")) return { error: "Las dos contraseñas no coinciden." };
  const supabase = await createSupabaseServerClient();
  const { error: e1 } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: th });
  if (e1) return { error: "El enlace venció o ya se usó. Pide uno nuevo en «Olvidé mi contraseña»." };
  const { error: e2 } = await supabase.auth.updateUser({ password: clave });
  if (e2) return { error: "No se pudo guardar la contraseña nueva. Inténtalo de nuevo." };
  redirect("/cliente");
}
