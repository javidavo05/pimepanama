/**
 * Áreas del equipo y qué secciones ve cada una (fase 0 del plan CRM, 2026-10-16). Reglas puras, sin base de datos.
 * El dueño ve todo. Los datos son siempre los de la empresa; el área solo decide qué pantallas se abren.
 * El correo y los datos de la empresa (marca, cobros, tarifas, equipo) son del dueño. La configuración personal
 * (apariencia, huella, dispositivos) la tiene cada miembro.
 */
export const AREAS = ["dueno", "ventas", "proyectos", "finanzas"] as const;
export type Area = (typeof AREAS)[number];

export const AREA_LABEL: Record<Area, string> = { dueno: "Dueño", ventas: "Ventas", proyectos: "Proyectos", finanzas: "Finanzas" };
export const AREA_DETALLE: Record<Area, string> = {
  dueno: "Todo, incluidos el correo, la configuración y el equipo.",
  ventas: "Clientes, embudo de ventas, leads, citas, reuniones, cotizaciones, contratos, campañas, reportes y tareas.",
  proyectos: "Clientes, proyectos, tickets, sistemas, reuniones, bitácoras y tareas.",
  finanzas: "Clientes, dinero, facturas, cobros, cotizaciones, contratos, reportes y tareas.",
};

export type Seccion =
  | "inicio" | "clientes" | "tareas" | "reuniones"
  | "leads" | "citas" | "cotizaciones" | "contratos"
  | "proyectos" | "tickets" | "sistemas" | "bitacoras"
  | "dinero" | "facturas" | "cobros"
  | "correos" | "configuracion" | "empresa"
  | "ventas" | "campanas" | "reportes";

const TODAS: Seccion[] = ["inicio", "clientes", "tareas", "reuniones", "configuracion"];
const POR_AREA: Record<Exclude<Area, "dueno">, Seccion[]> = {
  ventas: [...TODAS, "leads", "citas", "cotizaciones", "contratos", "ventas", "campanas", "reportes"],
  proyectos: [...TODAS, "proyectos", "tickets", "sistemas", "bitacoras"],
  finanzas: [...TODAS, "dinero", "facturas", "cobros", "cotizaciones", "contratos", "reportes"],
};

export function areaValida(v: unknown): v is Area {
  return typeof v === "string" && (AREAS as readonly string[]).includes(v);
}

export function puedeVer(area: string | null | undefined, seccion: Seccion): boolean {
  if (!areaValida(area) || area === "dueno") return area === "dueno" || !area;
  return POR_AREA[area].includes(seccion);
}

/** Sección de una ruta de /empresa, para el menú y la puerta de cada sección. */
export function seccionDeRuta(path: string): Seccion {
  const p = path.replace(/^\/empresa\/?/, "").split("/")[0] ?? "";
  const mapa: Record<string, Seccion> = {
    "": "inicio", clientes: "clientes", tareas: "tareas", reuniones: "reuniones", leads: "leads", citas: "citas",
    cotizaciones: "cotizaciones", contratos: "contratos", proyectos: "proyectos", tickets: "tickets",
    sistemas: "sistemas", platforms: "sistemas", bitacoras: "bitacoras", dinero: "dinero", facturas: "facturas",
    "cuentas-por-cobrar": "cobros", "por-pagar": "cobros", correos: "correos", configuracion: "configuracion",
    ventas: "ventas", campanas: "campanas", reportes: "reportes",
  };
  return mapa[p] ?? "inicio";
}
