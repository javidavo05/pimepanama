import type { Locale } from "@/lib/i18n";
import { copyEn } from "./copy-en";
import { shots, type Shot } from "./shots";

/**
 * Captura para una ruta. Si la ruta no tiene la suya, cae a la primera
 * captura real del proyecto: la ventana siempre muestra el sitio, nunca
 * una pantalla dibujada.
 */
export function shotFor(p: { shots: Record<string, Shot>; routes: ProjectRoute[] }, path: string): Shot | undefined {
  if (p.shots[path]) return p.shots[path];
  if (p.shots["/"]) return p.shots["/"];
  const first = p.routes.find((r) => p.shots[r.path]);
  return first ? p.shots[first.path] : Object.values(p.shots)[0];
}
import type {
  MetricSpec,
  Project,
  ProjectCategory,
  ProjectRoute,
  ProjectStatus,
  RouteGroup,
} from "./types";
import { CATEGORY_LABEL, ROUTE_GROUP_LABEL, STATUS_LABEL } from "./types";

/**
 * Niveles de complejidad. Cada proyecto del catálogo cae en uno, y la UI los
 * usa para mostrar que el trabajo va desde un sitio de una página hasta
 * sistemas distribuidos con hardware en la calle.
 */
export type ComplexityTier = 1 | 2 | 3 | 4 | 5;

export const COMPLEXITY: Record<string, ComplexityTier> = {
  academyx: 5, "uapa-suite": 5, visita7: 4, "smart-church": 3, "wedding-site": 3, godmode: 4, cifrapp: 4, misaza: 4, "bnb-real-estate": 3, "john-henry": 3,
};

const COMPLEXITY_LABEL: Record<ComplexityTier, { es: string; en: string }> = {
  1: { es: "Sitio o pieza", en: "Site or piece" },
  2: { es: "App con lógica", en: "App with logic" },
  3: { es: "Sistema con backend", en: "System with backend" },
  4: { es: "Plataforma multi-tenant", en: "Multi-tenant platform" },
  5: { es: "Sistema distribuido", en: "Distributed system" },
};

const COMPLEXITY_HINT: Record<ComplexityTier, { es: string; en: string }> = {
  1: { es: "Una página o un componente: sin base de datos.", en: "One page or one component: no database." },
  2: { es: "Estado, reglas y cálculo, con o sin backend.", en: "State, rules and computation, with or without a backend." },
  3: { es: "Base de datos, autenticación, panel y correo.", en: "Database, authentication, panel and email." },
  4: { es: "Varios clientes aislados sobre la misma base, con pagos.", en: "Several isolated tenants on one base, with payments." },
  5: { es: "Hardware, agentes locales, tiempo real o pagos en la calle.", en: "Hardware, local agents, real time or field payments." },
};

const CATEGORY_LABEL_EN: Record<ProjectCategory, string> = {
  saas: "SaaS", plataforma: "Platform", ecommerce: "E-commerce", sitio: "Website",
  herramienta: "Tool", juego: "Game", legacy: "Apps Script", propuesta: "Proposal",
};

const STATUS_LABEL_EN: Record<ProjectStatus, string> = {
  produccion: "In production", beta: "Beta", prototipo: "Prototype", construccion: "In progress",
  legacy: "Legacy", propuesta: "Proposal", interno: "Internal use",
};

const ROUTE_GROUP_LABEL_EN: Record<RouteGroup, string> = {
  publico: "Public", panel: "Panel", operacion: "Operations", api: "API", movil: "Mobile",
};

export type LocalizedProject = Omit<Project, "routes" | "metrics"> & {
  routes: ProjectRoute[];
  metrics: MetricSpec[];
  /** Capturas reales por ruta; vacío cuando el sistema no tiene sitio público. */
  shots: Record<string, Shot>;
  complexity: ComplexityTier;
  complexityLabel: string;
  complexityHint: string;
  categoryLabel: string;
  statusLabel: string;
  /** Base de la URL de detalle según idioma. */
  href: string;
};

export function localizeProject(project: Project, locale: Locale): LocalizedProject {
  const tier = COMPLEXITY[project.slug] ?? 3;
  const base = locale === "en" ? "/en/portfolio" : "/portfolio";
  const en = locale === "en" ? copyEn[project.slug] : undefined;

  return {
    ...project,
    client: en && "client" in en ? en.client ?? null : project.client,
    industry: en?.industry ?? project.industry,
    tagline: en?.tagline ?? project.tagline,
    description: en?.description ?? project.description,
    features: en?.features ?? project.features,
    routes: project.routes.map((r) => ({ ...r, label: en?.routes[r.path] ?? r.label })),
    metrics: project.metrics.map((m) => ({ ...m, ...(en?.metrics[m.key] ?? {}) })),
    shots: shots[project.slug] ?? {},
    complexity: tier,
    complexityLabel: COMPLEXITY_LABEL[tier][locale],
    complexityHint: COMPLEXITY_HINT[tier][locale],
    categoryLabel: locale === "en" ? CATEGORY_LABEL_EN[project.category] : CATEGORY_LABEL[project.category],
    statusLabel: locale === "en" ? STATUS_LABEL_EN[project.status] : STATUS_LABEL[project.status],
    href: `${base}/${project.slug}`,
  };
}

export function categoryLabel(category: ProjectCategory, locale: Locale): string {
  return locale === "en" ? CATEGORY_LABEL_EN[category] : CATEGORY_LABEL[category];
}

export function statusLabel(status: ProjectStatus, locale: Locale): string {
  return locale === "en" ? STATUS_LABEL_EN[status] : STATUS_LABEL[status];
}

export function routeGroupLabel(group: RouteGroup, locale: Locale): string {
  return locale === "en" ? ROUTE_GROUP_LABEL_EN[group] : ROUTE_GROUP_LABEL[group];
}

export function complexityLabel(tier: ComplexityTier, locale: Locale): string {
  return COMPLEXITY_LABEL[tier][locale];
}

export function complexityHint(tier: ComplexityTier, locale: Locale): string {
  return COMPLEXITY_HINT[tier][locale];
}
