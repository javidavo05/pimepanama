/**
 * Avance de un proyecto a partir de sus fases. Lo normal en Pime es cobrar el proyecto (50/50 al
 * empezar y al entregar), no cada fase: entonces todas las fases pesan igual. Solo cuando TODAS tienen
 * precio pesa cada una por lo que cuesta; si alguna va «sin cobro», pesar por precio la dejaría en 0 y
 * el proyecto marcaría 100 % con fases a medias. Una fase «hecha» cuenta 100 %.
 */
import type { FaseEstado } from "./estados";

export type FaseAvance = { id: string; name: string; status: string; progress: unknown; price: unknown; sortOrder?: number };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function avanceDeFase(f: Pick<FaseAvance, "status" | "progress">): number {
  if ((f.status as FaseEstado) === "hecha") return 100;
  return Math.min(100, Math.max(0, n(f.progress)));
}

export function avanceDeProyecto(fases: FaseAvance[]): number {
  if (!fases.length) return 0;
  const pesos = fases.map((f) => Math.max(0, n(f.price)));
  const total = pesos.reduce((a, b) => a + b, 0);
  const usarPrecio = pesos.every((p) => p > 0);
  let acumulado = 0;
  fases.forEach((f, i) => {
    const peso = usarPrecio ? pesos[i] / total : 1 / fases.length;
    acumulado += peso * avanceDeFase(f);
  });
  return Math.round(acumulado * 10) / 10;
}

/** La fase que se está trabajando: la primera en curso o en revisión; si no, la primera sin terminar. */
export function faseActual<T extends FaseAvance>(fases: T[]): T | null {
  const orden = [...fases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return orden.find((f) => f.status === "en_curso" || f.status === "en_revision") ?? orden.find((f) => f.status !== "hecha") ?? null;
}
