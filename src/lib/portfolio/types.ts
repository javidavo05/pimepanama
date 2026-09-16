/**
 * Motor de portfolio — tipos.
 *
 * Todo el catálogo vive en código (misma decisión "Opción B" que la landing):
 * no hay base de datos detrás. Cada proyecto describe qué es, qué rutas
 * expone y qué aspecto tiene su pantalla para que la ventana de preview
 * pueda dibujarlo sin capturas reales.
 */

/** Familia visual de la pantalla que se dibuja dentro de la ventana. */
export type ScreenKind =
  | "landing"
  | "dashboard"
  | "table"
  | "store"
  | "checkout"
  | "calendar"
  | "map"
  | "chat"
  | "game"
  | "sheet"
  | "terminal"
  | "docs"
  | "login"
  | "form";

export type ProjectCategory =
  | "saas"
  | "plataforma"
  | "ecommerce"
  | "sitio"
  | "herramienta"
  | "juego"
  | "legacy"
  | "propuesta";

export type ProjectStatus =
  | "produccion"
  | "beta"
  | "prototipo"
  | "construccion"
  | "legacy"
  | "propuesta"
  | "interno";

export type RouteGroup = "publico" | "panel" | "operacion" | "api" | "movil";

export type ProjectRoute = {
  /** Ruta tal como existe en el proyecto (`/dashboard/routes`). */
  path: string;
  /** Qué hay ahí, en dos o tres palabras. */
  label: string;
  group: RouteGroup;
  /** Qué familia de pantalla dibuja la ventana al pasar el cursor. */
  screen: ScreenKind;
};

export type MetricSpec = {
  key: string;
  label: string;
  /** Unidad corta que va al lado del número: "usuarios", "USD", "visitas". */
  unit: string;
  /** Escala aproximada del valor mensual, para que el mock sea creíble. */
  base: number;
  /** Tendencia mensual aproximada (0.04 = +4 % al mes). */
  growth: number;
  /** `area` para series continuas, `bars` para conteos por período. */
  form: "area" | "bars";
};

export type ProjectBrand = {
  /** Color dominante del producto real (botones, acento). */
  primary: string;
  /** Segundo color: oro, magenta, verde. */
  secondary: string;
  /** Fondo de la pantalla que se dibuja: claro u oscuro según el producto real. */
  surface: string;
  /** Tinta sobre `surface`. */
  ink: string;
  /** `dark` o `light`, decide el chrome de la ventana. */
  scheme: "dark" | "light";
};

export type Project = {
  slug: string;
  name: string;
  /** Cliente u organización. `null` cuando es producto propio o interno. */
  client: string | null;
  industry: string;
  tagline: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  /** Año de arranque y, si sigue vivo, el último año con trabajo. */
  years: [number, number?];
  stack: string[];
  features: string[];
  routes: ProjectRoute[];
  /** Sitio real, si está publicado. */
  liveUrl: string | null;
  /** Demo navegable dentro de pimepanama.com. */
  demoUrl: string | null;
  brand: ProjectBrand;
  /** Pantalla que se muestra por defecto en la ventana. */
  screen: ScreenKind;
  metrics: MetricSpec[];
  featured: boolean;
  /** Carpetas o variantes que se consolidaron en esta entrada. */
  variants?: string[];
};

export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  saas: "SaaS",
  plataforma: "Plataforma",
  ecommerce: "E-commerce",
  sitio: "Sitio web",
  herramienta: "Herramienta",
  juego: "Juego",
  legacy: "Apps Script",
  propuesta: "Propuesta",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  produccion: "En producción",
  beta: "Beta",
  prototipo: "Prototipo",
  construccion: "En construcción",
  legacy: "Legacy",
  propuesta: "Propuesta",
  interno: "Uso interno",
};

export const ROUTE_GROUP_LABEL: Record<RouteGroup, string> = {
  publico: "Público",
  panel: "Panel",
  operacion: "Operación",
  api: "API",
  movil: "Móvil",
};
