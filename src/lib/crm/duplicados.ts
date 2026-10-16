/**
 * Clientes duplicados (fase 6 del CRM): reglas puras para encontrarlos y para decidir qué datos completa la fusión.
 * Posible duplicado = mismo correo, mismo RUC o nombre/empresa casi igual (sin tildes, mayúsculas, «S.A.» ni
 * puntuación). Los grupos se arman transitivamente: si A se parece a B y B a C, salen juntos.
 */
import { normalizar } from "./buscar";

/** Palabras que no distinguen a una empresa de otra. */
const SOCIETARIAS = new Set(["sa", "s a", "srl", "sas", "inc", "corp", "corporation", "ltd", "ltda", "llc", "cia", "y", "de", "del", "la", "las", "los", "el", "the", "and", "group", "grupo"]);

/** «Constructora Pérez, S.A.» → «constructora perez». */
export function nombreClave(texto: string | null | undefined): string {
  const t = normalizar(texto)
    .replace(/\bs\s*\.\s*a\s*\.?(?=\s|$)/g, " ") // S.A. / S. A. / s.a
    .replace(/\bs\s*\.\s*de\s*r\s*\.\s*l\s*\.?/g, " ")
    .replace(/[^a-z0-9ñ ]+/g, " ");
  return t.split(" ").filter((w) => w && !SOCIETARIAS.has(w)).join(" ");
}

/** RUC sin espacios, guiones ni «DV»: «8-123-456 DV 7» → «81234567». */
export const rucClave = (r: string | null | undefined) => normalizar(r).replace(/\bdv\b/g, "").replace(/[^a-z0-9]/g, "");
export const correoClave = (e: string | null | undefined) => normalizar(e);

/** Distancia de edición (Levenshtein), con fila única. */
export function distancia(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Parecido de 0 a 1. */
export function parecido(a: string, b: string): number {
  if (!a || !b) return 0;
  return 1 - distancia(a, b) / Math.max(a.length, b.length);
}

/** Nombres «muy parecidos»: iguales sin ruido, o casi iguales (una letra cada ~8). Los muy cortos tienen que ser iguales. */
export function nombresParecidos(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return a.length >= 3;
  if (Math.min(a.length, b.length) < 6) return false;
  return parecido(a, b) >= 0.88;
}

export type ClienteDup = { id: string; name: string; company: string | null; email: string | null; ruc: string | null; createdAt?: Date | string };
export type Motivo = "correo" | "ruc" | "nombre";
export const MOTIVO_LABEL: Record<Motivo, string> = { correo: "Mismo correo", ruc: "Mismo RUC", nombre: "Nombre muy parecido" };
export type GrupoDup<C extends ClienteDup = ClienteDup> = { clave: string; motivos: Motivo[]; clientes: C[] };

/** Agrupa los posibles duplicados. Los grupos salen con el cliente más antiguo primero. */
export function agruparDuplicados<C extends ClienteDup>(clientes: C[]): GrupoDup<C>[] {
  const padre = clientes.map((_, i) => i);
  const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const motivos = new Map<string, Set<Motivo>>(); // "i-j" con i<j
  const unir = (i: number, j: number, m: Motivo) => {
    const [a, b] = i < j ? [i, j] : [j, i];
    const k = `${a}-${b}`;
    if (!motivos.has(k)) motivos.set(k, new Set());
    motivos.get(k)!.add(m);
    padre[raiz(a)] = raiz(b);
  };

  // Correo y RUC: igualdad exacta, por cubeta.
  const porClave = (f: (c: C) => string, m: Motivo, minimo: number) => {
    const cubetas = new Map<string, number[]>();
    clientes.forEach((c, i) => { const k = f(c); if (k.length >= minimo) cubetas.set(k, [...(cubetas.get(k) ?? []), i]); });
    for (const idx of cubetas.values()) for (let x = 1; x < idx.length; x++) unir(idx[0], idx[x], m);
  };
  porClave((c) => correoClave(c.email), "correo", 5);
  porClave((c) => rucClave(c.ruc), "ruc", 4);

  // Nombre: cada cliente aporta su nombre y su empresa; se compara contra los de su misma primera letra.
  const claves = clientes.map((c) => [...new Set([nombreClave(c.company), nombreClave(c.name)].filter(Boolean))]);
  const porLetra = new Map<string, { i: number; k: string }[]>();
  claves.forEach((ks, i) => ks.forEach((k) => porLetra.set(k[0], [...(porLetra.get(k[0]) ?? []), { i, k }])));
  for (const lista of porLetra.values()) {
    for (let x = 0; x < lista.length; x++) {
      for (let y = x + 1; y < lista.length; y++) {
        const a = lista[x], b = lista[y];
        if (a.i !== b.i && Math.abs(a.k.length - b.k.length) <= 3 && nombresParecidos(a.k, b.k)) unir(a.i, b.i, "nombre");
      }
    }
  }

  const grupos = new Map<number, number[]>();
  clientes.forEach((_, i) => { const r = raiz(i); grupos.set(r, [...(grupos.get(r) ?? []), i]); });
  const fecha = (c: C) => (c.createdAt ? new Date(c.createdAt).getTime() : 0);
  return [...grupos.values()]
    .filter((idx) => idx.length > 1)
    .map((idx) => {
      const ms = new Set<Motivo>();
      for (const [k, s] of motivos) { const [a] = k.split("-").map(Number); if (idx.includes(a)) s.forEach((m) => ms.add(m)); }
      const cs = idx.map((i) => clientes[i]).sort((a, b) => fecha(a) - fecha(b));
      return { clave: cs.map((c) => c.id).join("+"), motivos: (["correo", "ruc", "nombre"] as Motivo[]).filter((m) => ms.has(m)), clientes: cs };
    })
    .sort((a, b) => b.motivos.length - a.motivos.length || b.clientes.length - a.clientes.length);
}

// ─── Fusión ──────────────────────────────────────────────────────────────────

/** Campos de texto que la fusión completa en el que queda si los tiene vacíos. */
export const CAMPOS_COMPLETAR = ["company", "ruc", "email", "phone", "address", "city", "notes", "fuente", "industria", "logoKey", "responsableId"] as const;
export type CampoCompletar = (typeof CAMPOS_COMPLETAR)[number];
export const CAMPO_LABEL: Record<CampoCompletar, string> = {
  company: "Empresa", ruc: "RUC", email: "Correo", phone: "Teléfono", address: "Dirección", city: "Ciudad", notes: "Notas",
  fuente: "Fuente", industria: "Industria", logoKey: "Logo", responsableId: "Responsable",
};

type Fusionable = Partial<Record<CampoCompletar, string | null>> & { etiquetas?: string[]; ultimoContactoAt?: Date | null; camposExtra?: unknown; portalEnabled?: boolean; hourlyRate?: unknown };

const vacio = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Lo que cambia en el cliente que queda: completa sus campos vacíos con los del otro, une las etiquetas, toma el
 * último contacto más reciente y los campos personalizados que le falten. Nunca pisa un dato que ya tiene.
 */
export function datosFusion(queda: Fusionable, otro: Fusionable) {
  const data: Record<string, unknown> = {};
  const completados: CampoCompletar[] = [];
  for (const c of CAMPOS_COMPLETAR) {
    if (vacio(queda[c]) && !vacio(otro[c])) { data[c] = otro[c]; completados.push(c); }
  }
  const etiquetas = [...new Set([...(queda.etiquetas ?? []), ...(otro.etiquetas ?? [])])];
  if (etiquetas.length !== (queda.etiquetas ?? []).length) data.etiquetas = etiquetas;
  const u1 = queda.ultimoContactoAt ? new Date(queda.ultimoContactoAt).getTime() : 0;
  const u2 = otro.ultimoContactoAt ? new Date(otro.ultimoContactoAt).getTime() : 0;
  if (u2 > u1) data.ultimoContactoAt = otro.ultimoContactoAt;
  if (esObjeto(otro.camposExtra)) {
    const base = esObjeto(queda.camposExtra) ? queda.camposExtra : {};
    const faltan = Object.entries(otro.camposExtra).filter(([k, v]) => vacio(base[k]) && !vacio(v));
    if (faltan.length) data.camposExtra = { ...base, ...Object.fromEntries(faltan) };
  }
  if (!queda.portalEnabled && otro.portalEnabled) data.portalEnabled = true;
  if (vacio(queda.hourlyRate) && !vacio(otro.hourlyRate)) data.hourlyRate = otro.hourlyRate;
  return { data, completados };
}

/** Proyectos del otro que se mueven y los que ya compartían (su enlace se borra en vez de duplicarse). */
export function enlacesProyecto(quedaProyectos: string[], otroProyectos: string[]) {
  const ya = new Set(quedaProyectos);
  return { mover: otroProyectos.filter((p) => !ya.has(p)), borrar: otroProyectos.filter((p) => ya.has(p)) };
}
