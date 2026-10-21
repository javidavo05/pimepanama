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
 * POST {aprobar?: ids} → revisa las que el agente aprueba (entran a la cola o quedan retenidas con el motivo) y
 *       envía la cola hasta el cupo de hoy. Si responde `seguir: true`, el agente vuelve a llamar con {} hasta false.
 *       Cuando termina el día, le avisa a Javier el resumen.
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

  const revision = ids.length ? await aprobarDelAgente(userId, ids) : { aprobadas: [], retenidas: [] };
  const envio = await enviarCola({ userId, supabaseUid: u.supabaseUid, configId: dueno?.configId ?? null, tiempoMs: TIEMPO_POR_LLAMADA_MS });

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
  return NextResponse.json({ aprobadas: revision.aprobadas, retenidasEnRevision: revision.retenidas, ...envio });
});
