/**
 * De qué proyecto es una reunión que no tiene: por su cliente, por el título o por el contexto escrito
 * a mano. Sin IA y sin adivinar: si hay dos candidatos igual de buenos, no se sugiere nada.
 *
 * `inequivoca` marca lo que se puede enlazar solo (el script de reuniones viejas): un único candidato y
 * ninguna pista que apunte a otro. Lo demás se ofrece como sugerencia y lo confirma una persona.
 */
import { nombresCoinciden } from "../platforms/enlazar";

export type ProyectoCandidato = { id: string; name: string; clientIds: string[]; clientNames: string[] };
export type ReunionSinProyecto = { title: string; clientId: string | null; manualContext?: string | null };
export type Sugerencia = { projectId: string; motivo: "cliente" | "titulo" | "contexto"; inequivoca: boolean };

/** ¿El texto nombra al proyecto o a uno de sus clientes? */
function nombra(texto: string | null | undefined, p: ProyectoCandidato): boolean {
  if (!texto?.trim()) return false;
  return nombresCoinciden(texto, p.name) || p.clientNames.some((n) => nombresCoinciden(texto, n));
}

export function sugerirProyecto(m: ReunionSinProyecto, proyectos: ProyectoCandidato[]): Sugerencia | null {
  const porCliente = m.clientId ? proyectos.filter((p) => p.clientIds.includes(m.clientId!)) : [];
  const porTitulo = proyectos.filter((p) => nombra(m.title, p));

  if (porCliente.length === 1) {
    const p = porCliente[0];
    // El título nombra otro proyecto y no este: hay dos pistas en conflicto.
    if (porTitulo.length && !porTitulo.some((x) => x.id === p.id)) return null;
    return { projectId: p.id, motivo: "cliente", inequivoca: true };
  }
  if (porCliente.length > 1) {
    const ambos = porCliente.filter((p) => porTitulo.some((x) => x.id === p.id));
    return ambos.length === 1 ? { projectId: ambos[0].id, motivo: "titulo", inequivoca: true } : null;
  }
  if (porTitulo.length === 1) {
    // Con un cliente que no tiene proyectos, el título solo sugiere: el cliente dice otra cosa.
    return { projectId: porTitulo[0].id, motivo: "titulo", inequivoca: !m.clientId };
  }
  if (porTitulo.length > 1) return null;
  const porContexto = proyectos.filter((p) => nombra(m.manualContext, p));
  return porContexto.length === 1 ? { projectId: porContexto[0].id, motivo: "contexto", inequivoca: false } : null;
}

export const MOTIVO_LABEL: Record<Sugerencia["motivo"], string> = {
  cliente: "por el cliente",
  titulo: "por el título",
  contexto: "por las notas",
};
