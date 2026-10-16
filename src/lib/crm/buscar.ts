/**
 * Buscador global de la suite (fase 6 del CRM). Lógica pura, sin base de datos: normalizar el texto, el registro
 * de pantallas con sus sinónimos y cómo se ordenan y agrupan los resultados. Lo usan el componente
 * `buscador-global.tsx` (pantallas, al instante) y la ruta `/api/empresa/buscar` (datos).
 */
import { puedeVer, type Seccion } from "@/lib/auth/permisos";

/** Minúsculas, sin tildes ni diéresis, espacios simples. «Panamá  S.A.» → «panama s.a.». */
export function normalizar(texto: string | null | undefined): string {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras de la búsqueda, ya normalizadas. */
export function terminos(q: string): string[] {
  return normalizar(q).split(" ").filter(Boolean);
}

/**
 * Qué tan bien coincide un texto con la búsqueda: 0 si falta alguna palabra. Gana el que empieza igual,
 * después el que tiene una palabra que empieza igual y al final el que solo la contiene.
 */
export function puntaje(q: string, ...campos: (string | null | undefined)[]): number {
  const ts = terminos(q);
  if (!ts.length) return 0;
  const textos = campos.map(normalizar).filter(Boolean);
  if (!textos.length) return 0;
  const todo = textos.join(" ");
  if (!ts.every((t) => todo.includes(t))) return 0;
  const frase = ts.join(" ");
  let p = 1;
  for (const [i, tx] of textos.entries()) {
    const peso = i === 0 ? 2 : 1; // el primer campo es el título
    if (tx === frase) p = Math.max(p, 100 * peso);
    else if (tx.startsWith(frase)) p = Math.max(p, 60 * peso);
    else if (tx.split(/[\s\-./]+/).some((w) => w.startsWith(ts[0]))) p = Math.max(p, 30 * peso);
    else if (tx.includes(frase)) p = Math.max(p, 10 * peso);
  }
  return p;
}

// ─── Tipos de resultado ───────────────────────────────────────────────────────

export const TIPOS = ["pantalla", "cliente", "contacto", "lead", "oportunidad", "proyecto", "factura", "cotizacion", "ticket"] as const;
export type TipoResultado = (typeof TIPOS)[number];

export const TIPO_LABEL: Record<TipoResultado, string> = {
  pantalla: "Pantallas", cliente: "Clientes", contacto: "Contactos", lead: "Leads", oportunidad: "Oportunidades",
  proyecto: "Proyectos", factura: "Facturas", cotizacion: "Cotizaciones", ticket: "Tickets",
};

/** Sección que debe poder ver el miembro para que le salga cada tipo de dato. */
export const TIPO_SECCION: Record<TipoResultado, Seccion> = {
  pantalla: "inicio", cliente: "clientes", contacto: "clientes", lead: "leads", oportunidad: "ventas",
  proyecto: "proyectos", factura: "facturas", cotizacion: "cotizaciones", ticket: "tickets",
};

export type Resultado = { tipo: TipoResultado; id: string; titulo: string; detalle?: string | null; href: string; puntaje: number };

/** Ordena por puntaje (y por título) y agrupa por tipo en el orden de `TIPOS`, con un tope por grupo. */
export function agrupar(resultados: Resultado[], porGrupo = 5): { tipo: TipoResultado; label: string; items: Resultado[] }[] {
  return TIPOS.map((tipo) => ({
    tipo,
    label: TIPO_LABEL[tipo],
    items: resultados
      .filter((r) => r.tipo === tipo && r.puntaje > 0)
      .sort((a, b) => b.puntaje - a.puntaje || a.titulo.localeCompare(b.titulo, "es"))
      .slice(0, porGrupo),
  })).filter((g) => g.items.length > 0);
}

/** Lista plana en el orden en que se pintan: la que recorren las flechas. */
export function aplanar(grupos: { items: Resultado[] }[]): Resultado[] {
  return grupos.flatMap((g) => g.items);
}

/** Siguiente índice con las flechas, dando la vuelta en los extremos. */
export function moverIndice(actual: number, total: number, paso: 1 | -1): number {
  if (total <= 0) return -1;
  if (actual < 0) return paso === 1 ? 0 : total - 1;
  return (actual + paso + total) % total;
}

/** Un número de documento o ticket escrito a medias: «fac 12», «TK-0012», «12» → «12». */
export function numeroBuscado(q: string): string | null {
  const m = normalizar(q).match(/(\d{1,8})\s*$/);
  return m ? m[1] : null;
}

// ─── Pantallas ────────────────────────────────────────────────────────────────

export type Pantalla = { href: string; titulo: string; leyenda: string; sinonimos: string[]; seccion: Seccion; comun?: boolean };

export const PANTALLAS: Pantalla[] = [
  { href: "/empresa", titulo: "Inicio", leyenda: "Lo que toca hoy: cobros, tickets y reuniones.", sinonimos: ["tablero", "resumen", "dashboard", "hoy"], seccion: "inicio" },
  { href: "/empresa/clientes", titulo: "Clientes", leyenda: "Todos los clientes, con saldo, responsable y último contacto.", sinonimos: ["cartera", "cuentas", "empresas", "lista"], seccion: "clientes", comun: true },
  { href: "/empresa/clientes/nuevo", titulo: "Nuevo cliente", leyenda: "Crear la ficha de un cliente.", sinonimos: ["agregar cliente", "crear cliente", "alta"], seccion: "clientes", comun: true },
  { href: "/empresa/clientes/importar", titulo: "Importar clientes", leyenda: "Subir una hoja CSV con muchos clientes de una vez.", sinonimos: ["csv", "excel", "subir", "cargar clientes", "migrar"], seccion: "clientes" },
  { href: "/empresa/clientes/duplicados", titulo: "Clientes duplicados", leyenda: "Encontrar clientes repetidos y fusionarlos en uno.", sinonimos: ["repetidos", "fusionar", "unir", "combinar"], seccion: "clientes" },
  { href: "/empresa/tareas", titulo: "Tareas", leyenda: "Pendientes del equipo, con fecha y responsable.", sinonimos: ["pendientes", "to do", "recordatorios"], seccion: "tareas", comun: true },
  { href: "/empresa/reuniones", titulo: "Reuniones", leyenda: "Grabaciones, minutas y acuerdos con clientes.", sinonimos: ["minutas", "actas", "llamadas", "grabaciones"], seccion: "reuniones" },
  { href: "/empresa/reuniones/nueva", titulo: "Nueva reunión", leyenda: "Grabar o subir una reunión para sacar la minuta.", sinonimos: ["grabar reunion", "subir audio"], seccion: "reuniones" },
  { href: "/empresa/leads", titulo: "Leads", leyenda: "Prospectos que todavía no son clientes.", sinonimos: ["prospectos", "interesados", "contactos nuevos"], seccion: "leads" },
  { href: "/empresa/leads/nuevo", titulo: "Nuevo lead", leyenda: "Anotar un prospecto.", sinonimos: ["agregar lead", "prospecto nuevo"], seccion: "leads" },
  { href: "/empresa/ventas", titulo: "Embudo de ventas", leyenda: "Oportunidades por etapa, con valor y fecha de cierre.", sinonimos: ["pipeline", "oportunidades", "ventas", "negocios"], seccion: "ventas" },
  { href: "/empresa/campanas", titulo: "Campañas", leyenda: "Correos a varios clientes o leads a la vez.", sinonimos: ["newsletter", "correo masivo", "boletin", "email marketing"], seccion: "campanas" },
  { href: "/empresa/reportes", titulo: "Reportes", leyenda: "Ventas, cobros y clientes en números.", sinonimos: ["informes", "estadisticas", "metricas", "graficos"], seccion: "reportes" },
  { href: "/empresa/citas", titulo: "Citas", leyenda: "Citas que agendan los clientes y prospectos.", sinonimos: ["agenda", "calendario", "reservas", "booking"], seccion: "citas" },
  { href: "/empresa/cotizaciones", titulo: "Cotizaciones", leyenda: "Propuestas con precio enviadas a clientes.", sinonimos: ["presupuestos", "propuestas", "proforma"], seccion: "cotizaciones" },
  { href: "/empresa/cotizaciones/nueva", titulo: "Nueva cotización", leyenda: "Armar una propuesta con precio.", sinonimos: ["crear cotizacion", "presupuesto nuevo"], seccion: "cotizaciones", comun: true },
  { href: "/empresa/contratos", titulo: "Contratos", leyenda: "Contratos con clientes y su firma.", sinonimos: ["acuerdos", "firmas"], seccion: "contratos" },
  { href: "/empresa/proyectos", titulo: "Proyectos", leyenda: "Proyectos en curso con sus fases y avance.", sinonimos: ["trabajos", "obras", "desarrollos"], seccion: "proyectos" },
  { href: "/empresa/proyectos/nuevo", titulo: "Nuevo proyecto", leyenda: "Abrir un proyecto para un cliente.", sinonimos: ["crear proyecto"], seccion: "proyectos" },
  { href: "/empresa/tickets", titulo: "Tickets", leyenda: "Pedidos y fallas que reportan los clientes.", sinonimos: ["soporte", "incidencias", "pedidos", "bugs", "fallas"], seccion: "tickets" },
  { href: "/empresa/tickets/nuevo", titulo: "Nuevo ticket", leyenda: "Anotar un pedido o una falla de un cliente.", sinonimos: ["crear ticket", "reportar falla"], seccion: "tickets" },
  { href: "/empresa/sistemas", titulo: "Sistemas", leyenda: "Sistemas en producción y si están funcionando.", sinonimos: ["monitoreo", "plataformas", "sitios", "servidores"], seccion: "sistemas" },
  { href: "/empresa/bitacoras", titulo: "Bitácoras", leyenda: "Registro de trabajo entregado a los clientes.", sinonimos: ["registro", "diario", "informe de trabajo"], seccion: "bitacoras" },
  { href: "/empresa/dinero", titulo: "Dinero", leyenda: "Entradas, salidas y lo que falta cobrar.", sinonimos: ["finanzas", "caja", "ingresos", "gastos", "contabilidad"], seccion: "dinero" },
  { href: "/empresa/facturas", titulo: "Facturas", leyenda: "Facturas emitidas y su estado de pago.", sinonimos: ["cobros", "invoices", "facturacion"], seccion: "facturas" },
  { href: "/empresa/facturas/nueva", titulo: "Nueva factura", leyenda: "Emitir una factura a un cliente.", sinonimos: ["facturar", "crear factura", "cobrar"], seccion: "facturas", comun: true },
  { href: "/empresa/cuentas-por-cobrar", titulo: "Cuentas por cobrar", leyenda: "Quién debe y desde cuándo.", sinonimos: ["deudas", "morosos", "pendiente de pago", "saldos"], seccion: "cobros" },
  { href: "/empresa/por-pagar", titulo: "Por pagar", leyenda: "Pagos que la empresa tiene que hacer.", sinonimos: ["proveedores", "deudas propias"], seccion: "cobros" },
  { href: "/empresa/correos/hub", titulo: "Correos", leyenda: "La bandeja de correo de la empresa.", sinonimos: ["email", "bandeja", "mail", "inbox"], seccion: "correos" },
  { href: "/empresa/configuracion", titulo: "Configuración", leyenda: "Tu cuenta, apariencia, huella y dispositivos.", sinonimos: ["ajustes", "preferencias", "perfil", "cuenta"], seccion: "configuracion" },
];

/** Las pantallas que coinciden con la búsqueda y que el área del miembro puede abrir. */
export function buscarPantallas(q: string, area: string | null | undefined, lista: Pantalla[] = PANTALLAS): Resultado[] {
  return lista
    .filter((p) => puedeVer(area, p.seccion))
    .map((p) => ({ tipo: "pantalla" as const, id: p.href, titulo: p.titulo, detalle: p.leyenda, href: p.href, puntaje: puntaje(q, p.titulo, ...p.sinonimos, p.leyenda) }))
    .filter((r) => r.puntaje > 0);
}

/** Accesos comunes al abrir el buscador sin texto. */
export function accesosComunes(area: string | null | undefined): Pantalla[] {
  return PANTALLAS.filter((p) => p.comun && puedeVer(area, p.seccion));
}

// ─── Recientes (los guarda el navegador) ─────────────────────────────────────

export type Reciente = { tipo: TipoResultado; titulo: string; href: string; detalle?: string | null };

/** Pone el último elegido arriba, sin repetidos, con tope. */
export function agregarReciente(lista: Reciente[], r: Reciente, tope = 6): Reciente[] {
  return [r, ...lista.filter((x) => x.href !== r.href)].slice(0, tope);
}
