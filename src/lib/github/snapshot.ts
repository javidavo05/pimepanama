import { getCommits, getFile, getRepo, getTree, type CommitSummary } from "./client";

/**
 * El mapa del repositorio: lo que hace falta saber para aconsejar sobre un
 * sistema que ya existe en vez de sobre uno imaginario.
 *
 * No es el código. Es dónde vive cada cosa, con qué está construido y qué se
 * tocó últimamente — suficiente para que la IA diga «el módulo de facturación
 * está en src/app/(empresa)/.../facturas» en vez de «localizar el módulo que
 * maneja facturas». Se toma en una pasada y se guarda; leer el contenido de
 * cada archivo costaría decenas de llamadas por reunión y no cambia el consejo.
 */

/**
 * Una ruta del App Router y el archivo que la implementa.
 *
 * Van juntas a propósito. Dándole solo la URL, el modelo se inventa el archivo
 * pegando "src/app/" + la URL, y en un proyecto con grupos de rutas —(empresa),
 * (protected)— eso nunca coincide con la ruta real.
 */
export interface RouteEntry {
  url: string;
  path: string;
}

export interface RepoSnapshot {
  owner: string;
  repo: string;
  branch: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  fetchedAt: string;
  /** Rutas del repo, sin ruido (dependencias, artefactos de build, binarios) */
  tree: string[];
  /** `true` si GitHub cortó el árbol por tamaño */
  treeTruncated: boolean;
  totalFiles: number;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  /** Modelos y enums de Prisma: el modelo de datos real del sistema */
  dataModels: string[];
  /** Rutas navegables y endpoints, con el archivo real que las implementa */
  pages: RouteEntry[];
  apiRoutes: RouteEntry[];
  /** README, CLAUDE.md y demás: las reglas y convenciones del proyecto */
  docs: { path: string; excerpt: string }[];
  commits: CommitSummary[];
}

/** Carpetas que no dicen nada del sistema y llenarían el árbol de ruido. */
const IGNORED = [
  "node_modules/",
  ".next/",
  ".git/",
  "dist/",
  "build/",
  "coverage/",
  ".turbo/",
  "vendor/",
  "public/",
  ".vercel/",
];

const IGNORED_EXTENSIONS =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|mp3|wav|pdf|zip|lock|map)$/i;

/** Archivos que sí se leen enteros: describen el proyecto y sus reglas. */
const DOC_FILES = [
  "CLAUDE.md",
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "docs/ARCHITECTURE.md",
];

/** Un doc largo se recorta: interesa el encuadre, no el manual entero. */
const DOC_CHARS = 6_000;
/** Tope de rutas en el mapa. Un repo enorme no cabe entero en el prompt. */
const MAX_TREE = 900;

function keepPath(path: string): boolean {
  if (IGNORED.some((prefix) => path.startsWith(prefix) || path.includes(`/${prefix}`))) return false;
  if (IGNORED_EXTENSIONS.test(path)) return false;
  return true;
}

/**
 * Ordena para que, si hay que recortar, sobrevivan las rutas que más dicen del
 * sistema: primero el código fuente y el esquema, al final la configuración.
 */
function relevance(path: string): number {
  // Se mide sobre la ruta sin `src/`, porque un proyecto puede tener el código
  // en la raíz y otro dentro de `src/` y ambos merecen la misma prioridad.
  const p = path.replace(/^src\//, "");
  if (p.startsWith("prisma/")) return 0;
  if (p.startsWith("app/")) return 1;
  if (p.startsWith("lib/")) return 2;
  if (p.startsWith("components/") || p.startsWith("server/") || p.startsWith("api/")) return 3;
  if (path.startsWith("src/")) return 4;
  if (p.startsWith("supabase/") || p.startsWith("migrations/")) return 5;
  if (p.startsWith("scripts/") || p.startsWith("tools/")) return 7;
  return 6;
}

function parsePackageJson(raw: string | null) {
  if (!raw) return { dependencies: [], devDependencies: [], scripts: {} };
  try {
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    return {
      dependencies: Object.keys(pkg.dependencies ?? {}).sort(),
      devDependencies: Object.keys(pkg.devDependencies ?? {}).sort(),
      scripts: pkg.scripts ?? {},
    };
  } catch {
    return { dependencies: [], devDependencies: [], scripts: {} };
  }
}

/** Nombres de modelos y enums del esquema de Prisma. */
function parsePrismaModels(raw: string | null): string[] {
  if (!raw) return [];
  return [...raw.matchAll(/^\s*(model|enum)\s+(\w+)\s*\{/gm)].map((m) => `${m[1]} ${m[2]}`);
}

/**
 * Convierte el árbol del App Router en rutas de verdad. Es lo que permite decir
 * "la pantalla de cotizaciones vive en /empresa/cotizaciones" sin adivinar.
 */
function derivePages(tree: string[]): { pages: RouteEntry[]; apiRoutes: RouteEntry[] } {
  const pages: RouteEntry[] = [];
  const apiRoutes: RouteEntry[] = [];

  for (const path of tree) {
    // El App Router vive en `app/` o en `src/app/` según el proyecto: anclar solo
    // a uno deja ciegas la mitad de las bases de código.
    const match = path.match(/^(?:src\/)?app\/(.+)\/(page|route)\.(tsx?|jsx?)$/);
    if (!match) continue;

    const url =
      "/" +
      match[1]
        // Los grupos de rutas — (empresa), (protected) — no aparecen en la URL.
        .replace(/\((?:[^)]+)\)\//g, "")
        .replace(/\/\((?:[^)]+)\)/g, "")
        .replace(/^\((?:[^)]+)\)$/, "");

    (match[2] === "route" ? apiRoutes : pages).push({ url, path });
  }

  const byUrl = (a: RouteEntry, b: RouteEntry) => a.url.localeCompare(b.url);
  return { pages: pages.sort(byUrl), apiRoutes: apiRoutes.sort(byUrl) };
}

export async function buildRepoSnapshot(
  owner: string,
  repo: string,
  token: string | null,
  branchOverride?: string | null
): Promise<RepoSnapshot> {
  const meta = await getRepo(owner, repo, token);
  const branch = branchOverride?.trim() || meta.default_branch;

  const treeData = await getTree(owner, repo, branch, token);
  const allFiles = treeData.tree.filter((n) => n.type === "blob").map((n) => n.path);
  const kept = allFiles.filter(keepPath);
  const tree = [...kept]
    .sort((a, b) => relevance(a) - relevance(b) || a.localeCompare(b))
    .slice(0, MAX_TREE)
    .sort();

  // Los manifiestos y los docs se piden en paralelo: son pocos y conocidos.
  const [packageRaw, prismaRaw, ...docsRaw] = await Promise.all([
    getFile(owner, repo, "package.json", branch, token),
    kept.includes("prisma/schema.prisma")
      ? getFile(owner, repo, "prisma/schema.prisma", branch, token)
      : Promise.resolve(null),
    ...DOC_FILES.map((path) =>
      kept.includes(path) ? getFile(owner, repo, path, branch, token) : Promise.resolve(null)
    ),
  ]);

  const commits = await getCommits(owner, repo, branch, token).catch(() => []);
  const { dependencies, devDependencies, scripts } = parsePackageJson(packageRaw);
  const { pages, apiRoutes } = derivePages(kept);

  const docs = DOC_FILES.flatMap((path, i) => {
    const raw = docsRaw[i];
    if (!raw?.trim()) return [];
    return [{ path, excerpt: raw.slice(0, DOC_CHARS) }];
  });

  return {
    owner,
    repo,
    branch,
    htmlUrl: meta.html_url,
    description: meta.description,
    language: meta.language,
    isPrivate: meta.private,
    fetchedAt: new Date().toISOString(),
    tree,
    treeTruncated: treeData.truncated || kept.length > MAX_TREE,
    totalFiles: kept.length,
    dependencies,
    devDependencies,
    scripts,
    dataModels: parsePrismaModels(prismaRaw),
    pages,
    apiRoutes,
    docs,
    commits,
  };
}

/** Reconstruye el snapshot guardado, tolerando filas viejas o a medias. */
export function parseRepoSnapshot(value: unknown): RepoSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Partial<RepoSnapshot>;
  if (!rec.owner || !rec.repo || !Array.isArray(rec.tree)) return null;
  return {
    owner: rec.owner,
    repo: rec.repo,
    branch: rec.branch ?? "main",
    htmlUrl: rec.htmlUrl ?? `https://github.com/${rec.owner}/${rec.repo}`,
    description: rec.description ?? null,
    language: rec.language ?? null,
    isPrivate: rec.isPrivate ?? false,
    fetchedAt: rec.fetchedAt ?? "",
    tree: rec.tree,
    treeTruncated: rec.treeTruncated ?? false,
    totalFiles: rec.totalFiles ?? rec.tree.length,
    dependencies: rec.dependencies ?? [],
    devDependencies: rec.devDependencies ?? [],
    scripts: rec.scripts ?? {},
    dataModels: rec.dataModels ?? [],
    pages: parseRoutes(rec.pages),
    apiRoutes: parseRoutes(rec.apiRoutes),
    docs: rec.docs ?? [],
    commits: rec.commits ?? [],
  };
}

/** Los snapshots anteriores guardaban solo la URL; se leen igual. */
function parseRoutes(value: unknown): RouteEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (typeof raw === "string") return [{ url: raw, path: "" }];
    if (!raw || typeof raw !== "object") return [];
    const rec = raw as Record<string, unknown>;
    return typeof rec.url === "string"
      ? [{ url: rec.url, path: typeof rec.path === "string" ? rec.path : "" }]
      : [];
  });
}
