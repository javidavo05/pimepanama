"use server";

import { responderEncuesta } from "@/lib/crm/encuesta";

export type EstadoEncuesta = { ok?: boolean; error?: string; yaRespondida?: boolean };

/** Respuesta pública de la encuesta: el token del enlace es la única llave (firmado, una sola respuesta). */
export async function responder(_: EstadoEncuesta, form: FormData): Promise<EstadoEncuesta> {
  try {
    const r = await responderEncuesta(String(form.get("token") ?? ""), form.get("puntaje"), form.get("comentario"));
    return r.ok ? { ok: true } : { error: r.error, yaRespondida: r.yaRespondida };
  } catch (err) {
    console.error("[encuesta] respuesta sin guardar", err);
    return { error: "No pudimos guardar tu respuesta. Inténtalo otra vez en un momento." };
  }
}
