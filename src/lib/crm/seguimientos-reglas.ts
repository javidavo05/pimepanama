/**
 * Reglas puras de los seguimientos del CRM (fase 4). Sin base de datos: deciden qué tareas hay que crear
 * a partir de los datos ya cargados, para poder probarlas (seguimientos.test.ts). La parte que lee y
 * escribe en la base vive en seguimientos.ts.
 *
 * Fechas: todo se compara por «día de Panamá» (UTC−5, sin horario de verano) como texto AAAA-MM-DD.
 * Una fecha guardada a medianoche UTC es una etiqueta de calendario (un <input type="date">) y se lee
 * tal cual; cualquier otra hora es un instante real y se pasa a la hora de Panamá.
 */

export type Regla = { activa: boolean; dias: number };
export type ReglasCrm = { leadSinRespuesta: Regla; clienteSinContacto: Regla; renovacion: Regla };

export const REGLAS_POR_DEFECTO: ReglasCrm = {
  leadSinRespuesta: { activa: true, dias: 3 },
  clienteSinContacto: { activa: true, dias: 45 },
  renovacion: { activa: true, dias: 30 },
};

export const LIMITES_DIAS = { min: 1, max: 365 };

/** Cuántos días hacia atrás se recupera un seguimiento que el cron no alcanzó a crear (p. ej. un día caído). */
export const DIAS_DE_GRACIA = 7;

const dias = (v: unknown, def: number) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= LIMITES_DIAS.min && n <= LIMITES_DIAS.max ? n : def;
};
const activa = (v: unknown) => v !== false;

/** Lee CompanyConfig.reglasCrm (JSON plano) con los valores por defecto para lo que falte o venga roto. */
export function reglasDe(json: unknown): ReglasCrm {
  const o = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const d = REGLAS_POR_DEFECTO;
  return {
    leadSinRespuesta: { activa: activa(o.leadSinRespuestaActiva), dias: dias(o.leadSinRespuestaDias, d.leadSinRespuesta.dias) },
    clienteSinContacto: { activa: activa(o.clienteSinContactoActiva), dias: dias(o.clienteSinContactoDias, d.clienteSinContacto.dias) },
    renovacion: { activa: activa(o.renovacionActiva), dias: dias(o.renovacionDias, d.renovacion.dias) },
  };
}

/** Lo que se guarda en CompanyConfig.reglasCrm. */
export function reglasAJson(r: ReglasCrm) {
  return {
    leadSinRespuestaDias: r.leadSinRespuesta.dias,
    leadSinRespuestaActiva: r.leadSinRespuesta.activa,
    clienteSinContactoDias: r.clienteSinContacto.dias,
    clienteSinContactoActiva: r.clienteSinContacto.activa,
    renovacionDias: r.renovacion.dias,
    renovacionActiva: r.renovacion.activa,
  };
}

// ─── Días ─────────────────────────────────────────────────────────────────────

const PANAMA_MS = 5 * 3600_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Día de Panamá de un instante. */
export function diaPanama(d: Date): string {
  return iso(new Date(d.getTime() - PANAMA_MS));
}

/** Día de una fecha guardada: medianoche UTC = etiqueta de calendario; si no, el día de Panamá de ese instante. */
export function diaDeFecha(d: Date): string {
  const esEtiqueta = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  return esEtiqueta ? iso(d) : diaPanama(d);
}

/** Día de una tarea: las de todo el día se guardan a medianoche UTC; las que tienen hora, como instante. */
export function diaDeTarea(t: { dueDate: Date | null; allDay: boolean }): string | null {
  if (!t.dueDate) return null;
  return t.allDay ? iso(t.dueDate) : diaPanama(t.dueDate);
}

/** «2026-10-16» → medianoche UTC de ese día, como guardan las tareas de todo el día. */
export function fechaDeDia(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

/** Días de `desde` a `hasta` (positivo si `hasta` es después). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((fechaDeDia(hasta).getTime() - fechaDeDia(desde).getTime()) / 86_400_000);
}

export function sumarDias(dia: string, n: number): string {
  return iso(new Date(fechaDeDia(dia).getTime() + n * 86_400_000));
}

/** «2026-11-15» → «15 de noviembre de 2026». */
export function diaLegible(dia: string): string {
  return fechaDeDia(dia).toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** La fecha más reciente de una lista (las vacías no cuentan). */
export function masReciente(fechas: (Date | null | undefined)[]): Date | null {
  let max: Date | null = null;
  for (const f of fechas) if (f && (!max || f.getTime() > max.getTime())) max = f;
  return max;
}

// ─── Qué tareas hay que crear ─────────────────────────────────────────────────

export type MotivoSeguimiento = "seguimiento" | "lead_sin_respuesta" | "cliente_sin_contacto" | "renovacion";

export type LeadDato = {
  id: string;
  nombre: string;
  /** LeadStatus */
  status: string;
  responsableId: string | null;
  nextFollowUpAt: Date | null;
  /** Último movimiento: alta, última interacción o última tarea suya completada. */
  ultimaActividad: Date;
};

export type ClienteDato = {
  id: string;
  nombre: string;
  responsableId: string | null;
  /** Client.ultimoContactoAt, la última interacción, el último movimiento de su línea de tiempo o tarea completada. */
  ultimaActividad: Date;
};

export type ContratoDato = {
  id: string;
  titulo: string;
  clientId: string;
  clienteNombre: string;
  responsableId: string | null;
  endsAt: Date;
};

/** Lo mínimo de una tarea que ya existe, para no duplicar. */
export type TareaExistente = {
  titulo: string;
  clientId: string | null;
  leadId: string | null;
  completed: boolean;
  /** Día de entrega (diaDeTarea) */
  dia: string | null;
};

export type TareaNueva = {
  motivo: MotivoSeguimiento;
  titulo: string;
  descripcion: string;
  clientId: string | null;
  leadId: string | null;
  responsableId: string;
  /** Día de entrega, AAAA-MM-DD */
  dia: string;
  prioridad: "HIGH" | "MEDIUM";
};

export const LEAD_CERRADO = new Set(["GANADO", "PERDIDO"]);
/** «Sin respuesta» solo aplica mientras se le está escribiendo: nuevo o ya contactado, sin cotización en curso. */
export const LEAD_ESPERANDO = new Set(["NUEVO", "CONTACTADO"]);

export const tituloSeguimiento = (lead: string) => `Seguimiento: ${lead}`;
export const tituloLeadSinRespuesta = (lead: string) => `Volver a escribir a ${lead}`;
export const tituloContactar = (cliente: string) => `Contactar a ${cliente}`;
export const tituloRenovacion = (contrato: string, cliente: string) => `Renovar contrato: ${contrato} · ${cliente}`;

/**
 * Día en que se encendieron las reglas automáticas (salida del CRM). La inactividad se cuenta desde aquí como
 * mínimo: los clientes y leads viejos no tienen fecha de último contacto guardada, y sin este piso la primera
 * corrida crearía una tarea por cada uno.
 */
export const ARRANQUE_REGLAS = "2026-10-16";
/** Tareas nuevas por regla y por día (las de más tiempo quietas primero): el resto sale los días siguientes. */
export const MAX_POR_REGLA = 3;

const misma = (t: TareaExistente, n: { titulo: string; clientId: string | null; leadId: string | null }) =>
  t.titulo === n.titulo && (t.clientId ?? null) === n.clientId && (t.leadId ?? null) === n.leadId;

/**
 * Decide las tareas que crea el cron diario. No duplica:
 * - Seguimiento programado del lead: una sola vez por fecha de seguimiento (abierta o ya hecha).
 * - Lead sin respuesta y cliente sin contacto: nunca dos abiertas iguales. Completar la tarea cuenta como
 *   contacto (el que llama pasa esa fecha en ultimaActividad), así que no reaparece al día siguiente.
 * - Renovación: una sola vez por contrato y fecha de vencimiento.
 * Lead sin respuesta y cliente sin contacto cuentan la inactividad desde ARRANQUE_REGLAS como mínimo y crean a lo
 * sumo MAX_POR_REGLA tareas por día cada una, para que nunca llegue una avalancha de golpe.
 */
export function planearSeguimientos(input: {
  duenoId: string;
  hoy: string;
  reglas: ReglasCrm;
  leads: LeadDato[];
  clientes: ClienteDato[];
  contratos: ContratoDato[];
  tareas: TareaExistente[];
  /** Piso de la inactividad (día AAAA-MM-DD). Por omisión, ARRANQUE_REGLAS. */
  arranque?: string;
}): TareaNueva[] {
  const { duenoId, hoy, reglas } = input;
  const piso = input.arranque ?? ARRANQUE_REGLAS;
  const quietoDesde = (d: Date) => { const dia = diaDeFecha(d); return diasEntre(dia < piso ? piso : dia, hoy); };
  const tareas = [...input.tareas];
  const nuevas: TareaNueva[] = [];
  const agregar = (n: TareaNueva) => {
    nuevas.push(n);
    tareas.push({ titulo: n.titulo, clientId: n.clientId, leadId: n.leadId, completed: false, dia: n.dia });
  };

  const candidatosLead: { quieto: number; tarea: TareaNueva }[] = [];
  for (const l of input.leads) {
    if (LEAD_CERRADO.has(l.status)) continue;
    const responsableId = l.responsableId ?? duenoId;

    // 1. El seguimiento que el equipo programó en el lead
    if (l.nextFollowUpAt) {
      const dia = diaDeFecha(l.nextFollowUpAt);
      const atraso = diasEntre(dia, hoy);
      const n = { titulo: tituloSeguimiento(l.nombre), clientId: null, leadId: l.id };
      if (atraso >= 0 && atraso <= DIAS_DE_GRACIA && !tareas.some((t) => misma(t, n) && t.dia === dia)) {
        agregar({ ...n, motivo: "seguimiento", descripcion: "Seguimiento programado en el lead.", responsableId, dia, prioridad: "HIGH" });
        continue;
      }
    }

    // 2. Lead sin respuesta en N días
    if (reglas.leadSinRespuesta.activa && LEAD_ESPERANDO.has(l.status)) {
      const quieto = quietoDesde(l.ultimaActividad);
      const n = { titulo: tituloLeadSinRespuesta(l.nombre), clientId: null, leadId: l.id };
      // Si ya tiene cualquier tarea abierta, el equipo ya lo está siguiendo.
      const abierta = tareas.some((t) => !t.completed && t.leadId === l.id);
      if (quieto >= reglas.leadSinRespuesta.dias && !abierta) {
        candidatosLead.push({ quieto, tarea: { ...n, motivo: "lead_sin_respuesta", descripcion: `Lleva ${quieto} días sin movimiento. Escríbele o llámalo y anota cómo te fue.`, responsableId, dia: hoy, prioridad: "MEDIUM" } });
      }
    }
  }
  candidatosLead.sort((a, b) => b.quieto - a.quieto).slice(0, MAX_POR_REGLA).forEach((c) => agregar(c.tarea));

  // 3. Cliente sin contacto en N días
  if (reglas.clienteSinContacto.activa) {
    const candidatos: { quieto: number; tarea: TareaNueva }[] = [];
    for (const c of input.clientes) {
      const quieto = quietoDesde(c.ultimaActividad);
      if (quieto < reglas.clienteSinContacto.dias) continue;
      const n = { titulo: tituloContactar(c.nombre), clientId: c.id, leadId: null };
      if (tareas.some((t) => !t.completed && misma(t, n))) continue;
      candidatos.push({ quieto, tarea: { ...n, motivo: "cliente_sin_contacto", descripcion: `Lleva ${quieto} días sin contacto. Una llamada o un mensaje corto para saber cómo va.`, responsableId: c.responsableId ?? duenoId, dia: hoy, prioridad: "MEDIUM" } });
    }
    candidatos.sort((a, b) => b.quieto - a.quieto).slice(0, MAX_POR_REGLA).forEach((c) => agregar(c.tarea));
  }

  // 4. Contrato que vence en N días
  if (reglas.renovacion.activa) {
    for (const k of input.contratos) {
      const vence = diaDeFecha(k.endsAt);
      const faltan = diasEntre(hoy, vence);
      if (faltan < 0 || faltan > reglas.renovacion.dias) continue;
      const n = { titulo: tituloRenovacion(k.titulo, k.clienteNombre), clientId: k.clientId, leadId: null };
      if (tareas.some((t) => misma(t, n) && (!t.completed || t.dia === vence))) continue;
      agregar({ ...n, motivo: "renovacion", descripcion: `El contrato vence el ${diaLegible(vence)}. Propón la renovación antes de esa fecha.`, responsableId: k.responsableId ?? duenoId, dia: vence, prioridad: "HIGH" });
    }
  }

  return nuevas;
}
