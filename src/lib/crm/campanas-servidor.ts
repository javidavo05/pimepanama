/**
 * Lado servidor de las campañas: leer el segmento de la base y enviar un lote.
 * El envío es secuencial y por tandas (LOTE_POR_CLIC / TIEMPO_POR_CLIC_MS): cada correo queda marcado apenas
 * sale, así un corte a mitad de tanda nunca reenvía lo que ya salió.
 */
import { prisma } from "@/lib/prisma";
import { enviarAlCliente } from "@/lib/motor/envios";
import { getSiteUrl } from "@/lib/site-url";
import { getEmailLogoUrl } from "@/lib/company-logo";
import { correoHtml, cuerpoHtml, primerNombre, rellenarTexto } from "./correo";
import { tokenBaja } from "./correo-baja";
import { LOTE_POR_CLIC, TIEMPO_POR_CLIC_MS, type ClienteSegmento } from "./campanas";

/** Todos los clientes que podrían entrar en una campaña, más los correos dados de baja. Dos viajes, juntos. */
export async function datosDelSegmento(userId: string): Promise<{ clientes: ClienteSegmento[]; bajas: string[] }> {
  const [clientes, bajas] = await Promise.all([
    prisma.client.findMany({
      where: { userId, internal: false, archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, company: true, email: true, brandLine: true, fuente: true, industria: true, etiquetas: true, responsableId: true,
        internal: true, archivedAt: true,
        contactos: { where: { principal: true, email: { not: null } }, select: { nombre: true, email: true, principal: true } },
        _count: { select: { projects: { where: { status: "ACTIVE" } }, projectLinks: { where: { project: { status: "ACTIVE" } } } } },
      },
    }),
    prisma.bajaCorreo.findMany({ where: { userId }, select: { email: true } }),
  ]);
  return {
    clientes: clientes.map(({ _count, ...c }) => ({ ...c, proyectoActivo: _count.projects + _count.projectLinks > 0 })),
    bajas: bajas.map((b) => b.email),
  };
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ResultadoLote = { enviados: number; fallos: number; faltan: number; terminada: boolean };

/** Envía la siguiente tanda de una campaña que ya está «enviando». */
export async function enviarLote(p: { campanaId: string; userId: string; miNombre: string }): Promise<ResultadoLote> {
  const inicio = Date.now();
  const [campana, pendientes, bajas] = await Promise.all([
    prisma.campana.findFirst({ where: { id: p.campanaId, userId: p.userId }, select: { id: true, asunto: true, cuerpo: true } }),
    prisma.campanaEnvio.findMany({
      where: { campanaId: p.campanaId, estado: "pendiente", campana: { userId: p.userId } },
      take: LOTE_POR_CLIC,
      orderBy: { id: "asc" },
      select: { id: true, email: true, nombre: true, client: { select: { name: true, company: true } } },
    }),
    prisma.bajaCorreo.findMany({ where: { userId: p.userId }, select: { email: true } }),
  ]);
  if (!campana) throw new Error("No encontré esa campaña.");
  const deBaja = new Set(bajas.map((b) => b.email.toLowerCase()));
  const site = getSiteUrl();
  const logo = getEmailLogoUrl();
  let enviados = 0, fallos = 0;

  for (const e of pendientes) {
    if (Date.now() - inicio > TIEMPO_POR_CLIC_MS) break;
    if (deBaja.has(e.email.toLowerCase())) {
      await prisma.campanaEnvio.update({ where: { id: e.id }, data: { estado: "fallo", error: "Se dio de baja antes del envío" } });
      fallos++;
      continue;
    }
    const datos = { nombre: primerNombre(e.nombre), contacto: e.nombre ?? "", empresa: e.client?.company || e.client?.name || "", mi_nombre: p.miNombre };
    const t0 = Date.now();
    try {
      await enviarAlCliente({
        to: e.email,
        subject: rellenarTexto(campana.asunto, datos).trim(),
        html: correoHtml({
          cuerpo: cuerpoHtml(campana.cuerpo, datos),
          preheader: rellenarTexto(campana.asunto, datos).trim(),
          logoUrl: logo,
          siteUrl: site,
          bajaUrl: `${site}/baja/${tokenBaja(p.userId, e.email)}`,
          pixelUrl: `${site}/api/c/abrir/${e.id}.gif`,
        }),
        motivo: `campaña ${campana.id}`,
      });
      await prisma.campanaEnvio.update({ where: { id: e.id }, data: { estado: "enviado", enviadoAt: new Date(), error: null } });
      enviados++;
    } catch (err) {
      await prisma.campanaEnvio.update({ where: { id: e.id }, data: { estado: "fallo", error: String(err instanceof Error ? err.message : err).slice(0, 300) } });
      fallos++;
    }
    // Resend acepta pocos envíos por segundo: al menos medio segundo entre uno y otro.
    const pasado = Date.now() - t0;
    if (pasado < 550) await espera(550 - pasado);
  }

  const faltan = await prisma.campanaEnvio.count({ where: { campanaId: campana.id, estado: "pendiente" } });
  const terminada = faltan === 0;
  await prisma.campana.update({
    where: { id: campana.id },
    data: { enviados: { increment: enviados }, ...(terminada ? { estado: "enviada", enviadaAt: new Date() } : {}) },
  });
  return { enviados, fallos, faltan, terminada };
}
