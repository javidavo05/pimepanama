/**
 * Coincidencias por nombre, sin IA: plataforma ↔ cliente, y nombre ↔ repo / proyecto de Vercel / Supabase.
 * Solo se da por buena una coincidencia inequívoca (un único candidato); si hay dudas, no se adivina.
 */

/** "B&B Real Estate S.A." → "bbrealestatesa" */
export function compacto(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Palabras que no distinguen a nadie. */
const GENERICAS = new Set([
  "platform", "plataforma", "new", "nuevo", "nueva", "saas", "app", "web", "site", "sitio", "pagina", "system", "sistema",
  "real", "estate", "group", "grupo", "corp", "company", "the", "los", "las", "del", "de", "la", "el", "and", "y",
  "sa", "s", "a", "inc", "llc", "panama", "official", "oficial", "crm", "portal", "admin", "api", "app", "studio",
]);

export function palabras(s: string | null | undefined): string[] {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !GENERICAS.has(w));
}

/** ¿Los dos nombres hablan de lo mismo? Igual al compactar, o comparten una palabra distintiva. */
export function nombresCoinciden(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = compacto(a);
  const cb = compacto(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.length >= 5 && cb.length >= 5 && (ca.includes(cb) || cb.includes(ca))) return true;
  const pb = new Set(palabras(b));
  return palabras(a).some((w) => pb.has(w));
}

/** Puntaje 0..100 de qué tan parecido es un nombre a otro (para ordenar sugerencias). */
export function parecido(nombre: string, candidato: string): number {
  const a = compacto(nombre);
  const b = compacto(candidato.split("/").pop());
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (b.startsWith(a) || a.startsWith(b)) return 85;
  if (a.length >= 4 && b.length >= 4 && (b.includes(a) || a.includes(b))) return 70;
  const pb = new Set(palabras(candidato));
  return palabras(nombre).some((w) => pb.has(w)) ? 55 : 0;
}

/** El mejor candidato si es claro (puntaje ≥ 55 y sin empate en el primer lugar). */
export function mejorCoincidencia<T>(nombres: string[], items: T[], nombreDe: (t: T) => string): T | null {
  const scored = items
    .map((it) => ({ it, s: Math.max(0, ...nombres.filter(Boolean).map((n) => parecido(n, nombreDe(it)))) }))
    .filter((x) => x.s >= 55)
    .sort((x, y) => y.s - x.s);
  if (!scored.length) return null;
  if (scored[1] && scored[1].s === scored[0].s) return null;
  return scored[0].it;
}

type ClienteMin = { id: string; name: string; company?: string | null };

/** Cliente de una plataforma por nombre, solo si hay uno y nada más. */
export function clienteInequivoco<C extends ClienteMin>(nombrePlataforma: string, clientes: C[]): C | null {
  const hits = clientes.filter((c) => nombresCoinciden(nombrePlataforma, c.name) || nombresCoinciden(nombrePlataforma, c.company));
  return hits.length === 1 ? hits[0] : null;
}
