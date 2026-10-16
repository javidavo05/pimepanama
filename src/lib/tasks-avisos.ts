/**
 * Qué aviso le toca a una tarea en la revisión diaria (cron task-reminders). Puro, sin base de datos.
 *
 * - «hoy»: vence hoy → push al responsable, una vez.
 * - «atrasada»: ya pasó su día → push al responsable, una vez (solo si se atrasó hace poco, para no
 *   despertar de golpe todo lo viejo la primera vez que corre).
 * - «pronto»: vence en los próximos días → solo la campana, como siempre (usa reminderSent).
 */
import { diaDeTarea, diasEntre } from "@/lib/crm/seguimientos-reglas";

export type AvisoTarea = "hoy" | "atrasada" | "pronto";

export const DIAS_PRONTO = 3;
/** Más atrás que esto, una tarea atrasada ya no se avisa por push (solo queda en «Vencidas»). */
export const DIAS_ATRASO_MAX = 7;

export function avisoDeTarea(
  t: { dueDate: Date | null; allDay: boolean; completed: boolean; reminderSent: boolean },
  hoy: string,
  yaAvisado: { hoy: boolean; atrasada: boolean },
): AvisoTarea | null {
  if (t.completed) return null;
  const dia = diaDeTarea(t);
  if (!dia) return null;
  const faltan = diasEntre(hoy, dia);
  if (faltan === 0) return yaAvisado.hoy ? null : "hoy";
  if (faltan < 0) return !yaAvisado.atrasada && -faltan <= DIAS_ATRASO_MAX ? "atrasada" : null;
  if (faltan <= DIAS_PRONTO && !t.reminderSent) return "pronto";
  return null;
}

/** Enlace del aviso: abre la lista de tareas y, al mismo tiempo, sirve de marca para no repetir el aviso. */
export const enlaceAviso = (taskId: string, aviso: "hoy" | "atrasada") => `/empresa/tareas?tarea=${taskId}&aviso=${aviso}`;
