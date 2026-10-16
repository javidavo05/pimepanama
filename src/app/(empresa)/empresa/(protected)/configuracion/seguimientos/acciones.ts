"use server";

/** Guarda las reglas de seguimiento del CRM (CompanyConfig.reglasCrm). Las aplica el cron diario (lib/crm/seguimientos.ts). */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSeccion } from "@/lib/auth/exigir";
import { LIMITES_DIAS, reglasAJson, type ReglasCrm } from "@/lib/crm/seguimientos-reglas";

export type EstadoReglas = { ok?: boolean; error?: string; mensaje?: string } | null;

const CLAVES = ["leadSinRespuesta", "clienteSinContacto", "renovacion"] as const;

export async function guardarReglasAction(_: EstadoReglas, form: FormData): Promise<EstadoReglas> {
  const u = await exigirSeccion("empresa");
  if (!u.configId) return { error: "Primero guarda los datos de la empresa en Configuración." };
  const reglas = {} as ReglasCrm;
  for (const k of CLAVES) {
    const activa = form.get(`${k}Activa`) === "on";
    const dias = Math.trunc(Number(String(form.get(`${k}Dias`) ?? "").trim()));
    if (activa && (!Number.isFinite(dias) || dias < LIMITES_DIAS.min || dias > LIMITES_DIAS.max)) {
      return { error: `Los días tienen que estar entre ${LIMITES_DIAS.min} y ${LIMITES_DIAS.max}.` };
    }
    reglas[k] = { activa, dias: Number.isFinite(dias) && dias >= LIMITES_DIAS.min && dias <= LIMITES_DIAS.max ? dias : 0 };
  }
  // Una regla apagada conserva sus días para cuando se vuelva a encender.
  const actual = await prisma.companyConfig.findUnique({ where: { id: u.configId }, select: { reglasCrm: true } });
  const previo = (actual?.reglasCrm ?? {}) as Record<string, unknown>;
  const json: Record<string, number | boolean> = reglasAJson(reglas);
  for (const k of CLAVES) if (!reglas[k].dias && typeof previo[`${k}Dias`] === "number") json[`${k}Dias`] = previo[`${k}Dias`] as number;
  await prisma.companyConfig.update({ where: { id: u.configId }, data: { reglasCrm: json } });
  revalidatePath("/empresa/configuracion/seguimientos");
  const encendidas = CLAVES.filter((k) => reglas[k].activa).length;
  return { ok: true, mensaje: encendidas ? `Reglas guardadas. Desde mañana temprano se crean solas las tareas (${encendidas} de 3 encendidas).` : "Reglas guardadas. Todas están apagadas: no se crearán tareas automáticas." };
}
