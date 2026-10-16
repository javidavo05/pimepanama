/**
 * Historia unificada del cliente (CRM fase 2): una sola línea de tiempo con todo lo que pasó con él.
 *
 * Junta, en orden de más nuevo a más viejo:
 *   - la actividad del portal (ActivityEvent), - las conversaciones y notas (Interaccion),
 *   - los correos con el cliente o con cualquiera de sus contactos (InboxEmail),
 *   - reuniones (Meeting), citas agendadas por el lead que se convirtió en este cliente (Booking),
 *   - cotizaciones (Document COTIZACION), contratos (Contract) y tickets.
 *
 * La parte pura (convertir, fusionar, filtrar, paginar) no toca la base y se prueba en historia.test.ts.
 * La carga (`historiaDelCliente`) hace una sola ida en paralelo: cada fuente trae `limite + 1` filas
 * anteriores al cursor; si al fusionar sobran, hay más páginas.
 */

export const TIPOS_HISTORIA = ["conversacion", "nota", "correo", "reunion", "cita", "cotizacion", "contrato", "ticket", "actividad"] as const;
export type TipoHistoria = (typeof TIPOS_HISTORIA)[number];

export const TIPO_HISTORIA_LABEL: Record<TipoHistoria, string> = {
  conversacion: "Conversaciones",
  nota: "Notas",
  correo: "Correos",
  reunion: "Reuniones",
  cita: "Citas",
  cotizacion: "Cotizaciones",
  contrato: "Contratos",
  ticket: "Tickets",
  actividad: "Actividad",
};

export const TIPO_HISTORIA_UNO: Record<TipoHistoria, string> = {
  conversacion: "Conversación", nota: "Nota", correo: "Correo", reunion: "Reunión", cita: "Cita",
  cotizacion: "Cotización", contrato: "Contrato", ticket: "Ticket", actividad: "Actividad",
};

export const TIPOS_INTERACCION = ["llamada", "whatsapp", "visita", "nota", "correo", "reunion"] as const;
export type TipoInteraccion = (typeof TIPOS_INTERACCION)[number];
export const TIPO_INTERACCION_LABEL: Record<TipoInteraccion, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  visita: "Visita",
  nota: "Nota",
  correo: "Correo",
  reunion: "Reunión",
};

export type EventoHistoria = {
  /** Único en toda la historia: «<fuente>:<id>». */
  id: string;
  tipo: TipoHistoria;
  /** Matiz dentro del tipo: tipo de interacción, carpeta del correo, estado… */
  subtipo?: string | null;
  fecha: string; // ISO
  titulo: string;
  detalle?: string | null;
  enlace?: string | null;
  /** Solo interacciones: se puede fijar arriba. */
  fijada?: boolean;
  /** Id real de la fila (para fijar o borrar una interacción). */
  refId?: string;
  /** Misma cosa vista desde dos fuentes (p. ej. el ticket y su evento «ticket abierto»): se queda una. */
  clave?: string | null;
};

export type PaginaHistoria = { eventos: EventoHistoria[]; hayMas: boolean; cursor: string | null };

// ─── Conversión de cada fuente (pura) ────────────────────────────────────────

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());
const corto = (s: string | null | undefined, max = 240) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t ? (t.length > max ? `${t.slice(0, max - 1)}…` : t) : null;
};

/** Eventos del portal que repiten algo que ya trae su propia fuente. */
const CLAVE_DE_ACTIVIDAD: Record<string, (entityId: string) => string> = {
  ticket_abierto: (id) => `ticket:${id}:creado`,
};

export function deActividad(e: { id: string; title: string; detail: string | null; createdAt: Date | string; kind: string; entityType: string; entityId: string | null; actorType: string; visibility: string }): EventoHistoria {
  const clave = e.entityId && CLAVE_DE_ACTIVIDAD[e.kind] ? CLAVE_DE_ACTIVIDAD[e.kind](e.entityId) : null;
  return { id: `actividad:${e.id}`, tipo: "actividad", subtipo: e.actorType, fecha: iso(e.createdAt), titulo: e.title, detalle: [e.detail, e.visibility === "interno" ? null : "Lo ve el cliente"].filter(Boolean).join(" · ") || null, clave };
}

export function deInteraccion(i: { id: string; tipo: string; direccion: string | null; resumen: string; resultado: string | null; duracionMin: number | null; proximoPaso: string | null; fijada: boolean; ocurrioAt: Date | string; contacto?: { nombre: string } | null; autor?: { fullName: string | null; email: string } | null }): EventoHistoria {
  const label = TIPO_INTERACCION_LABEL[i.tipo as TipoInteraccion] ?? "Conversación";
  const dir = i.direccion === "entrante" ? "entrante" : i.direccion === "saliente" ? "saliente" : null;
  const titulo = i.tipo === "nota" ? "Nota" : `${label}${dir ? ` ${dir}` : ""}${i.contacto?.nombre ? ` con ${i.contacto.nombre}` : ""}`;
  const extras = [
    i.resultado ? `Resultado: ${i.resultado}` : null,
    i.duracionMin ? `${i.duracionMin} min` : null,
    i.proximoPaso ? `Próximo paso: ${i.proximoPaso}` : null,
    i.autor ? `por ${i.autor.fullName || i.autor.email}` : null,
  ].filter(Boolean);
  return {
    id: `interaccion:${i.id}`, refId: i.id, tipo: i.tipo === "nota" ? "nota" : "conversacion", subtipo: i.tipo, fecha: iso(i.ocurrioAt),
    titulo, detalle: [i.resumen, extras.join(" · ")].filter(Boolean).join("\n"), fijada: i.fijada,
  };
}

export function deCorreo(m: { id: string; subject: string | null; fromEmail: string; fromName: string | null; receivedAt: Date | string; folder: string; aiSummary: string | null; bodyText?: string | null }): EventoHistoria {
  const enviado = m.folder === "SENT";
  return {
    id: `correo:${m.id}`, tipo: "correo", subtipo: enviado ? "enviado" : "recibido", fecha: iso(m.receivedAt),
    titulo: `${enviado ? "Correo enviado" : `Correo de ${m.fromName || m.fromEmail}`}: ${m.subject?.trim() || "(sin asunto)"}`,
    detalle: corto(m.aiSummary) ?? corto(m.bodyText, 160), enlace: `/empresa/correos/${m.id}`,
  };
}

export function deReunion(r: { id: string; title: string; meetingDate: Date | string; status: string; contextSummary: string | null }): EventoHistoria {
  return { id: `reunion:${r.id}`, tipo: "reunion", subtipo: r.status, fecha: iso(r.meetingDate), titulo: `Reunión: ${r.title}`, detalle: corto(r.contextSummary), enlace: `/empresa/reuniones/${r.id}` };
}

const CITA_ESTADO: Record<string, string> = { CONFIRMED: "confirmada", CANCELLED: "cancelada", RESCHEDULED: "reprogramada" };
export function deCita(b: { id: string; attendeeName: string; startTime: Date | string; status: string; notes: string | null; eventType?: { title?: string | null } | null }): EventoHistoria {
  const nombre = b.eventType?.title || "Cita";
  return { id: `cita:${b.id}`, tipo: "cita", subtipo: b.status, fecha: iso(b.startTime), titulo: `${nombre} con ${b.attendeeName} · ${CITA_ESTADO[b.status] ?? b.status.toLowerCase()}`, detalle: corto(b.notes), enlace: "/empresa/citas" };
}

const DOC_ESTADO: Record<string, string> = { DRAFT: "borrador", SENT: "enviada", ACCEPTED: "aceptada", REJECTED: "rechazada", PAID: "pagada", PARTIALLY_PAID: "pago parcial", CANCELLED: "anulada" };
export function deCotizacion(d: { id: string; number: string | null; title: string; status: string; issueDate: Date | string; total: unknown; aceptadaAt?: Date | string | null }, dinero: (n: number) => string = (n) => `$${n.toFixed(2)}`): EventoHistoria {
  const total = Number(d.total ?? 0);
  return {
    id: `cotizacion:${d.id}`, tipo: "cotizacion", subtipo: d.status, fecha: iso(d.issueDate), clave: `cotizacion:${d.id}:creado`,
    titulo: `Cotización ${d.number ?? ""}`.trim() + `: ${d.title}`,
    detalle: [total ? dinero(total) : null, d.aceptadaAt ? "aceptada por el cliente" : DOC_ESTADO[d.status] ?? d.status.toLowerCase()].filter(Boolean).join(" · "),
    enlace: `/empresa/cotizaciones/${d.id}`,
  };
}

export function deContrato(k: { id: string; title: string; createdAt: Date | string; signingStatus: string | null; status: string }): EventoHistoria {
  const estado = k.signingStatus === "COMPLETED" ? "firmado" : k.signingStatus === "DECLINED" ? "rechazado" : k.signingStatus === "EXPIRED" ? "vencido" : k.signingStatus && k.signingStatus !== "DRAFT" ? "por firmar" : "borrador";
  return { id: `contrato:${k.id}`, tipo: "contrato", subtipo: k.signingStatus ?? k.status, fecha: iso(k.createdAt), titulo: `Contrato: ${k.title}`, detalle: estado, enlace: `/empresa/contratos/${k.id}`, clave: `contrato:${k.id}:creado` };
}

export function deTicket(t: { id: string; number: string; title: string; status: string; createdAt: Date | string; source: string }): EventoHistoria {
  return {
    id: `ticket:${t.id}`, tipo: "ticket", subtipo: t.status, fecha: iso(t.createdAt), clave: `ticket:${t.id}:creado`,
    titulo: `Ticket ${t.number}: ${t.title}`, detalle: t.source === "portal" ? "Lo abrió el cliente desde su cuenta" : null, enlace: `/empresa/tickets/${t.id}`,
  };
}

// ─── Fusión, filtro y página (pura) ──────────────────────────────────────────

/** Prioridad al quitar repetidos: la fuente propia gana sobre la actividad genérica. */
const PESO: Record<TipoHistoria, number> = { conversacion: 9, nota: 9, correo: 8, reunion: 8, cita: 8, cotizacion: 7, contrato: 7, ticket: 7, actividad: 1 };

/** Más nuevo primero; a igual fecha, orden estable por id. Quita repetidos por `id` y por `clave`. */
export function fusionarEventos(...listas: EventoHistoria[][]): EventoHistoria[] {
  const porId = new Map<string, EventoHistoria>();
  for (const l of listas) for (const e of l) if (!porId.has(e.id)) porId.set(e.id, e);
  const porClave = new Map<string, EventoHistoria>();
  const sueltos: EventoHistoria[] = [];
  for (const e of porId.values()) {
    if (!e.clave) { sueltos.push(e); continue; }
    const otro = porClave.get(e.clave);
    if (!otro || PESO[e.tipo] > PESO[otro.tipo]) porClave.set(e.clave, e);
  }
  return [...sueltos, ...porClave.values()].sort((a, b) => (a.fecha === b.fecha ? (a.id < b.id ? -1 : 1) : a.fecha < b.fecha ? 1 : -1));
}

/** Tipos válidos de una lista que llega de la URL o del navegador. Vacía = todos. */
export function tiposValidos(v: readonly string[] | null | undefined): TipoHistoria[] {
  return (v ?? []).filter((t): t is TipoHistoria => (TIPOS_HISTORIA as readonly string[]).includes(t));
}

export function filtrarEventos(eventos: EventoHistoria[], tipos: readonly TipoHistoria[]): EventoHistoria[] {
  return tipos.length ? eventos.filter((e) => tipos.includes(e.tipo)) : eventos;
}

/** Corta la página. `cursor` = fecha del último evento mostrado: la siguiente trae lo anterior a esa fecha. */
export function paginar(eventos: EventoHistoria[], limite: number): PaginaHistoria {
  const pagina = eventos.slice(0, limite);
  const hayMas = eventos.length > limite;
  return { eventos: pagina, hayMas, cursor: hayMas && pagina.length ? pagina[pagina.length - 1].fecha : null };
}

/** ¿Hay que consultar esta fuente con los tipos elegidos? Las interacciones cubren conversaciones y notas. */
export function pide(tipos: readonly TipoHistoria[], ...de: TipoHistoria[]): boolean {
  return !tipos.length || de.some((t) => tipos.includes(t));
}

// ─── Carga desde la base ─────────────────────────────────────────────────────

export const LIMITE_HISTORIA = 20;

/**
 * Una página de la historia del cliente. `antes` es el cursor (ISO) de la página anterior.
 * Las consultas van todas en paralelo (una ida a Supabase) y cada fuente trae `limite + 1`.
 * Prisma se importa adentro: así las pruebas de lo puro corren sin base.
 */
export async function historiaDelCliente(
  userId: string,
  clientId: string,
  opciones: { antes?: string | null; tipos?: readonly TipoHistoria[]; limite?: number } = {},
): Promise<PaginaHistoria> {
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const tipos = opciones.tipos ?? [];
  const limite = Math.min(Math.max(opciones.limite ?? LIMITE_HISTORIA, 1), 100);
  const toma = limite + 1;
  const antesD = opciones.antes && !Number.isNaN(Date.parse(opciones.antes)) ? new Date(opciones.antes) : null;
  const lt = antesD ? { lt: antesD } : undefined;
  const nada = Promise.resolve([] as never[]);

  const tiposInteraccion = pide(tipos, "conversacion") && pide(tipos, "nota") ? undefined : pide(tipos, "nota") ? ["nota"] : pide(tipos, "conversacion") ? TIPOS_INTERACCION.filter((t) => t !== "nota") : [];

  const [actividad, interacciones, correos, reuniones, citas, cotizaciones, contratos, tickets] = await Promise.all([
    pide(tipos, "actividad")
      ? prisma.activityEvent.findMany({ where: { clientId, userId, ...(lt && { createdAt: lt }) }, orderBy: { createdAt: "desc" }, take: toma, select: { id: true, title: true, detail: true, createdAt: true, kind: true, entityType: true, entityId: true, actorType: true, visibility: true } })
      : nada,
    tiposInteraccion === undefined || tiposInteraccion.length
      ? prisma.interaccion.findMany({
          where: { userId, clientId, ...(tiposInteraccion && { tipo: { in: [...tiposInteraccion] } }), ...(lt && { ocurrioAt: lt }) },
          orderBy: { ocurrioAt: "desc" }, take: toma,
          select: { id: true, tipo: true, direccion: true, resumen: true, resultado: true, duracionMin: true, proximoPaso: true, fijada: true, ocurrioAt: true, contacto: { select: { nombre: true } }, autor: { select: { fullName: true, email: true } } },
        })
      : nada,
    pide(tipos, "correo")
      ? prisma.$queryRaw<{ id: string; subject: string | null; fromEmail: string; fromName: string | null; receivedAt: Date; folder: string; aiSummary: string | null; bodyText: string | null }[]>(Prisma.sql`
          WITH correos AS (
            SELECT lower(trim(email)) AS e FROM "Client" WHERE id = ${clientId} AND "userId" = ${userId} AND coalesce(trim(email), '') <> ''
            UNION
            SELECT lower(trim(email)) FROM "Contacto" WHERE "clientId" = ${clientId} AND "userId" = ${userId} AND coalesce(trim(email), '') <> ''
          )
          SELECT m.id, m.subject, m."fromEmail", m."fromName", m."receivedAt", m.folder, m."aiSummary", left(m."bodyText", 400) AS "bodyText"
          FROM "InboxEmail" m
          WHERE m."userId" = ${userId}
            AND m.folder NOT IN ('TRASH', 'SPAM', 'DRAFTS')
            ${antesD ? Prisma.sql`AND m."receivedAt" < ${antesD}` : Prisma.empty}
            AND (
              lower(m."fromEmail") IN (SELECT e FROM correos)
              OR EXISTS (
                SELECT 1 FROM unnest(m."toAddresses" || m."ccAddresses") AS t(dir), correos c
                WHERE lower(trim(t.dir)) = c.e OR lower(t.dir) LIKE '%<' || c.e || '>%'
              )
            )
          ORDER BY m."receivedAt" DESC
          LIMIT ${toma}`)
      : nada,
    pide(tipos, "reunion")
      ? prisma.meeting.findMany({ where: { userId, clientId, ...(lt && { meetingDate: lt }) }, orderBy: { meetingDate: "desc" }, take: toma, select: { id: true, title: true, meetingDate: true, status: true, contextSummary: true } })
      : nada,
    pide(tipos, "cita")
      ? prisma.booking.findMany({ where: { userId, lead: { convertedClientId: clientId }, ...(lt && { startTime: lt }) }, orderBy: { startTime: "desc" }, take: toma, select: { id: true, attendeeName: true, startTime: true, status: true, notes: true, eventType: { select: { title: true } } } })
      : nada,
    pide(tipos, "cotizacion")
      ? prisma.document.findMany({ where: { userId, clientId, type: "COTIZACION", ...(lt && { issueDate: lt }) }, orderBy: { issueDate: "desc" }, take: toma, select: { id: true, number: true, title: true, status: true, issueDate: true, total: true, aceptadaAt: true } })
      : nada,
    pide(tipos, "contrato")
      ? prisma.contract.findMany({ where: { userId, clientId, ...(lt && { createdAt: lt }) }, orderBy: { createdAt: "desc" }, take: toma, select: { id: true, title: true, createdAt: true, signingStatus: true, status: true } })
      : nada,
    pide(tipos, "ticket")
      ? prisma.ticket.findMany({ where: { userId, clientId, ...(lt && { createdAt: lt }) }, orderBy: { createdAt: "desc" }, take: toma, select: { id: true, number: true, title: true, status: true, createdAt: true, source: true } })
      : nada,
  ]);

  const { dinero } = await import("@/lib/portal/datos");
  const todos = fusionarEventos(
    actividad.map(deActividad),
    interacciones.map(deInteraccion),
    correos.map(deCorreo),
    reuniones.map(deReunion),
    citas.map(deCita),
    cotizaciones.map((d) => deCotizacion(d, dinero)),
    contratos.map(deContrato),
    tickets.map(deTicket),
  );
  return paginar(filtrarEventos(todos, tipos), limite);
}
