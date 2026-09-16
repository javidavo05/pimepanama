import { productProjects } from "./catalog-products";
import { siteProjects } from "./catalog-sites";
import type { Project, ProjectCategory, ProjectStatus } from "./types";

export * from "./types";

/** Catálogo completo, en el orden en que se muestra. */
export const projects: Project[] = [...productProjects, ...siteProjects];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured);
}

export const PRODUCTION_STATUSES: ProjectStatus[] = ["produccion", "interno"];

/** Conteos derivados del catálogo: la única fuente de las cifras del hero. */
export function getCatalogStats() {
  const live = projects.filter((p) => p.liveUrl).length;
  const inProduction = projects.filter((p) => PRODUCTION_STATUSES.includes(p.status)).length;
  const stacks = new Set(projects.flatMap((p) => p.stack));
  const industries = new Set(projects.map((p) => p.industry));
  const routes = projects.reduce((n, p) => n + p.routes.length, 0);
  const years = projects.flatMap((p) => p.years).filter((y): y is number => typeof y === "number");
  return {
    total: projects.length,
    live,
    inProduction,
    stacks: stacks.size,
    industries: industries.size,
    routes,
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
  };
}

export function countByCategory(): Record<ProjectCategory, number> {
  return projects.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<ProjectCategory, number>,
  );
}

/** Tecnologías más usadas en el catálogo, para la gráfica de stack. */
export function topStack(limit = 8): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of projects) {
    for (const raw of p.stack) {
      const name = raw.replace(/\s\d+(\.\d+)?$/, "").replace(/ v\d+$/, "");
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Proyectos arrancados por año, para la gráfica de línea de tiempo. */
export function projectsByYear(): { year: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const p of projects) counts.set(p.years[0], (counts.get(p.years[0]) ?? 0) + 1);
  return [...counts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);
}
