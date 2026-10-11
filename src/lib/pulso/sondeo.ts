/**
 * Revisión periódica del Pulso. Corre dentro del cron mail-watch (pg_cron cada 30 min), así no suma
 * funciones de Vercel. Sondea la dirección de salud de cada sistema, marca «sin señal» a los que
 * dejaron de mandar latidos, y limpia.
 */
import { prisma } from "@/lib/prisma";
import { trasSondeo, SILENCIO_MAX_MS } from "./reglas";
import { cambiarEstado, SISTEMA_SELECT } from "./estado";

export type Sondeo = { ok: boolean; status: number | null; ms: number | null; error: string | null };

/** GET a la dirección de salud. Nunca lanza: un fallo es un resultado. */
export async function sondear(url: string, fetchImpl: typeof fetch = fetch): Promise<Sondeo> {
  const t0 = Date.now();
  try {
    const r = await fetchImpl(url, { signal: AbortSignal.timeout(10_000), cache: "no-store", redirect: "follow", headers: { "user-agent": "PimePulso/1.0 (+https://pimepanama.com)" } });
    return { ok: r.ok, status: r.status, ms: Date.now() - t0, error: r.ok ? null : `Respondió ${r.status}` };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "TimeoutError" ? "No respondió en 10 s" : e.message) : String(e);
    return { ok: false, status: null, ms: null, error: msg.slice(0, 300) };
  }
}

export function direccionValida(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

async function enTandas<T>(xs: T[], n: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < xs.length; i += n) await Promise.all(xs.slice(i, i + n).map(fn));
}

export async function sondearSistema(id: string, fetchImpl: typeof fetch = fetch) {
  const s = await prisma.monitoredSystem.findUnique({ where: { id }, select: { ...SISTEMA_SELECT, healthUrl: true } });
  if (!s?.healthUrl || !direccionValida(s.healthUrl)) return null;
  const r = await sondear(s.healthUrl, fetchImpl);
  const sig = trasSondeo(s, r.ok);
  const extra = { failCount: sig.failCount, lastProbeAt: new Date(), lastLatencyMs: r.ms, ...(r.ok ? { lastSeenAt: new Date() } : {}) };
  if (sig.status !== s.status) await cambiarEstado(s, sig.status, r.error, extra);
  else await prisma.monitoredSystem.update({ where: { id: s.id }, data: { ...extra, ...(r.ok ? {} : { statusDetail: r.error }) } });
  return { ...r, status: sig.status };
}

export async function revisarPulsos(fetchImpl: typeof fetch = fetch) {
  const ahora = Date.now();
  const sistemas = await prisma.monitoredSystem.findMany({ where: { active: true }, select: { ...SISTEMA_SELECT, healthUrl: true, lastSeenAt: true } });
  let sondeados = 0, caidos = 0, callados = 0;

  await enTandas(sistemas.filter((s) => s.healthUrl), 8, async (s) => {
    const r = await sondearSistema(s.id, fetchImpl);
    if (r) { sondeados++; if (r.status === "caido") caidos++; }
  });

  for (const s of sistemas.filter((x) => !x.healthUrl && x.status === "ok" && x.lastSeenAt && ahora - x.lastSeenAt.getTime() > SILENCIO_MAX_MS)) {
    await cambiarEstado(s, "sin_senal", "Dejó de mandar latidos");
    callados++;
  }

  const [, resueltos] = await Promise.all([
    prisma.pulseEventId.deleteMany({ where: { receivedAt: { lt: new Date(ahora - 24 * 3600_000) } } }),
    prisma.systemIncident.updateMany({ where: { resolvedAt: null, lastSeenAt: { lt: new Date(ahora - 7 * 24 * 3600_000) } }, data: { resolvedAt: new Date() } }),
  ]);
  return { sistemas: sistemas.length, sondeados, caidos, callados, resueltos: resueltos.count };
}
