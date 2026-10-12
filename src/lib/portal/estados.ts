/**
 * Estados de Pime Clientes. En la base son TEXT con CHECK (migración 0038); aquí viven los
 * valores válidos y cómo se llaman para una persona. Si se agrega un valor, va en los dos lados.
 */

export const LINEAS = ["normal", "premium"] as const;
export type Linea = (typeof LINEAS)[number];

export const TICKET_TIPOS = ["soporte", "cambio", "nuevo", "incidente"] as const;
export type TicketTipo = (typeof TICKET_TIPOS)[number];
export const TICKET_TIPO_LABEL: Record<TicketTipo, string> = {
  soporte: "Problema o duda",
  cambio: "Cambio a algo existente",
  nuevo: "Algo nuevo",
  incidente: "Alerta del sistema",
};

/** Tickets del equipo para los productos de la empresa interna (migración 0049). */
export const TICKET_TIPOS_INTERNOS = ["bug", "mejora", "tarea", "incidente"] as const;
export type TicketTipoInterno = (typeof TICKET_TIPOS_INTERNOS)[number];
export const TICKET_TIPO_INTERNO_LABEL: Record<TicketTipoInterno, string> = {
  bug: "Error",
  mejora: "Mejora",
  tarea: "Tarea",
  incidente: "Incidente",
};
/** Cómo se llama un tipo de ticket, sea de cliente o interno. */
export function etiquetaTipoTicket(kind: string): string {
  return (TICKET_TIPO_LABEL as Record<string, string>)[kind] ?? (TICKET_TIPO_INTERNO_LABEL as Record<string, string>)[kind] ?? kind;
}

export const TICKET_ESTADOS = ["abierto", "en_revision", "esperando_cliente", "en_progreso", "resuelto", "cerrado"] as const;
export type TicketEstado = (typeof TICKET_ESTADOS)[number];
/** Cómo lo lee el cliente: siempre dice quién tiene la pelota. */
export const TICKET_ESTADO_LABEL: Record<TicketEstado, string> = {
  abierto: "Recibido",
  en_revision: "Lo estamos revisando",
  esperando_cliente: "Espera tu respuesta",
  en_progreso: "En trabajo",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};
export const TICKET_ABIERTOS: TicketEstado[] = ["abierto", "en_revision", "esperando_cliente", "en_progreso"];

export const TICKET_PRIORIDADES = ["baja", "normal", "alta", "urgente"] as const;
export type TicketPrioridad = (typeof TICKET_PRIORIDADES)[number];

export const FASE_ESTADOS = ["pendiente", "en_curso", "en_revision", "hecha"] as const;
export type FaseEstado = (typeof FASE_ESTADOS)[number];
export const FASE_ESTADO_LABEL: Record<FaseEstado, string> = {
  pendiente: "Por empezar",
  en_curso: "En curso",
  en_revision: "En tu revisión",
  hecha: "Terminada",
};

export const FASE_COBRO = ["al_aprobar", "al_iniciar", "al_entregar", "sin_cobro"] as const;
export type FaseCobro = (typeof FASE_COBRO)[number];
export const FASE_COBRO_LABEL: Record<FaseCobro, string> = {
  al_aprobar: "Se paga al aprobar",
  al_iniciar: "Se paga al empezar",
  al_entregar: "Se paga al entregar",
  sin_cobro: "Sin cobro",
};

export const ORDEN_ESTADOS = ["borrador", "enviada", "aprobada", "rechazada", "cancelada"] as const;
export type OrdenEstado = (typeof ORDEN_ESTADOS)[number];

export const PAGO_METODOS = ["transferencia", "yappy", "tarjeta", "efectivo", "cheque", "otro"] as const;
export type PagoMetodo = (typeof PAGO_METODOS)[number];
export const PAGO_METODO_LABEL: Record<PagoMetodo, string> = {
  transferencia: "Transferencia",
  yappy: "Yappy",
  tarjeta: "Tarjeta",
  efectivo: "Efectivo",
  cheque: "Cheque",
  otro: "Otro",
};
export const PAGO_ESTADOS = ["confirmado", "por_confirmar", "rechazado"] as const;
export type PagoEstado = (typeof PAGO_ESTADOS)[number];

export const PROYECTO_TIPOS = ["nuevo", "modificacion", "soporte"] as const;
export type ProyectoTipo = (typeof PROYECTO_TIPOS)[number];

export function esUno<T extends readonly string[]>(lista: T, v: unknown): v is T[number] {
  return typeof v === "string" && (lista as readonly string[]).includes(v);
}
