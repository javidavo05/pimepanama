"use server";

/** «Qué le falta» al proyecto: marcar o desmarcar un requisito como «No aplica» (Project.linkWaived, 0047). */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { esRequisito } from "@/lib/proyectos/completitud";

export async function marcarNoAplicaAction(projectId: string, key: string, noAplica: boolean): Promise<{ error?: string }> {
  if (!esRequisito(key)) return { error: "Ese requisito no existe." };
  const user = await getEmpresaUser();
  const p = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true, linkWaived: true } });
  if (!p) return { error: "No se encontró el proyecto." };
  const next = new Set(p.linkWaived);
  if (noAplica) next.add(key);
  else next.delete(key);
  await prisma.project.update({ where: { id: p.id }, data: { linkWaived: [...next] } });
  revalidatePath(`/empresa/proyectos/${p.id}`);
  revalidatePath("/empresa/proyectos");
  return {};
}
