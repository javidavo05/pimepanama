import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireProspectorUser } from "@/lib/devices/tokens";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/notify";
import { aprobarDelAgente, enviarCola, estadoEnvio } from "@/lib/leads/envio-automatico";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Margen para responder antes del límite de la función. */
const TIEMPO_POR_LLAMADA_MS = 200_000;

/**
 * Envío automático del agente de prospección (src/lib/leads/envio-automatico.ts). Misma llave «prospectos».
 *
 * GET  → cupo de hoy, cola y si el envío está en pausa.
 * POST {aprobar?: ids} → las que el agente aprueba después de leer su versión final (prospectos/preparar) pasan por
 *       la segunda verificación (revisión fija + IA verificadora): entran a la cola o quedan retenidas con el motivo.
 *       Lo que no alcanzó a verificarse vuelve en `porVerificar`. Con todo verificado, envía la cola hasta el cupo de
 *       hoy. Mientras responda `seguir: true`, el agente vuelve a llamar con {aprobar: porVerificar} (o {}).
 *       Cuando termina, le avisa a Javier el resumen.
 */
export const GET = withEmpresaRoute(async (request) => {
  const u = await requireProspectorUser(request);
  return NextResponse.json(await estadoEnvio(u.ownerId ?? u.id));
});

export const POST = withEmpresaRoute(async (request) => {
  const u = await requireProspectorUser(request);
  const userId = u.ownerId ?? u.id;
  const dueno = u.ownerId ? await prisma.empresaUser.findUnique({ where: { id: u.ownerId }, select: { configId: true } }) : u;
  const body = (await request.json().catch(() => null)) as { aprobar?: unknown } | null;
  const ids = Array.isArray(body?.aprobar) ? body!.aprobar.filter((i): i is string => typeof i === "string") : [];

  const inicio = Date.now();
  const revision = ids.length
    ? await aprobarDelAgente({ userId, supabaseUid: u.supabaseUid, ids, tiempoMs: TIEMPO_POR_LLAMADA_MS })
    : { aprobadas: [], retenidas: [], porVerificar: [] };
  // Primero se verifica todo lo aprobado; recién entonces se envía, con el tiempo que quede.
  const quedan = TIEMPO_POR_LLAMADA_MS - (Date.now() - inicio);
  const envio = revision.porVerificar.length || quedan < 30_000
    ? { enviadas: [], retenidas: [], seguir: true, estado: await estadoEnvio(userId) }
    : await enviarCola({ userId, supabaseUid: u.supabaseUid, configId: dueno?.configId ?? null, tiempoMs: quedan });

  if (!envio.seguir) {
    const e = envio.estado;
    const retenidas = revision.retenidas.length + envio.retenidas.length;
    await notifyUser({
      userId,
      title: e.pausado ? "Envío automático en pausa" : `Hoy salieron ${e.usados} de ${e.delDia} correos`,
      body: e.pausado
        ? `${e.pausado} Revisa en Respuestas antes de seguir.`
        : [
            e.enCola ? `${e.enCola} en cola: sale todo para el ${e.seVaciaEl} si no entra nada más.` : "La cola quedó vacía.",
            retenidas ? `${retenidas} retenidos para revisar a mano.` : "",
          ].filter(Boolean).join(" "),
      link: "/empresa/leads?vista=respuestas",
      tag: "agente-envio",
    }).catch(() => undefined);
  }
  return NextResponse.json({ aprobadas: revision.aprobadas, retenidasEnRevision: revision.retenidas, porVerificar: revision.porVerificar, ...envio });
});
