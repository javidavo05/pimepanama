"use server";

/** Baja de las campañas desde el enlace del correo. Pública: la firma del token es la única llave. */
import { prisma } from "@/lib/prisma";
import { leerTokenBaja } from "@/lib/crm/correo-baja";
import { TEXTOS } from "./textos";

export type EstadoBaja = { ok?: boolean; error?: string } | null;

export async function confirmarBajaAction(_: EstadoBaja, form: FormData): Promise<EstadoBaja> {
  const t = TEXTOS[form.get("idioma") === "en" ? "en" : "es"];
  const quien = leerTokenBaja(String(form.get("token") ?? "").slice(0, 600));
  if (!quien) return { error: t.errorToken };
  try {
    await prisma.bajaCorreo.upsert({
      where: { userId_email: { userId: quien.userId, email: quien.email } },
      create: { userId: quien.userId, email: quien.email },
      update: {},
    });
  } catch (e) {
    console.error("[baja] guardar", e);
    return { error: t.errorGuardar };
  }
  return { ok: true };
}
