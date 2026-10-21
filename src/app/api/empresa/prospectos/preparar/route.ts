import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireProspectorUser } from "@/lib/devices/tokens";
import { prepararFinales } from "@/lib/leads/envio-automatico";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Margen para responder antes del límite de la función. */
const TIEMPO_POR_LLAMADA_MS = 180_000;

/**
 * Paso previo a aprobar (llave «prospectos»): arma la versión final de cada respuesta (el correo que presenta la
 * propuesta y el PDF) y la devuelve tal cual va a salir, para que el agente la verifique antes de aprobarla.
 *
 * POST {ids} → {listas: [{respuestaId, empresa, para, asunto, cuerpo, adjuntaPdf, propuesta}], fallos, faltan}.
 *       Si `faltan` no está vacío, el agente vuelve a llamar con esos ids.
 */
export const POST = withEmpresaRoute(async (request) => {
  const u = await requireProspectorUser(request);
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((i): i is string => typeof i === "string") : [];
  if (!ids.length) return NextResponse.json({ error: "Falta «ids» (los respuestaId que devolvió la carga)" }, { status: 400 });
  return NextResponse.json(await prepararFinales({ userId: u.ownerId ?? u.id, supabaseUid: u.supabaseUid, ids, tiempoMs: TIEMPO_POR_LLAMADA_MS }));
});
