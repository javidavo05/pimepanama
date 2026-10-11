/**
 * Pime Pulso — reporta a Pime los errores, despliegues y el estado de un sistema entregado.
 * Un solo archivo, sin dependencias. Funciona en Node 18+, Next.js (Node y Edge), Vercel y Workers.
 *
 * Instalación:
 *   1. Copia este archivo al proyecto, por ejemplo en src/lib/pulso.ts.
 *   2. Variables de entorno (Pime te las da en /empresa/sistemas):
 *        PIME_PULSO_KEY=...        PIME_PULSO_SECRET=...
 *        PIME_PULSO_URL=https://pimepanama.com/api/pulso   (opcional)
 *   3. Next.js: en instrumentation.ts
 *        import { pulso } from "@/lib/pulso";
 *        export const onRequestError = pulso.alErrorDeNext;
 *   4. Salud: crea app/api/salud/route.ts con
 *        export { GET } from "@/lib/pulso";   // o: export const GET = pulso.rutaDeSalud;
 *      y pon esa dirección como «dirección de salud» en Pime. Pime la consulta cada 30 min.
 *
 * Nunca lanza ni bloquea la app: si Pime no responde, el reporte se pierde en silencio.
 * No mandes datos personales en los mensajes de error.
 */

type Nivel = "aviso" | "error" | "grave";
type Tipo = "heartbeat" | "health" | "error" | "deploy";

export type OpcionesPulso = {
  key?: string;
  secreto?: string;
  url?: string;
  version?: string;
  /** Para pruebas. */
  fetch?: typeof fetch;
};

const env = (k: string): string | undefined => {
  try {
    return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[k];
  } catch {
    return undefined;
  }
};

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function hmac(secreto: string, mensaje: string): Promise<string> {
  const enc = new TextEncoder();
  const llave = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", llave, enc.encode(mensaje)));
}

const VENTANA_MS = 10 * 60 * 1000;

export function crearPulso(o: OpcionesPulso = {}) {
  const key = o.key ?? env("PIME_PULSO_KEY");
  const secreto = o.secreto ?? env("PIME_PULSO_SECRET");
  const url = o.url ?? env("PIME_PULSO_URL") ?? "https://pimepanama.com/api/pulso";
  const version = o.version ?? env("VERCEL_GIT_COMMIT_SHA")?.slice(0, 7) ?? env("npm_package_version");
  const f = o.fetch ?? fetch;
  // Errores repetidos: se manda el primero y los siguientes se suman en la próxima ventana.
  const vistos = new Map<string, { hasta: number; pendientes: number }>();

  async function enviar(type: Tipo, data: Record<string, unknown> = {}): Promise<boolean> {
    if (!key || !secreto) return false;
    try {
      const cuerpo = JSON.stringify({ id: crypto.randomUUID(), type, occurred_at: new Date().toISOString(), data });
      const ts = String(Date.now());
      const r = await f(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-pime-system": key, "x-pime-timestamp": ts, "x-pime-signature": await hmac(secreto, `${ts}.${cuerpo}`) },
        body: cuerpo,
        signal: AbortSignal.timeout(4000),
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async function error(e: unknown, extra: { where?: string; level?: Nivel; fingerprint?: string } = {}): Promise<boolean> {
    const err = e instanceof Error ? e : new Error(typeof e === "string" ? e : "Error desconocido");
    const huella = extra.fingerprint ?? `${err.name}:${err.message}`.slice(0, 200) + `|${extra.where ?? ""}`;
    const ahora = Date.now();
    const v = vistos.get(huella);
    if (v && v.hasta > ahora) {
      v.pendientes++;
      return true;
    }
    const count = 1 + (v?.pendientes ?? 0);
    vistos.set(huella, { hasta: ahora + VENTANA_MS, pendientes: 0 });
    if (vistos.size > 500) vistos.delete(vistos.keys().next().value as string);
    return enviar("error", { message: `${err.name !== "Error" ? `${err.name}: ` : ""}${err.message}`.slice(0, 300), where: extra.where, level: extra.level ?? "error", stack: err.stack?.split("\n").slice(0, 8).join("\n"), fingerprint: extra.fingerprint, count });
  }

  return {
    enviar,
    /** «Sigo vivo». Útil si el sistema tiene su propio cron; si no, basta la dirección de salud. */
    latido: () => enviar("heartbeat", { version }),
    /** Estado declarado por el propio sistema, por ejemplo si su base de datos no responde. */
    salud: (status: "ok" | "degradado" | "caido", detail?: string) => enviar("health", { status, detail }),
    error,
    /** Llamar al terminar un despliegue (por ejemplo, en el postbuild o en un webhook de Vercel). */
    despliegue: (v?: string, notes?: string) => enviar("deploy", { version: v ?? version, notes }),
    /** Para instrumentation.ts de Next.js: export const onRequestError = pulso.alErrorDeNext; */
    alErrorDeNext: async (e: unknown, req: { path?: string; method?: string }) => {
      await error(e, { where: `${req.method ?? ""} ${(req.path ?? "").split("?")[0]}`.trim() });
    },
    /** GET /api/salud: responde 200 si la app está arriba. Pásale una comprobación propia si quieres. */
    rutaDeSalud: async (): Promise<Response> => new Response(JSON.stringify({ ok: true, version: version ?? null }), { headers: { "content-type": "application/json", "cache-control": "no-store" } }),
  };
}

export const pulso = crearPulso();
export const GET = pulso.rutaDeSalud;
