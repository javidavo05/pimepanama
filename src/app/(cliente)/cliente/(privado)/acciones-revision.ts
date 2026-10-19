"use server";

/** La única escritura de la vista de revisión: el equipo confirma que la cuenta del cliente está en orden. */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalUser } from "@/lib/portal/sesion";
import { registrarEvento } from "@/lib/portal/eventos";
import { VISTA_COOKIE } from "@/lib/portal/vista";

export async function marcarCuentaRevisadaAction() {
  const p = await getPortalUser();
  const v = p.vista;
  if (!v) redirect("/cliente");
  await prisma.client.update({ where: { id: v.clientId }, data: { portalReviewedAt: new Date(), portalReviewedBy: v.revisor } });
  await registrarEvento({
    userId: v.empresaUserId, clientId: v.clientId, entityType: "cuenta", entityId: v.clientId, kind: "cuenta_revisada",
    title: `${v.revisor} revisó la cuenta del cliente y confirmó que está en orden`, visibility: "interno", actorType: "pime",
  });
  (await cookies()).delete(VISTA_COOKIE);
  redirect(`/empresa/clientes/${v.clientId}?tab=cuenta&revisada=1`);
}
