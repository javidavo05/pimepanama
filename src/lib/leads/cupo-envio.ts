/**
 * El cupo diario del envío automático y el calendario que sale de él. Sin base de datos: lo usan el servidor
 * (envio-automatico.ts) y el calendario de la pestaña Respuestas.
 *
 *   21–27 oct: 10 al día · 28 oct–3 nov: 20 · 4–10 nov: 30 · desde el 11 nov: 40 (tope).
 */
export const INICIO = Date.UTC(2026, 9, 21, 5); // 21 oct 2026, 00:00 en Panamá (UTC-5, sin horario de verano)
export const DIA_MS = 86_400_000;
export const ESCALONES = [10, 20, 30, 40];
const PANAMA_MS = 5 * 3_600_000;

/** Inicio del día de hoy en Panamá, en UTC. */
export function inicioDeHoy(ahora = Date.now()): Date {
  return new Date(Math.floor((ahora - PANAMA_MS) / DIA_MS) * DIA_MS + PANAMA_MS);
}

/** El día en Panamá de un instante: AAAA-MM-DD. */
export function diaPanama(ms: number): string {
  return new Date(ms - PANAMA_MS).toISOString().slice(0, 10);
}

/** Cuántos correos fríos pueden salir hoy, según la semana del plan. 0 antes de empezar. */
export function cupoDelDia(ahora = Date.now()): number {
  if (ahora < INICIO) return 0;
  const semana = Math.floor((ahora - INICIO) / (7 * DIA_MS));
  return ESCALONES[Math.min(semana, ESCALONES.length - 1)];
}

export type DiaDeEnvio = { dia: string; cupo: number; salen: number; acumulado: number };

/**
 * Qué día sale cada correo de una fila de `n`, en orden: hoy lo que queda del cupo y después el cupo entero de cada
 * día, que sube por semana. Termina el día en que sale el último.
 */
export function calendarioDeEnvio(n: number, restantesHoy: number, ahora = Date.now()): DiaDeEnvio[] {
  const dias: DiaDeEnvio[] = [];
  let acumulado = 0, dia = inicioDeHoy(ahora).getTime();
  for (let i = 0; acumulado < n && i < 400; i++, dia += DIA_MS) {
    const cupo = i === 0 ? restantesHoy : cupoDelDia(dia + DIA_MS / 2);
    const salen = Math.min(cupo, n - acumulado);
    acumulado += salen;
    dias.push({ dia: diaPanama(dia + DIA_MS / 2), cupo: i === 0 ? cupoDelDia(ahora) : cupo, salen, acumulado });
  }
  return dias;
}

/** Qué día queda vacía una cola de `n` correos si no entra nada más. null si está vacía. */
export function seVaciaEl(n: number, restantesHoy: number, ahora = Date.now()): string | null {
  return n > 0 ? calendarioDeEnvio(n, restantesHoy, ahora).at(-1)?.dia ?? null : null;
}
