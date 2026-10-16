/**
 * Datos del buscador global (fase 6 del CRM). Busca en clientes, contactos, leads, proyectos, facturas,
 * cotizaciones, tickets y oportunidades de la empresa, sin importar tildes ni mayúsculas: Postgres compara el texto
 * pasado por `translate` (sin depender de la extensión unaccent). Las ocho consultas van juntas, en un solo viaje.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { puedeVer } from "@/lib/auth/permisos";
import { normalizar, numeroBuscado, puntaje, TIPO_SECCION, type Resultado, type TipoResultado } from "./buscar";

const CON_TILDE = "áàäâãéèëêíìïîóòöôõúùüûñç";
const SIN_TILDE = "aaaaaeeeeiiiiooooouuuunc";
/** La columna como la compara el buscador: minúsculas y sin tildes. */
const plano = (col: string) => Prisma.raw(`translate(lower(coalesce(${col}, '')), '${CON_TILDE}', '${SIN_TILDE}')`);

export async function buscarEnDatos(userId: string, area: string | null | undefined, q: string): Promise<Resultado[]> {
  const n = normalizar(q).slice(0, 80);
  if (n.length < 2) return [];
  // «jose perez» → «%jose%perez%»; los comodines que escriba la persona se toman como texto.
  const patron = `%${n.replace(/[\\%_]/g, (c) => `\\${c}`).split(" ").join("%")}%`;
  const num = numeroBuscado(q);
  const numPatron = num ? `%${num}%` : patron;
  const ve = (t: TipoResultado) => puedeVer(area, TIPO_SECCION[t]);
  const nada = Promise.resolve([] as never[]);

  type C = { id: string; name: string; company: string | null; email: string | null; ruc: string | null; phone: string | null };
  type K = { id: string; nombre: string; email: string | null; telefono: string | null; cargo: string | null; clientId: string; cliente: string };
  type L = { id: string; name: string; company: string | null; email: string | null; phone: string | null; status: string };
  type P = { id: string; name: string; status: string; cliente: string | null };
  type D = { id: string; type: string; number: string | null; title: string; clientName: string | null; clientCompany: string | null; status: string };
  type T = { id: string; number: string; title: string; status: string; cliente: string };
  type O = { id: string; titulo: string; estado: string; cliente: string | null };

  const [clientes, contactos, leads, proyectos, docs, tickets, oportunidades] = await Promise.all([
    ve("cliente") ? prisma.$queryRaw<C[]>`
      SELECT id, name, company, email, ruc, phone FROM "Client"
      WHERE "userId" = ${userId} AND "archivedAt" IS NULL
        AND (${plano('name')} LIKE ${patron} OR ${plano('company')} LIKE ${patron} OR ${plano('email')} LIKE ${patron}
             OR ${plano('ruc')} LIKE ${patron} OR ${plano('phone')} LIKE ${patron})
      ORDER BY "updatedAt" DESC LIMIT 20` : nada,
    ve("contacto") ? prisma.$queryRaw<K[]>`
      SELECT k.id, k.nombre, k.email, k.telefono, k.cargo, k."clientId", coalesce(c.company, c.name) AS cliente
      FROM "Contacto" k JOIN "Client" c ON c.id = k."clientId"
      WHERE k."userId" = ${userId} AND c."archivedAt" IS NULL
        AND (${plano('k.nombre')} LIKE ${patron} OR ${plano('k.email')} LIKE ${patron} OR ${plano('k.telefono')} LIKE ${patron})
      ORDER BY k."updatedAt" DESC LIMIT 20` : nada,
    ve("lead") ? prisma.$queryRaw<L[]>`
      SELECT id, name, company, email, phone, status::text AS status FROM "Lead"
      WHERE "userId" = ${userId}
        AND (${plano('name')} LIKE ${patron} OR ${plano('company')} LIKE ${patron} OR ${plano('email')} LIKE ${patron} OR ${plano('phone')} LIKE ${patron})
      ORDER BY "updatedAt" DESC LIMIT 20` : nada,
    ve("proyecto") ? prisma.$queryRaw<P[]>`
      SELECT p.id, p.name, p.status::text AS status, coalesce(c.company, c.name) AS cliente
      FROM "Project" p LEFT JOIN "Client" c ON c.id = p."clientId"
      WHERE p."userId" = ${userId} AND (${plano('p.name')} LIKE ${patron} OR ${plano('c.company')} LIKE ${patron} OR ${plano('c.name')} LIKE ${patron})
      ORDER BY p."updatedAt" DESC LIMIT 20` : nada,
    ve("factura") || ve("cotizacion") ? prisma.$queryRaw<D[]>`
      SELECT id, type::text AS type, number, title, "clientName", "clientCompany", status::text AS status FROM "Document"
      WHERE "userId" = ${userId} AND type::text IN ('FACTURA', 'COTIZACION')
        AND (${plano('number')} LIKE ${numPatron} OR ${plano('title')} LIKE ${patron} OR ${plano('"clientCompany"')} LIKE ${patron} OR ${plano('"clientName"')} LIKE ${patron})
      ORDER BY "updatedAt" DESC LIMIT 30` : nada,
    ve("ticket") ? prisma.$queryRaw<T[]>`
      SELECT t.id, t.number, t.title, t.status, coalesce(c.company, c.name) AS cliente
      FROM "Ticket" t JOIN "Client" c ON c.id = t."clientId"
      WHERE t."userId" = ${userId} AND (${plano('t.number')} LIKE ${numPatron} OR ${plano('t.title')} LIKE ${patron})
      ORDER BY t."updatedAt" DESC LIMIT 20` : nada,
    ve("oportunidad") ? prisma.$queryRaw<O[]>`
      SELECT o.id, o.titulo, o.estado, coalesce(c.company, c.name) AS cliente
      FROM "Oportunidad" o LEFT JOIN "Client" c ON c.id = o."clientId"
      WHERE o."userId" = ${userId} AND (${plano('o.titulo')} LIKE ${patron} OR ${plano('c.company')} LIKE ${patron} OR ${plano('c.name')} LIKE ${patron})
      ORDER BY o."updatedAt" DESC LIMIT 20` : nada,
  ]);

  const r: Resultado[] = [];
  const junta = (...xs: (string | null | undefined)[]) => xs.filter(Boolean).join(" · ");
  // Si el número coincide, el documento sube aunque el título no tenga las palabras.
  const porNumero = (numero: string | null) => (num && numero && normalizar(numero).includes(num) ? 80 : 0);

  for (const c of clientes) r.push({ tipo: "cliente", id: c.id, titulo: c.company || c.name, detalle: junta(c.company ? c.name : null, c.email, c.ruc && `RUC ${c.ruc}`), href: `/empresa/clientes/${c.id}`, puntaje: Math.max(1, puntaje(q, c.company || c.name, c.name, c.email, c.ruc, c.phone)) });
  for (const k of contactos) r.push({ tipo: "contacto", id: k.id, titulo: k.nombre, detalle: junta(k.cargo, k.cliente, k.email ?? k.telefono), href: `/empresa/clientes/${k.clientId}`, puntaje: Math.max(1, puntaje(q, k.nombre, k.email, k.telefono)) });
  for (const l of leads) r.push({ tipo: "lead", id: l.id, titulo: l.company || l.name, detalle: junta(l.company ? l.name : null, l.email, ESTADO_LEAD[l.status]), href: `/empresa/leads/${l.id}`, puntaje: Math.max(1, puntaje(q, l.company || l.name, l.name, l.email, l.phone)) });
  for (const p of proyectos) r.push({ tipo: "proyecto", id: p.id, titulo: p.name, detalle: junta(p.cliente, ESTADO_PROYECTO[p.status]), href: `/empresa/proyectos/${p.id}`, puntaje: Math.max(1, puntaje(q, p.name, p.cliente)) });
  for (const d of docs) {
    const tipo = d.type === "FACTURA" ? "factura" : "cotizacion";
    if (!ve(tipo)) continue;
    r.push({ tipo, id: d.id, titulo: d.number ? `${d.number} · ${d.title}` : d.title, detalle: junta(d.clientCompany || d.clientName), href: `/empresa/${tipo === "factura" ? "facturas" : "cotizaciones"}/${d.id}`, puntaje: Math.max(1, porNumero(d.number), puntaje(q, d.title, d.number, d.clientCompany, d.clientName)) });
  }
  for (const t of tickets) r.push({ tipo: "ticket", id: t.id, titulo: `${t.number} · ${t.title}`, detalle: t.cliente, href: `/empresa/tickets/${t.id}`, puntaje: Math.max(1, porNumero(t.number), puntaje(q, t.title, t.number)) });
  for (const o of oportunidades) r.push({ tipo: "oportunidad", id: o.id, titulo: o.titulo, detalle: junta(o.cliente, ESTADO_OPORTUNIDAD[o.estado]), href: `/empresa/ventas?oportunidad=${o.id}`, puntaje: Math.max(1, puntaje(q, o.titulo, o.cliente)) });
  return r;
}

const ESTADO_LEAD: Record<string, string> = { NUEVO: "Nuevo", CONTACTADO: "Contactado", COTIZANDO: "Cotizando", NEGOCIACION: "Negociación", GANADO: "Ganado", PERDIDO: "Perdido" };
const ESTADO_PROYECTO: Record<string, string> = { ACTIVE: "En curso", PAUSED: "En pausa", COMPLETED: "Terminado", CANCELLED: "Cancelado" };
const ESTADO_OPORTUNIDAD: Record<string, string> = { abierta: "Abierta", ganada: "Ganada", perdida: "Perdida" };
