import { NextResponse } from "next/server";
import type { LeadPriority } from "@prisma/client";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireProspectorUser } from "@/lib/devices/tokens";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/notify";
import { getSiteUrl } from "@/lib/site-url";
import { tokenBaja } from "@/lib/crm/correo-baja";
import { loteDeAhora } from "@/lib/leads/respuestas-comun";

export const runtime = "nodejs";

/**
 * Entrada del agente de prospección diaria (rutina de Claude en la nube). Solo acepta la llave de alcance
 * «prospectos»: no lee correo, clientes ni nada más del panel.
 *
 * GET  → lo que el agente necesita para no repetir: empresas, dominios y correos que ya están en el CRM o dados de baja.
 * POST → carga hasta 25 prospectos como Lead (fuente LLAMADA_FRIA, etiqueta «agente»), con el puntaje, las fuentes y
 *        los mensajes ya redactados en la nota y como RespuestaLead de la tanda del día (se revisan y envían desde
 *        /empresa/leads, pestaña Respuestas). No envía nada a nadie: Javier revisa y envía.
 *
 * Correos a EE. UU. (CAN-SPAM): el borrador sale con la dirección física de Pime y el enlace de baja firmado; quien
 * se da de baja (BajaCorreo) no vuelve a entrar.
 */

const DIRECCION = process.env.PIME_DIRECCION_POSTAL || "Pime Panamá · Coco Palace, Avenida Las Amapolas, Ciudad de Panamá, Panamá";
const MAX = 25;

const recorte = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const normal = (s: string) => s.trim().toLowerCase();
function dominio(url: string): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}
function prioridad(puntaje: number): LeadPriority {
  return puntaje >= 75 ? "ALTA" : puntaje >= 50 ? "MEDIA" : "BAJA";
}
const ahora = () => new Date().toLocaleString("es-PA", { timeZone: "America/Panama" });

/** El dueño de los datos: una llave emitida a un miembro del equipo carga en la empresa del dueño. */
async function dueno(request: Request) {
  const u = await requireProspectorUser(request);
  return u.ownerId ?? u.id;
}

export const GET = withEmpresaRoute(async (request) => {
  const userId = await dueno(request);
  const [leads, bajas] = await Promise.all([
    prisma.lead.findMany({ where: { userId }, select: { company: true, email: true, notes: true } }),
    prisma.bajaCorreo.findMany({ where: { userId }, select: { email: true } }),
  ]);
  const empresas = new Set<string>(), dominios = new Set<string>(), correos = new Set<string>();
  for (const l of leads) {
    if (l.company) empresas.add(normal(l.company));
    if (l.email) {
      correos.add(normal(l.email));
      const d = l.email.split("@")[1];
      if (d) dominios.add(d.toLowerCase());
    }
    const sitio = l.notes?.match(/^Sitio: (\S+)/m)?.[1];
    if (sitio) dominios.add(dominio(sitio));
  }
  for (const b of bajas) correos.add(normal(b.email));
  return NextResponse.json({ empresas: [...empresas], dominios: [...dominios].filter(Boolean), correos: [...correos] });
});

type Entrada = Record<string, unknown>;

export const POST = withEmpresaRoute(async (request) => {
  const userId = await dueno(request);
  const body = (await request.json().catch(() => null)) as { prospectos?: Entrada[] } | null;
  const lista = Array.isArray(body?.prospectos) ? body!.prospectos.slice(0, MAX) : [];
  if (!lista.length) return NextResponse.json({ error: "Falta «prospectos» (lista de 1 a 25)" }, { status: 400 });

  const [leads, bajas] = await Promise.all([
    prisma.lead.findMany({ where: { userId }, select: { company: true, email: true, notes: true } }),
    prisma.bajaCorreo.findMany({ where: { userId }, select: { email: true } }),
  ]);
  const empresas = new Set(leads.map((l) => (l.company ? normal(l.company) : "")).filter(Boolean));
  const correos = new Set(leads.map((l) => (l.email ? normal(l.email) : "")).filter(Boolean));
  const dominios = new Set(
    leads.flatMap((l) => [l.email?.split("@")[1]?.toLowerCase() ?? "", dominio(l.notes?.match(/^Sitio: (\S+)/m)?.[1] ?? "")]).filter(Boolean),
  );
  const dadosDeBaja = new Set(bajas.map((b) => normal(b.email)));
  const site = getSiteUrl();
  const lote = loteDeAhora();

  const creados: { id: string; empresa: string; puntaje: number }[] = [];
  const duplicados: string[] = [], deBaja: string[] = [], invalidos: string[] = [];

  for (const p of lista) {
    const empresa = recorte(p.empresa, 160);
    if (!empresa) { invalidos.push("(sin empresa)"); continue; }
    const email = recorte(p.email, 200).toLowerCase();
    const sitio = recorte(p.sitio, 300);
    const dom = dominio(sitio);
    if (email && dadosDeBaja.has(email)) { deBaja.push(empresa); continue; }
    if (empresas.has(normal(empresa)) || (email && correos.has(email)) || (dom && dominios.has(dom))) { duplicados.push(empresa); continue; }

    const mercado = recorte(p.mercado, 4).toUpperCase() === "US" ? "US" : "PA";
    const segmento = recorte(p.segmento, 60) || "general";
    const puntaje = Math.max(0, Math.min(100, Math.round(Number(p.puntaje) || 0)));
    const razones = recorte(p.razones, 800);
    const fuentes = Array.isArray(p.fuentes) ? p.fuentes.filter((f): f is string => typeof f === "string").slice(0, 6).map((f) => f.slice(0, 300)) : [];
    const linkedin = recorte(p.perfilLinkedin, 300);
    const mensajeLinkedin = recorte(p.mensajeLinkedin, 1200);
    const correo = (p.correo && typeof p.correo === "object" ? p.correo : {}) as Entrada;
    const asunto = recorte(correo.asunto, 160);
    let cuerpo = recorte(correo.cuerpo, 4000);
    if (cuerpo && email) {
      // CAN-SPAM (y buena práctica en Panamá): dirección física real y una forma clara de darse de baja.
      const baja = `${site}/baja/${tokenBaja(userId, email)}`;
      cuerpo += mercado === "US"
        ? `\n\n—\n${DIRECCION}\nIf you'd rather not hear from us, unsubscribe here: ${baja}`
        : `\n\n—\n${DIRECCION}\nSi prefiere no recibir más correos, dese de baja aquí: ${baja}`;
    }

    const nota = [
      `[${ahora()}] Agente de prospección · puntaje ${puntaje}/100 · ${mercado === "US" ? "EE. UU." : "Panamá"} · ${segmento}`,
      sitio ? `Sitio: ${sitio}` : "",
      linkedin ? `LinkedIn: ${linkedin}` : "",
      razones ? `Por qué encaja: ${razones}` : "",
      fuentes.length ? `Fuentes:\n${fuentes.map((f) => `- ${f}`).join("\n")}` : "",
      mensajeLinkedin ? `Mensaje para LinkedIn (enviar a mano):\n${mensajeLinkedin}` : "",
      cuerpo ? `Correo (borrador, no enviado):\nAsunto: ${asunto}\n\n${cuerpo}` : "",
    ].filter(Boolean).join("\n\n");

    const lead = await prisma.lead.create({
      data: {
        userId,
        name: recorte(p.contacto, 120) || empresa,
        company: empresa,
        email: email || null,
        phone: recorte(p.telefono, 40) || null,
        city: recorte(p.ciudad, 80) || null,
        country: recorte(p.pais, 80) || (mercado === "US" ? "Estados Unidos" : "Panamá"),
        source: "LLAMADA_FRIA",
        status: "NUEVO",
        priority: prioridad(puntaje),
        priorityReason: razones ? razones.slice(0, 300) : null,
        etiquetas: ["agente", `mercado:${mercado}`, `segmento:${segmento}`],
        notes: nota,
      },
      select: { id: true },
    });
    if (cuerpo || mensajeLinkedin) {
      await prisma.respuestaLead.create({
        data: {
          userId, leadId: lead.id, lote, origen: "agente", idioma: mercado === "US" ? "en" : "es",
          para: email || null, asunto, cuerpo, mensajeLinkedin: mensajeLinkedin || null, linkedinUrl: linkedin || null,
        },
      });
    }
    creados.push({ id: lead.id, empresa, puntaje });
    empresas.add(normal(empresa));
    if (email) correos.add(email);
    if (dom) dominios.add(dom);
  }

  if (creados.length) {
    const altos = creados.filter((c) => c.puntaje >= 75).length;
    await notifyUser({
      userId,
      title: `${creados.length} prospecto${creados.length === 1 ? "" : "s"} nuevo${creados.length === 1 ? "" : "s"} del agente`,
      body: `${altos} con puntaje alto. Los correos y las propuestas esperan tu revisión en Respuestas.`,
      link: "/empresa/leads?vista=respuestas",
      tag: "agente-prospeccion",
    });
  }

  return NextResponse.json({ creados, duplicados, deBaja, invalidos });
});
