/** Búsqueda aproximada para el asistente: «Holo Realtor» encuentra «HOLO REAL ESTATE & RELOCATION, S.A.». */

const VACIAS = new Set(["s", "a", "sa", "inc", "corp", "de", "del", "la", "el", "los", "las", "y", "the", "and", "of", "co", "ltd", "srl"]);

export function palabras(s: string): string[] {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !VACIAS.has(w));
}

/**
 * Puntaje de 0 a 1: qué parte de las palabras buscadas aparece al inicio de alguna palabra del nombre
 * (o la contiene, si es larga). Una frase exacta dentro del nombre vale 1.
 */
const compacto = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function puntaje(busqueda: string, nombre: string): number {
  const q = palabras(busqueda), n = palabras(nombre);
  // Siglas como «B&B»: se comparan sin espacios ni signos.
  const cq = compacto(busqueda);
  if (cq.length >= 2 && compacto(nombre).startsWith(cq)) return q.length > 1 ? 1 : 0.9;
  if (!q.length || !n.length) return 0;
  if (n.join(" ").includes(q.join(" "))) return 1;
  let ok = 0;
  for (const w of q) {
    if (n.some((x) => x.startsWith(w) || w.startsWith(x) && x.length >= 3 || (w.length >= 4 && x.includes(w)))) ok++;
  }
  return ok / q.length;
}

export function mejores<T>(busqueda: string, items: T[], textos: (x: T) => string[], minimo = 0.5, max = 5): { item: T; puntaje: number }[] {
  return items
    .map((item) => ({ item, puntaje: Math.max(...textos(item).filter(Boolean).map((t) => puntaje(busqueda, t))) }))
    .filter((x) => x.puntaje >= minimo)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, max);
}
