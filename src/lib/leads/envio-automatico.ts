/**
 * Envío automático de las respuestas del agente de prospección (pedido de Javier, 2026-10-21).
 *
 * Doble verificación siempre, sobre la versión FINAL (el correo que la IA reescribe para presentar el PDF y la
 * propuesta): primero se arma esa versión (prepararFinales), la lee el agente o alguien del equipo y la aprueba, y
 * después la revisa una IA verificadora independiente contra las fuentes, más una revisión fija (correo publicado en
 * su sitio y del mismo dominio, puntaje, texto). Solo lo que pasa las dos entra a la cola (aprobadaAt, migraciones
 * 0065 y 0066), con la huella de lo aprobado: si el correo cambia después, no sale. La cola sale por orden de llegada con un cupo diario que sube de a
 * poco para no quemar pimepanama.com; lo que no cabe hoy sale el día siguiente:
 *
 *   21–27 oct: 10 al día · 28 oct–3 nov: 20 · 4–10 nov: 30 · desde el 11 nov: 40 (tope).
 *
 * Freno: si en los últimos 7 días rebota el 5 % o más de lo enviado (con 10 o más enviados), o alguien lo marca como
 * spam, se detiene el envío automático y se avisa. Lo que no sale queda en Respuestas para revisarlo a mano.
 */
import { Prisma, type RespuestaLead } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asegurarPropuesta, enviarRespuesta } from "./respuestas";
import { leerPropuesta, textoDePropuesta, verificarCorreo } from "./propuesta-prospecto";
import { huellaCorreo } from "./respuestas-comun";
import { cupoDelDia, DIA_MS, inicioDeHoy, seVaciaEl } from "./cupo-envio";

export { cupoDelDia, seVaciaEl };

export const PUNTAJE_MINIMO = 50;

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

/** El HTML de una página. Nunca lanza: si no abre, "". */
async function pagina(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; PimeBot/1.0; +https://pimepanama.com)" }, redirect: "follow" });
    if (!res.ok) return "";
    return (await res.text()).slice(0, 2_000_000);
  } catch {
    return "";
  }
}

/** Para buscar un correo publicado, también escrito como «info [at] dominio». */
const paraBuscar = (html: string) => html.toLowerCase().replace(/&#64;|&#x40;|\[at\]|\(at\)| at /g, "@").replace(/%40/g, "@");

/** El texto legible de una página, para la verificadora. */
const textoPlano = (html: string) => html
  .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, " ")
  .replace(/\s+/g, " ").trim();

const RESTOS = /\{\{|\}\}|\[(nombre|name|empresa|company|cargo)[^\]]*\]|<(nombre|name|empresa|company)>|lorem ipsum|TODO/i;

/** Las páginas del prospecto: donde se vio el correo, el sitio y las fuentes del agente (hasta 4). */
function urlsDe(notas: string): string[] {
  const visto = notas.match(/^Correo visto en: (\S+)/m)?.[1];
  const sitio = notas.match(/^Sitio: (\S+)/m)?.[1];
  const fuentes = [...(notas.match(/^Fuentes:\n((?:- \S+\n?)+)/m)?.[1] ?? "").matchAll(/^- (\S+)/gm)].map((m) => m[1]);
  return [...new Set([visto, sitio, ...fuentes].filter((u): u is string => !!u && /^https?:\/\//.test(u)))].slice(0, 4);
}

/**
 * Revisión fija (sin IA). Por qué no debe salir solo, o null si pasa. Devuelve también las páginas que abrió, para
 * que la verificadora no las vuelva a pedir.
 */
export async function revisar(r: { para: string | null; asunto: string; cuerpo: string; notas: string }): Promise<{ motivo: string | null; paginas: { url: string; html: string }[] }> {
  const paginas: { url: string; html: string }[] = [];
  const no = (motivo: string) => ({ motivo, paginas });
  const puntaje = Number(r.notas.match(/puntaje (\d+)\/100/)?.[1] ?? 0);
  if (puntaje < PUNTAJE_MINIMO) return no(`Puntaje ${puntaje}: el envío automático pide ${PUNTAJE_MINIMO} o más.`);
  const para = r.para?.trim().toLowerCase();
  if (!para) return no("No tiene correo.");
  const sitio = r.notas.match(/^Sitio: (\S+)/m)?.[1] ?? "";
  const domCorreo = para.split("@")[1] ?? "";
  const domSitio = dominio(sitio);
  if (!domSitio || !(domCorreo === domSitio || domCorreo.endsWith(`.${domSitio}`) || domSitio.endsWith(`.${domCorreo}`))) {
    return no(`El correo (${domCorreo}) no es del dominio de su sitio (${domSitio || "sin sitio"}).`);
  }
  paginas.push(...(await Promise.all(urlsDe(r.notas).map(async (url) => ({ url, html: await pagina(url) })))).filter((x) => x.html));
  if (!paginas.some((x) => paraBuscar(x.html).includes(para))) return no("No encontré ese correo publicado en su sitio.");
  if (RESTOS.test(r.asunto) || RESTOS.test(r.cuerpo)) return no("El texto trae restos de plantilla.");
  const palabras = r.cuerpo.replace(/\n+—\n[\s\S]*$/, "").split(/\s+/).filter(Boolean).length;
  if (palabras < 50 || palabras > 260) return no(`El correo tiene ${palabras} palabras: fuera de lo normal.`);
  return { motivo: null, paginas };
}

/** Las aprobadas que esperan su turno, por orden de aprobación. */
const EN_COLA = (userId: string) => ({ userId, aprobadaAt: { not: null }, estado: "borrador" });

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

type Fila = RespuestaLead & { lead: { company: string | null; name: string; notes: string | null } };
const CON_LEAD = { lead: { select: { company: true, name: true, notes: true } } } as const;
const sinPie = (cuerpo: string) => cuerpo.replace(/\n+—\n[\s\S]*$/, "").trim();

/** El correo y la propuesta que van a salir, tal cual. */
function versionFinal(r: Fila) {
  const propuesta = leerPropuesta(r.propuesta);
  return {
    respuestaId: r.id,
    empresa: r.lead.company || r.lead.name,
    para: r.para,
    asunto: r.asunto,
    cuerpo: sinPie(r.cuerpo),
    adjuntaPdf: r.adjuntarPdf,
    propuesta: propuesta ? textoDePropuesta(propuesta) : null,
  };
}

/** Lo que falta para que la versión final exista: con PDF, la propuesta armada a partir de este mismo correo. */
const finalLista = (r: Fila) => !r.adjuntarPdf || leerPropuesta(r.propuesta)?.fuente === huellaCorreo(r.asunto, r.cuerpo);

/**
 * Arma la versión final (la IA reescribe el correo para presentar la propuesta y redacta el PDF) ANTES de revisarla,
 * para que las dos verificaciones lean exactamente lo que va a salir. Devuelve esa versión.
 */
export async function prepararFinales(p: { userId: string; supabaseUid: string; ids: string[]; tiempoMs: number }) {
  const inicio = Date.now();
  const lista = [...new Set(p.ids)].slice(0, 60);
  const listas: ReturnType<typeof versionFinal>[] = [], fallos: { respuestaId: string; motivo: string }[] = [];
  let i = 0;
  // De a 3: cada una son dos llamadas a la IA.
  for (; i < lista.length; i += 3) {
    if (Date.now() - inicio > p.tiempoMs) break;
    await Promise.all(lista.slice(i, i + 3).map(async (id) => {
      try {
        const r = await prisma.respuestaLead.findFirst({ where: { id, userId: p.userId, estado: { in: ["borrador", "fallo"] } }, include: CON_LEAD });
        if (!r) return fallos.push({ respuestaId: id, motivo: "No está abierta (ya se envió o se descartó)." });
        if (!finalLista(r)) await asegurarPropuesta({ userId: p.userId, supabaseUid: p.supabaseUid, id, soloPdf: !!leerPropuesta(r.propuesta) });
        const final = await prisma.respuestaLead.findFirst({ where: { id }, include: CON_LEAD });
        listas.push(versionFinal(final!));
      } catch (e) {
        fallos.push({ respuestaId: id, motivo: e instanceof Error ? e.message : "No se pudo armar la propuesta." });
      }
    }));
  }
  return { listas, fallos, faltan: lista.slice(i) };
}

/** La versión final de varias respuestas, sin armar nada. */
export async function versionesFinales(userId: string, ids: string[]) {
  const filas = await prisma.respuestaLead.findMany({ where: { id: { in: ids.slice(0, 60) }, userId }, include: CON_LEAD });
  return filas.map((r) => ({ ...versionFinal(r), lista: finalLista(r) }));
}

/**
 * Segunda verificación (la primera es del agente o de alguien del equipo): la revisión fija y la IA verificadora,
 * sobre la versión final. Guarda el resultado. Devuelve el motivo para retenerla, o null si puede salir.
 */
async function verificar(r: Fila, supabaseUid: string): Promise<string | null> {
  if (!finalLista(r)) return "La propuesta no está armada a partir de este correo: hay que prepararla y revisarla otra vez.";
  const notas = r.lead.notes ?? "";
  const fija = await revisar({ para: r.para, asunto: r.asunto, cuerpo: r.cuerpo, notas });
  if (fija.motivo) return fija.motivo;
  const v = await verificarCorreo({
    empresa: r.lead.company || r.lead.name,
    idioma: r.idioma === "en" ? "en" : "es",
    notas,
    paginas: fija.paginas.map((x) => ({ url: x.url, texto: textoPlano(x.html) })),
    asunto: r.asunto,
    cuerpo: r.cuerpo,
    propuesta: r.adjuntarPdf ? leerPropuesta(r.propuesta) : null,
    supabaseUid,
  });
  await prisma.respuestaLead.update({ where: { id: r.id }, data: { verificacion: v, verificadaAt: new Date() } });
  return v.aprobado ? null : `La verificadora no la aprobó: ${v.problemas.join(" · ") || "sin detalle"}`;
}

async function retener(id: string, motivo: string) {
  await prisma.respuestaLead.update({
    where: { id },
    data: { aprobadaAt: null, aprobadaHuella: null, error: `Revisión automática: ${motivo}`.slice(0, 600) },
  });
}

/**
 * Pone en la cola respuestas que alguien del equipo revisó en la pantalla (primera verificación). La versión final
 * tiene que existir: lo que la persona aprobó es lo que sale. La IA verificadora la revisa antes de enviarla.
 */
export async function agendar(userId: string, ids: string[]): Promise<{ agendadas: number; sinPreparar: number }> {
  const filas = await prisma.respuestaLead.findMany({ where: { id: { in: ids }, userId, estado: { in: ["borrador", "fallo"] } }, include: CON_LEAD });
  let agendadas = 0;
  for (const r of filas) {
    if (!finalLista(r)) continue;
    await prisma.respuestaLead.update({
      where: { id: r.id },
      data: { aprobadaAt: new Date(), aprobadaHuella: huellaCorreo(r.asunto, r.cuerpo), verificacion: Prisma.DbNull, verificadaAt: null, estado: "borrador", error: null },
    });
    agendadas++;
  }
  return { agendadas, sinPreparar: filas.length - agendadas };
}

/**
 * El agente ya leyó la versión final (prospectos/preparar) y la aprueba: primera verificación. Aquí corre la
 * segunda; las que pasan entran a la cola con la huella de lo aprobado, las demás quedan en Respuestas con el motivo.
 */
export async function aprobarDelAgente(p: { userId: string; supabaseUid: string; ids: string[]; tiempoMs: number }) {
  const inicio = Date.now();
  const filas = await prisma.respuestaLead.findMany({
    where: { id: { in: [...new Set(p.ids)].slice(0, 60) }, userId: p.userId, origen: "agente", estado: { in: ["borrador", "fallo"] }, aprobadaAt: null },
    include: CON_LEAD,
  });
  const aprobadas: { id: string; empresa: string }[] = [], retenidas: { id: string; empresa: string; motivo: string }[] = [];
  let i = 0;
  // De a 4: cada una abre páginas y hace una llamada a la IA.
  for (; i < filas.length; i += 4) {
    if (Date.now() - inicio > p.tiempoMs) break;
    await Promise.all(filas.slice(i, i + 4).map(async (r) => {
      const empresa = r.lead.company || r.lead.name;
      const motivo = await verificar(r, p.supabaseUid).catch((e) => `No se pudo verificar (${e instanceof Error ? e.message : "error"}).`);
      if (motivo) {
        retenidas.push({ id: r.id, empresa, motivo });
        await retener(r.id, motivo);
      } else {
        aprobadas.push({ id: r.id, empresa });
        await prisma.respuestaLead.update({ where: { id: r.id }, data: { aprobadaAt: new Date(), aprobadaHuella: huellaCorreo(r.asunto, r.cuerpo), estado: "borrador", error: null } });
      }
    }));
  }
  return { aprobadas, retenidas, porVerificar: filas.slice(i).map((r) => r.id) };
}

export type ResultadoCola = {
  enviadas: { id: string; empresa: string }[];
  retenidas: { id: string; empresa: string; motivo: string }[];
  /** Queda cupo hoy y cola por enviar, pero se acabó el tiempo de esta llamada: hay que volver a llamar. */
  seguir: boolean;
  estado: EstadoEnvio;
};

/**
 * Envía la cola por orden de aprobación hasta llenar el cupo de hoy o agotar el tiempo de la llamada. Aquí no se
 * redacta nada: sale exactamente lo que se aprobó. Si el correo cambió desde entonces, o le falta la verificación
 * de la IA y no la pasa, se retiene. El cupo cuenta todo lo enviado hoy desde Respuestas, también lo de a mano.
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
      include: CON_LEAD,
    });
    if (!r) break;
    tomadas.add(r.id);
    const empresa = r.lead.company || r.lead.name;
    const motivo = r.aprobadaHuella !== huellaCorreo(r.asunto, r.cuerpo)
      ? "El correo cambió después de aprobarse: hay que revisarlo y aprobarlo otra vez."
      : !r.verificadaAt
        ? await verificar(r, p.supabaseUid).catch((e) => `No se pudo verificar (${e instanceof Error ? e.message : "error"}).`)
        : (r.verificacion as { aprobado?: boolean } | null)?.aprobado
          ? null
          : "La verificadora no la aprobó.";
    if (motivo) {
      res.retenidas.push({ id: r.id, empresa, motivo });
      await retener(r.id, motivo);
      continue;
    }

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
