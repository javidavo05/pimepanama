/**
 * Encuesta de satisfacción al terminar un proyecto (fase 7 del CRM). Una por proyecto (Encuesta.projectId es
 * único): una pregunta, «¿qué tan probable es que nos recomiendes?» de 0 a 10, y un comentario opcional.
 *
 * `enviarEncuestas()` se llama una vez al día desde el cron. Para cada proyecto terminado (COMPLETED) sin
 * encuesta, de un cliente con correo, que no sea la empresa interna ni esté archivado, crea la encuesta y le
 * manda el correo con el enlace /encuesta/<token>. Solo mira proyectos que cambiaron en los últimos
 * `diasAtras` días (60 por omisión): así, el primer día no les llega una encuesta a clientes de proyectos que
 * terminaron hace años. Nunca lanza: devuelve el conteo.
 */
import { prisma } from "@/lib/prisma";
import { enviarAlCliente } from "@/lib/motor/envios";
import { getPromotionalEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { registrarEvento } from "@/lib/portal/eventos";
import { notifyUser } from "@/lib/notifications/notify";
import { tokenDeEncuesta, idDeToken, puntajeValido } from "./encuesta-token";

export { tokenDeEncuesta, idDeToken } from "./encuesta-token";

const DIA = 86_400_000;
const CLIENTE_SELECT = { id: true, name: true, company: true, email: true, internal: true, archivedAt: true } as const;

export function enlaceDeEncuesta(id: string): string {
  return `${getSiteUrl()}/encuesta/${tokenDeEncuesta(id)}`;
}

export function correoDeEncuesta(p: { nombre: string; proyecto: string; link: string }) {
  return getPromotionalEmail({
    recipientName: p.nombre,
    subject: `${p.proyecto}: ¿nos recomendarías?`,
    title: "¿Qué tan probable es que nos recomiendes?",
    content: `Terminamos «${p.proyecto}». Gracias por confiar en Pime.\n\nNos ayuda mucho saber cómo te fue: es una sola pregunta, de 0 a 10, y un comentario si quieres. Toma menos de un minuto.`,
    ctaText: "Responder la encuesta",
    ctaLink: p.link,
    locale: "es",
  });
}

export async function enviarEncuestas(opciones: { diasAtras?: number; ahora?: Date } = {}): Promise<{ enviadas: number; fallidas: number; revisados: number }> {
  const ahora = opciones.ahora ?? new Date();
  const desde = new Date(ahora.getTime() - (opciones.diasAtras ?? 60) * DIA);
  const out = { enviadas: 0, fallidas: 0, revisados: 0 };
  try {
    const proyectos = await prisma.project.findMany({
      where: { status: "COMPLETED", encuesta: { is: null }, updatedAt: { gte: desde } },
      select: { id: true, name: true, userId: true, client: { select: CLIENTE_SELECT }, clients: { select: { client: { select: CLIENTE_SELECT } } } },
      take: 50,
    });
    out.revisados = proyectos.length;
    for (const p of proyectos) {
      // Cliente principal (Project.clientId) o, si no hay, el primero de la relación ProjectClient.
      const cliente = [p.client, ...p.clients.map((x) => x.client)].find((c) => c && !c.internal && !c.archivedAt && c.email?.trim());
      if (!cliente?.email) continue;
      let encuestaId: string;
      try {
        const e = await prisma.encuesta.create({ data: { userId: p.userId, projectId: p.id, clientId: cliente.id }, select: { id: true } });
        encuestaId = e.id;
      } catch {
        continue; // otra corrida ya la creó (projectId es único)
      }
      try {
        const c = correoDeEncuesta({ nombre: cliente.name.split(" ")[0] || cliente.name, proyecto: p.name, link: enlaceDeEncuesta(encuestaId) });
        await enviarAlCliente({ to: cliente.email.trim(), subject: c.subject, html: c.html, motivo: `encuesta ${encuestaId}` });
        out.enviadas++;
        await registrarEvento({ userId: p.userId, clientId: cliente.id, projectId: p.id, entityType: "encuesta", entityId: encuestaId, kind: "encuesta_enviada", title: "Encuesta de satisfacción enviada", detail: `Al terminar «${p.name}», a ${cliente.email.trim()}.`, actorType: "sistema" });
      } catch (err) {
        out.fallidas++;
        console.error("[encuesta] no salió el correo; se reintenta mañana", p.id, err);
        await prisma.encuesta.delete({ where: { id: encuestaId } }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[encuesta] envío diario", err);
  }
  return out;
}

/** La encuesta de un enlace, con lo que la página pública necesita mostrar. null si el enlace no es válido. */
export async function encuestaDeToken(token: string) {
  const id = idDeToken(token);
  if (!id) return null;
  return prisma.encuesta.findUnique({
    where: { id },
    select: { id: true, puntaje: true, respondidaAt: true, project: { select: { name: true } }, client: { select: { name: true, company: true } } },
  });
}

export type ResultadoRespuesta = { ok: true } | { ok: false; error: string; yaRespondida?: boolean };

/**
 * Guarda la respuesta una sola vez. Avisa al dueño (campana y push) y deja un evento interno en la línea de
 * tiempo del cliente.
 */
export async function responderEncuesta(token: string, puntajeCrudo: unknown, comentarioCrudo: unknown): Promise<ResultadoRespuesta> {
  const id = idDeToken(token);
  if (!id) return { ok: false, error: "Este enlace no es válido. Revisa que lo copiaste completo del correo." };
  const puntaje = puntajeValido(puntajeCrudo);
  if (puntaje === null) return { ok: false, error: "Elige un número del 0 al 10." };
  const comentario = typeof comentarioCrudo === "string" ? comentarioCrudo.trim().slice(0, 2000) || null : null;

  const r = await prisma.encuesta.updateMany({ where: { id, respondidaAt: null }, data: { puntaje, comentario, respondidaAt: new Date() } });
  if (!r.count) return { ok: false, yaRespondida: true, error: "Esta encuesta ya se respondió. Gracias." };

  const e = await prisma.encuesta.findUnique({ where: { id }, select: { userId: true, clientId: true, projectId: true, project: { select: { name: true } }, client: { select: { name: true, company: true } } } });
  if (e) {
    const quien = e.client.company || e.client.name;
    const grupo = puntaje >= 9 ? "promotor" : puntaje <= 6 ? "detractor" : "pasivo";
    await Promise.all([
      notifyUser({ userId: e.userId, title: `Encuesta: ${quien} dio ${puntaje}/10`, body: `${e.project.name} · ${grupo}${comentario ? ` · «${comentario.slice(0, 200)}»` : ""}`, link: `/empresa/clientes/${e.clientId}`, tag: "encuesta" }),
      registrarEvento({ userId: e.userId, clientId: e.clientId, projectId: e.projectId, entityType: "encuesta", entityId: id, kind: "encuesta_respondida", title: `Respondió la encuesta: ${puntaje}/10`, detail: comentario ?? `Al terminar «${e.project.name}», sin comentario.`, actorType: "cliente" }),
    ]);
  }
  return { ok: true };
}
