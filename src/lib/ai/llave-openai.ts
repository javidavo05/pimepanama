/**
 * Qué llave de OpenAI usa la plataforma. Las llaves viven solo en variables del servidor
 * (`OPENAI_API_KEY_<ALIAS>`, p. ej. OPENAI_API_KEY_PIME, OPENAI_API_KEY_BB): la base guarda
 * únicamente el alias elegido en Configuración (CompanyConfig.llaveOpenai), nunca la llave.
 * Sin alias elegido, o si la variable del alias ya no existe, se usa OPENAI_API_KEY.
 */
import { prisma } from "@/lib/prisma";

const PREFIJO = "OPENAI_API_KEY_";

export type LlaveOpenAI = { alias: string; final: string };

/** Las llaves con alias que tiene el servidor, sin exponer más que sus últimos 4 caracteres. */
export function llavesOpenAI(): LlaveOpenAI[] {
  return Object.keys(process.env)
    .filter((k) => k.startsWith(PREFIJO) && k.length > PREFIJO.length && process.env[k]?.trim())
    .map((k) => ({ alias: k.slice(PREFIJO.length).toLowerCase(), final: process.env[k]!.trim().slice(-4) }))
    .sort((a, b) => a.alias.localeCompare(b.alias));
}

const valorDe = (alias: string) => process.env[PREFIJO + alias.toUpperCase()]?.trim() || undefined;

/** Hay alguna llave de OpenAI en el servidor (para saber si Whisper y el cerebro OpenAI están disponibles). */
export function hayLlaveOpenAI(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim() || llavesOpenAI().length > 0;
}

// Una lectura por minuto basta: el cambio desde Configuración limpia este recuerdo en la misma instancia.
let recuerdo: { valor: string | null; hasta: number } | null = null;

export async function aliasGuardado(): Promise<string | null> {
  if (recuerdo && recuerdo.hasta > Date.now()) return recuerdo.valor;
  const c = await prisma.companyConfig.findFirst({ select: { llaveOpenai: true } }).catch(() => null);
  recuerdo = { valor: c?.llaveOpenai ?? null, hasta: Date.now() + 60_000 };
  return recuerdo.valor;
}

/** El alias que de verdad está en uso (el guardado si su llave existe; si no, null = OPENAI_API_KEY). */
export async function aliasEnUso(): Promise<string | null> {
  const a = await aliasGuardado();
  return a && valorDe(a) ? a : null;
}

/** La llave de OpenAI que deben usar todas las llamadas. */
export async function llaveOpenAI(): Promise<string | undefined> {
  const a = await aliasEnUso();
  return (a && valorDe(a)) || process.env.OPENAI_API_KEY?.trim() || llavesOpenAI().map((l) => valorDe(l.alias)).find(Boolean);
}

/** Pregunta a OpenAI si la llave del alias sirve. */
export async function probarLlave(alias: string): Promise<{ ok: true } | { error: string }> {
  const llave = valorDe(alias);
  if (!llave) return { error: `No hay llave «${alias}» en el servidor.` };
  try {
    const r = await fetch("https://api.openai.com/v1/models?limit=1", { headers: { Authorization: `Bearer ${llave}` }, signal: AbortSignal.timeout(10_000) });
    if (r.ok) return { ok: true };
    if (r.status === 401) return { error: `OpenAI rechazó la llave «${alias}»: está revocada o mal copiada.` };
    if (r.status === 429) return { error: `La llave «${alias}» no tiene saldo o llegó a su límite.` };
    return { error: `OpenAI respondió ${r.status} al probar «${alias}». Intenta de nuevo.` };
  } catch {
    return { error: "No se pudo hablar con OpenAI para probar la llave. Intenta de nuevo." };
  }
}

export async function guardarAlias(configId: string, alias: string) {
  await prisma.companyConfig.update({ where: { id: configId }, data: { llaveOpenai: alias } });
  recuerdo = { valor: alias, hasta: Date.now() + 60_000 };
}
