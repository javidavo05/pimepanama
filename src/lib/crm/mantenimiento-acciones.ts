"use server";

/** Guarda el mantenimiento mensual de un proyecto (formulario de edición del proyecto). */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer } from "@/lib/auth/permisos";
import { DIA_MAX, DIA_MIN, diaValido } from "./mantenimiento-reglas";

export async function guardarMantenimientoAction(projectId: string, datos: { activo: boolean; monto: number | null; dia: number }): Promise<{ ok?: boolean; error?: string }> {
  const u = await getEmpresaUser();
  if (!puedeVer(u.miembro.area, "proyectos")) return { error: "Tu área del equipo no puede editar proyectos." };
  const p = await prisma.project.findFirst({ where: { id: projectId, userId: u.id }, select: { id: true } });
  if (!p) return { error: "No encontré ese proyecto." };
  const dia = diaValido(datos.dia);
  if (!dia) return { error: `El día del mes va del ${DIA_MIN} al ${DIA_MAX}.` };
  const monto = datos.monto == null ? null : Math.round(Number(datos.monto) * 100) / 100;
  if (datos.activo && !(monto != null && Number.isFinite(monto) && monto > 0)) return { error: "Escribe el monto mensual del mantenimiento." };
  await prisma.project.update({ where: { id: p.id }, data: { mantenimientoActivo: datos.activo, mantenimientoMonto: monto != null && Number.isFinite(monto) ? monto : null, mantenimientoDia: dia } });
  revalidatePath(`/empresa/proyectos/${p.id}`);
  return { ok: true };
}
