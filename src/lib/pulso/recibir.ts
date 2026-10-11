/**
 * Entrada del Pulso: un evento firmado de un sistema entregado.
 * Tipos: heartbeat (latido), health (estado declarado), error, deploy.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { secretoDe, verificarFirma } from "./firma";
import { huellaDeError, nivelDe } from "./reglas";
import { cambiarEstado, SISTEMA_SELECT } from "./estado";
import { avisarPulso } from "./alertas";
import { registrarEvento } from "@/lib/portal/eventos";

export const MAX_CUERPO = 64 * 1024;

const evento = z.object({
  id: z.string().min(8).max(128),
  type: z.enum(["heartbeat", "health", "error", "deploy"]),
  occurred_at: z.string().max(64).optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type Resultado =
  | { status: 200; body: { outcome: "applied" | "duplicate"; status?: string } }
  | { status: 401 | 404 | 413 | 422 | 503; body: { outcome: string; reason?: string } };

const texto = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : typeof x === "number" ? String(x) : null);

export async function recibirPulso(headers: Headers, cuerpo: string): Promise<Resultado> {
  const maestro = process.env.PIME_PULSO_SECRET?.trim();
  if (!maestro) return { status: 503, body: { outcome: "disabled" } };
  if (Buffer.byteLength(cuerpo, "utf8") > MAX_CUERPO) return { status: 413, body: { outcome: "invalid_payload", reason: "too_large" } };

  const key = headers.get("x-pime-system")?.trim();
  if (!key) return { status: 401, body: { outcome: "invalid_signature" } };
  const s = await prisma.monitoredSystem.findUnique({ where: { key }, select: { ...SISTEMA_SELECT, active: true, secretVersion: true, lastEventAt: true } });
  // Mismo 401 si no existe: no se revela qué keys hay.
  if (!s || !s.active) return { status: 401, body: { outcome: "invalid_signature" } };

  const firma = verificarFirma({ secreto: secretoDe(maestro, key, s.secretVersion), timestamp: headers.get("x-pime-timestamp"), cuerpo, firma: headers.get("x-pime-signature") });
  if (firma !== "ok") return { status: 401, body: { outcome: firma === "reloj" ? "clock_skew" : "invalid_signature" } };

  let json: unknown;
  try { json = JSON.parse(cuerpo); } catch { return { status: 422, body: { outcome: "invalid_payload", reason: "json" } }; }
  const p = evento.safeParse(json);
  if (!p.success) return { status: 422, body: { outcome: "invalid_payload", reason: p.error.issues[0]?.path.join(".") || "schema" } };
  const e = p.data;

  // Anti-repetición: el mismo id firmado no se aplica dos veces.
  const nuevo_ = await prisma.pulseEventId.createMany({ data: [{ systemId: s.id, eventId: e.id }], skipDuplicates: true });
  if (nuevo_.count === 0) return { status: 200, body: { outcome: "duplicate" } };

  const ahora = new Date();
  const cuando = e.occurred_at && !Number.isNaN(Date.parse(e.occurred_at)) ? new Date(e.occurred_at) : ahora;
  const base = { lastSeenAt: ahora, lastEventAt: ahora };

  if (e.type === "heartbeat") {
    const version = texto(e.data.version, 64);
    if (s.status === "sin_senal" || s.status === "caido") await cambiarEstado(s, "ok", null, { ...base, failCount: 0, ...(version ? { appVersion: version } : {}) });
    else await prisma.monitoredSystem.update({ where: { id: s.id }, data: { ...base, ...(version ? { appVersion: version } : {}) } });
    return { status: 200, body: { outcome: "applied", status: s.status === "degradado" ? "degradado" : "ok" } };
  }

  if (e.type === "health") {
    // Un estado viejo que llega tarde no pisa uno más nuevo.
    if (s.lastEventAt && cuando < s.lastEventAt && e.occurred_at) return { status: 200, body: { outcome: "applied", status: s.status } };
    const st = e.data.status === "caido" || e.data.status === "down" ? "caido" : e.data.status === "degradado" || e.data.status === "degraded" ? "degradado" : "ok";
    await cambiarEstado(s, st, texto(e.data.detail, 500), { ...base, lastEventAt: cuando, failCount: 0 });
    return { status: 200, body: { outcome: "applied", status: st } };
  }

  if (e.type === "deploy") {
    const version = texto(e.data.version, 64);
    await prisma.monitoredSystem.update({ where: { id: s.id }, data: { ...base, ...(version ? { appVersion: version } : {}) } });
    await registrarEvento({ userId: s.userId, clientId: s.clientId, projectId: s.projectId, entityType: "monitored_system", entityId: s.id, kind: "sistema_despliegue", title: `${s.name}: nueva versión publicada${version ? ` (${version})` : ""}`, detail: texto(e.data.notes, 300), visibility: "interno", actorType: "sistema" });
    return { status: 200, body: { outcome: "applied" } };
  }

  // error
  const mensaje = texto(e.data.message, 300) || "Error sin mensaje";
  const lugar = texto(e.data.where, 200);
  const nivel = nivelDe(e.data.level);
  const huella = texto(e.data.fingerprint, 64) || huellaDeError(mensaje, lugar);
  const detalle = [lugar, texto(e.data.stack, 1500)].filter(Boolean).join("\n") || null;
  const veces = Math.min(Math.max(1, Number(e.data.count) || 1), 10_000);
  const previo = await prisma.systemIncident.findUnique({ where: { systemId_fingerprint: { systemId: s.id, fingerprint: huella } }, select: { id: true, resolvedAt: true, severity: true } });
  const inc = previo
    ? await prisma.systemIncident.update({ where: { id: previo.id }, data: { count: { increment: veces }, lastSeenAt: cuando, resolvedAt: null, ...(nivel === "grave" ? { severity: "grave" } : {}) } })
    : await prisma.systemIncident.create({ data: { systemId: s.id, fingerprint: huella, severity: nivel, title: mensaje, detail: detalle, count: veces, firstSeenAt: cuando, lastSeenAt: cuando } });
  await prisma.monitoredSystem.update({ where: { id: s.id }, data: base });
  // Aviso: solo la primera vez (o al reaparecer) un problema; grave suena en el celular.
  const nuevo = !previo || !!previo.resolvedAt;
  if (nuevo && nivel !== "aviso") {
    await avisarPulso(s, { titulo: nivel === "grave" ? "error grave" : "error nuevo", detalle: mensaje, grave: nivel === "grave" });
    await prisma.systemIncident.update({ where: { id: inc.id }, data: { notifiedAt: ahora } });
  }
  return { status: 200, body: { outcome: "applied" } };
}
