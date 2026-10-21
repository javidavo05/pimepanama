/**
 * Envío automático de las respuestas del agente de prospección (pedido de Javier, 2026-10-21).
 *
 * El agente carga los prospectos, los revisa y propone los que deben salir. Aquí se vuelve a comprobar cada uno (el
 * correo está publicado en su sitio, coincide con el dominio, el texto no trae restos de plantilla) y los que pasan
 * entran a una cola (aprobadaAt, migración 0065). La cola sale por orden de llegada con un cupo diario que sube de a
 * poco para no quemar pimepanama.com; lo que no cabe hoy sale el día siguiente:
 *
 *   21–27 oct: 10 al día · 28 oct–3 nov: 20 · 4–10 nov: 30 · desde el 11 nov: 40 (tope).
 *
 * Freno: si en los últimos 7 días rebota el 5 % o más de lo enviado (con 10 o más enviados), o alguien lo marca como
 * spam, se detiene el envío automático y se avisa. Lo que no sale queda en Respuestas para revisarlo a mano.
 */
import { prisma } from "@/lib/prisma";
import { asegurarPropuesta, enviarRespuesta } from "./respuestas";

const INICIO = Date.UTC(2026, 9, 21, 5); // 21 oct 2026, 00:00 en Panamá (UTC-5, sin horario de verano)
const DIA_MS = 86_400_000;
const ESCALONES = [10, 20, 30, 40];
export const PUNTAJE_MINIMO = 50;

/** Inicio del día de hoy en Panamá, en UTC. */
function inicioDeHoy(ahora = Date.now()): Date {
  return new Date(Math.floor((ahora - 5 * 3_600_000) / DIA_MS) * DIA_MS + 5 * 3_600_000);
}

/** Cuántos correos fríos pueden salir hoy, según la semana del plan. 0 antes de empezar. */
export function cupoDelDia(ahora = Date.now()): number {
  if (ahora < INICIO) return 0;
  const semana = Math.floor((ahora - INICIO) / (7 * DIA_MS));
  return ESCALONES[Math.min(semana, ESCALONES.length - 1)];
}

/** Rebotes y quejas de lo que salió desde Respuestas en los últimos 7 días. */
export async function freno(userId: string): Promise<string | null> {
  const desde = new Date(Date.now() - 7 * DIA_MS);
  const enviadas = await prisma.respuestaLead.findMany({
    where: { userId, estado: "enviada", enviadaAt: { gte: desde }, correoId: { not: null } },
    select: { correoId: true },
  });
  if (!enviadas.length) return null;
  const correos = await prisma.inboxEmail.findMany({
    where: { id: { in: enviadas.map((e) => e.correoId!) } },
    select: { deliveryStatus: true },
  });
  const quejas = correos.filter((c) => c.deliveryStatus === "COMPLAINED").length;
  const rebotes = correos.filter((c) => c.deliveryStatus === "BOUNCED").length;
  if (quejas > 0) return `${quejas} ${quejas === 1 ? "persona marcó" : "personas marcaron"} un correo como spam en los últimos 7 días.`;
  if (enviadas.length >= 10 && rebotes / enviadas.length >= 0.05) return `Rebotó el ${Math.round((rebotes / enviadas.length) * 100)} % de lo enviado en los últimos 7 días (${rebotes} de ${enviadas.length}).`;
  return null;
}

function dominio(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** El texto de una página, para buscar el correo. Nunca lanza. */
async function pagina(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; PimeBot/1.0; +https://pimepanama.com)" }, redirect: "follow" });
    if (!res.ok) return "";
    return (await res.text()).slice(0, 2_000_000).toLowerCase()
      .replace(/&#64;|&#x40;|\[at\]|\(at\)| at /g, "@").replace(/%40/g, "@");
  } catch {
    return "";
  }
}

const RESTOS = /\{\{|\}\}|\[(nombre|name|empresa|company|cargo)[^\]]*\]|<(nombre|name|empresa|company)>|lorem ipsum|TODO/i;

/** Por qué no debe salir solo, o null si pasa la revisión. */
export async function revisar(r: { para: string | null; asunto: string; cuerpo: string; notas: string }): Promise<string | null> {
  const puntaje = Number(r.notas.match(/puntaje (\d+)\/100/)?.[1] ?? 0);
  if (puntaje < PUNTAJE_MINIMO) return `Puntaje ${puntaje}: el envío automático pide ${PUNTAJE_MINIMO} o más.`;
  const para = r.para?.trim().toLowerCase();
  if (!para) return "No tiene correo.";
  const sitio = r.notas.match(/^Sitio: (\S+)/m)?.[1] ?? "";
  const domCorreo = para.split("@")[1] ?? "";
  const domSitio = dominio(sitio);
  if (!domSitio || !(domCorreo === domSitio || domCorreo.endsWith(`.${domSitio}`) || domSitio.endsWith(`.${domCorreo}`))) {
    return `El correo (${domCorreo}) no es del dominio de su sitio (${domSitio || "sin sitio"}).`;
  }
  const visto = r.notas.match(/^Correo visto en: (\S+)/m)?.[1];
  const paginas = [...new Set([visto, sitio].filter((u): u is string => !!u))];
  let encontrado = false;
  for (const u of paginas) if ((await pagina(u)).includes(para)) { encontrado = true; break; }
  if (!encontrado) return "No encontré ese correo publicado en su sitio.";
  if (RESTOS.test(r.asunto) || RESTOS.test(r.cuerpo)) return "El texto trae restos de plantilla.";
  const palabras = r.cuerpo.replace(/\n+—\n[\s\S]*$/, "").split(/\s+/).filter(Boolean).length;
  if (palabras < 50 || palabras > 260) return `El correo tiene ${palabras} palabras: fuera de lo normal.`;
  return null;
}

/** Las aprobadas que esperan su turno, por orden de aprobación. */
const EN_COLA = (userId: string) => ({ userId, aprobadaAt: { not: null }, estado: "borrador" });

/**
 * Qué día queda vacía una cola de `n` correos si no entra nada más (el cupo de hoy ya descontado). En Panamá,
 * AAAA-MM-DD; null si la cola está vacía.
 */
export function seVaciaEl(n: number, restantesHoy: number, ahora = Date.now()): string | null {
  if (n <= 0) return null;
  let falta = n - restantesHoy, dia = inicioDeHoy(ahora).getTime();
  while (falta > 0) {
    dia += DIA_MS;
    falta -= cupoDelDia(dia + DIA_MS / 2);
  }
  return new Date(dia).toISOString().slice(0, 10);
}

export type EstadoEnvio = { delDia: number; usados: number; restantesHoy: number; enCola: number; seVaciaEl: string | null; pausado: string | null };

export async function estadoEnvio(userId: string): Promise<EstadoEnvio> {
  const delDia = cupoDelDia();
  const [usados, enCola, pausado] = await Promise.all([
    prisma.respuestaLead.count({ where: { userId, estado: "enviada", enviadaAt: { gte: inicioDeHoy() } } }),
    prisma.respuestaLead.count({ where: EN_COLA(userId) }),
    freno(userId),
  ]);
  const restantesHoy = Math.max(0, delDia - usados);
  return { delDia, usados, restantesHoy, enCola, seVaciaEl: seVaciaEl(enCola, pausado ? 0 : restantesHoy), pausado };
}

/** Pone en la cola respuestas que alguien del equipo ya revisó (desde la pantalla). */
export async function agendar(userId: string, ids: string[]): Promise<number> {
  const r = await prisma.respuestaLead.updateMany({
    where: { id: { in: ids }, userId, estado: { in: ["borrador", "fallo"] } },
    data: { aprobadaAt: new Date(), estado: "borrador", error: null },
  });
  return r.count;
}

/**
 * El agente propone; aquí se revisa cada una (correo publicado en su sitio, del mismo dominio, puntaje, texto) y las
 * que pasan entran a la cola. Las que no, quedan en Respuestas con el motivo.
 */
export async function aprobarDelAgente(userId: string, ids: string[]) {
  const filas = await prisma.respuestaLead.findMany({
    where: { id: { in: [...new Set(ids)].slice(0, 60) }, userId, origen: "agente", estado: { in: ["borrador", "fallo"] }, aprobadaAt: null },
    include: { lead: { select: { company: true, name: true, notes: true } } },
  });
  const aprobadas: { id: string; empresa: string }[] = [], retenidas: { id: string; empresa: string; motivo: string }[] = [];
  // En grupos de 8: cada revisión abre hasta dos páginas.
  for (let i = 0; i < filas.length; i += 8) {
    await Promise.all(filas.slice(i, i + 8).map(async (r) => {
      const empresa = r.lead.company || r.lead.name;
      const motivo = await revisar({ para: r.para, asunto: r.asunto, cuerpo: r.cuerpo, notas: r.lead.notes ?? "" });
      if (motivo) {
        retenidas.push({ id: r.id, empresa, motivo });
        await prisma.respuestaLead.update({ where: { id: r.id }, data: { error: `Revisión automática: ${motivo}`.slice(0, 300) } });
      } else {
        aprobadas.push({ id: r.id, empresa });
        await prisma.respuestaLead.update({ where: { id: r.id }, data: { aprobadaAt: new Date(), estado: "borrador", error: null } });
      }
    }));
  }
  return { aprobadas, retenidas };
}

export type ResultadoCola = {
  enviadas: { id: string; empresa: string }[];
  retenidas: { id: string; empresa: string; motivo: string }[];
  /** Queda cupo hoy y cola por enviar, pero se acabó el tiempo de esta llamada: hay que volver a llamar. */
  seguir: boolean;
  estado: EstadoEnvio;
};

/**
 * Envía la cola por orden de aprobación hasta llenar el cupo de hoy o agotar el tiempo de la llamada. El cupo cuenta
 * todo lo enviado hoy desde Respuestas, también lo que se mandó a mano. Lo que no cabe sale el día siguiente.
 */
export async function enviarCola(p: { userId: string; supabaseUid: string; configId: string | null; tiempoMs: number }): Promise<ResultadoCola> {
  const inicio = Date.now();
  const res: ResultadoCola = { enviadas: [], retenidas: [], seguir: false, estado: await estadoEnvio(p.userId) };
  if (res.estado.pausado || !res.estado.restantesHoy || !res.estado.enCola) return res;
  const cuenta = await buzonDeProspeccion(p.userId);
  if (!cuenta) {
    res.estado.pausado = "No encontré el buzón javier@pimepanama.com activo.";
    return res;
  }

  let restantes = res.estado.restantesHoy;
  const tomadas = new Set<string>();
  while (restantes > 0) {
    if (Date.now() - inicio > p.tiempoMs) { res.seguir = true; break; }
    const r = await prisma.respuestaLead.findFirst({
      where: { ...EN_COLA(p.userId), id: { notIn: [...tomadas] } },
      orderBy: [{ aprobadaAt: "asc" }, { createdAt: "asc" }],
      include: { lead: { select: { company: true, name: true } } },
    });
    if (!r) break;
    tomadas.add(r.id);
    const empresa = r.lead.company || r.lead.name;
    const retener = async (motivo: string) => {
      res.retenidas.push({ id: r.id, empresa, motivo });
      // Sale de la cola: alguien tiene que mirarla.
      await prisma.respuestaLead.update({ where: { id: r.id }, data: { aprobadaAt: null, error: `Revisión automática: ${motivo}`.slice(0, 300) } });
    };
    try {
      // Primero el correo que presenta la propuesta y el PDF; el texto final se revisa otra vez antes de salir.
      if (r.adjuntarPdf) await asegurarPropuesta({ userId: p.userId, supabaseUid: p.supabaseUid, id: r.id });
    } catch (e) {
      await retener(`No se pudo armar la propuesta (${e instanceof Error ? e.message : "error"}).`);
      continue;
    }
    const final = await prisma.respuestaLead.findFirst({ where: { id: r.id }, select: { asunto: true, cuerpo: true } });
    if (final && (RESTOS.test(final.asunto) || RESTOS.test(final.cuerpo))) { await retener("El correo reescrito trae restos de plantilla."); continue; }

    const envio = await enviarRespuesta({ userId: p.userId, supabaseUid: p.supabaseUid, configId: p.configId, id: r.id, cuenta });
    if (envio.ok) { res.enviadas.push({ id: r.id, empresa }); restantes--; }
    else res.retenidas.push({ id: r.id, empresa, motivo: envio.error });
  }
  res.estado = await estadoEnvio(p.userId);
  return res;
}

async function buzonDeProspeccion(userId: string) {
  const usuario = (process.env.PIME_BUZON_PROSPECCION || "javier@pimepanama.com").toLowerCase();
  return prisma.mailAccount.findFirst({ where: { userId, active: true, username: { equals: usuario, mode: "insensitive" } } });
}
