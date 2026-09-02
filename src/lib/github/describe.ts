import type { RepoSnapshot } from "./snapshot";

/**
 * El snapshot convertido en texto para el prompt.
 *
 * No se vuelca el árbol crudo: 900 rutas son nueve mil tokens en cada llamada de
 * cada etapa, y la mayoría son ruido. Se resume por áreas y se listan enteras
 * solo las cosas que el modelo necesita nombrar con precisión — las pantallas,
 * los endpoints, los modelos de datos y los módulos de `lib`. Eso es lo que
 * convierte «localizar el módulo que maneja X» en «src/lib/x.ts».
 */

/** Cuántas rutas se listan por área antes de resumir el resto. */
const PER_AREA = 60;
const MAX_DEPS = 60;
const MAX_COMMITS = 10;

function bullets(items: string[], limit = PER_AREA): string {
  if (items.length === 0) return "  (ninguno)";
  const shown = items.slice(0, limit).map((i) => `  - ${i}`);
  if (items.length > limit) shown.push(`  …y ${items.length - limit} más`);
  return shown.join("\n");
}

/** Cuenta archivos por carpeta de primer y segundo nivel. */
function areaCounts(tree: string[]): string[] {
  const counts = new Map<string, number>();
  for (const path of tree) {
    const parts = path.split("/");
    const key = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([dir, n]) => `${dir} (${n} archivos)`);
}

/** Archivos bajo una carpeta, la tenga el proyecto en la raíz o dentro de `src/`. */
function modulesUnder(tree: string[], dir: string): string[] {
  return tree.flatMap((p) => {
    for (const prefix of [`src/${dir}/`, `${dir}/`]) {
      if (p.startsWith(prefix)) return [p.slice(prefix.length)];
    }
    return [];
  });
}

export function describeRepo(snapshot: RepoSnapshot): string {
  const lines: string[] = [
    `## Código actual del proyecto — ${snapshot.owner}/${snapshot.repo} (rama ${snapshot.branch})`,
    "",
    "Esto es lo que EXISTE hoy en el repositorio. Úsalo para no proponer construir algo que ya está hecho, para nombrar archivos y rutas reales en vez de inventarlos, y para que el consejo encaje con la arquitectura que ya tiene el sistema.",
  ];

  if (snapshot.description) lines.push(`\nDescripción del repo: ${snapshot.description}`);
  if (snapshot.language) lines.push(`Lenguaje principal: ${snapshot.language}`);
  lines.push(`Archivos de código: ${snapshot.totalFiles}`);
  if (snapshot.fetchedAt) {
    lines.push(`Snapshot tomado: ${snapshot.fetchedAt.slice(0, 10)}`);
  }

  lines.push("\n### Estructura", bullets(areaCounts(snapshot.tree), 30));

  if (snapshot.dataModels.length > 0) {
    lines.push(
      "\n### Modelo de datos (Prisma)",
      "Estas son las tablas y enums que ya existen. Si algo hace falta y no está aquí, hay que crearlo con una migración.",
      bullets(snapshot.dataModels, 120)
    );
  }

  // La URL y el archivo van juntos: con solo la URL el modelo inventa la ruta
  // del archivo concatenando "src/app/" y falla en cuanto hay grupos de rutas.
  const route = (r: { url: string; path: string }) =>
    r.path ? `${r.url}  →  ${r.path}` : r.url;

  if (snapshot.pages.length > 0) {
    lines.push(
      "\n### Pantallas que ya existen (URL → archivo que la implementa)",
      bullets(snapshot.pages.map(route), 80)
    );
  }
  if (snapshot.apiRoutes.length > 0) {
    lines.push(
      "\n### Endpoints que ya existen (URL → archivo que lo implementa)",
      bullets(snapshot.apiRoutes.map(route), 100)
    );
  }

  const libs = modulesUnder(snapshot.tree, "lib");
  if (libs.length > 0) {
    lines.push("\n### Lógica de negocio (lib)", bullets(libs, 80));
  }

  const components = modulesUnder(snapshot.tree, "components");
  if (components.length > 0) {
    lines.push("\n### Componentes reutilizables", bullets(components, 60));
  }

  if (snapshot.dependencies.length > 0) {
    lines.push(
      "\n### Dependencias en producción",
      `  ${snapshot.dependencies.slice(0, MAX_DEPS).join(", ")}${
        snapshot.dependencies.length > MAX_DEPS ? ", …" : ""
      }`
    );
  }

  const scripts = Object.entries(snapshot.scripts);
  if (scripts.length > 0) {
    lines.push(
      "\n### Comandos del proyecto",
      bullets(scripts.map(([k, v]) => `npm run ${k} → ${v}`), 25)
    );
  }

  if (snapshot.commits.length > 0) {
    lines.push(
      "\n### Últimos cambios",
      "Por dónde va el trabajo ahora mismo; sirve para no chocar con algo que se está tocando.",
      bullets(
        snapshot.commits.slice(0, MAX_COMMITS).map((c) => `${c.date.slice(0, 10)} — ${c.message}`),
        MAX_COMMITS
      )
    );
  }

  for (const doc of snapshot.docs) {
    lines.push(
      `\n### ${doc.path} — reglas y convenciones del proyecto`,
      "Estas reglas mandan sobre cualquier recomendación genérica. Si dicen cómo se hacen las migraciones o cómo se despliega, se hace así.",
      doc.excerpt
    );
  }

  if (snapshot.treeTruncated) {
    lines.push(
      "\nNOTA: el repositorio es grande y el mapa está recortado. Si necesitas un archivo que no aparece, dilo como instrucción de localizarlo en vez de asumir que no existe."
    );
  }

  return lines.join("\n");
}

/** Una línea para la UI: de qué repo se está leyendo y desde cuándo. */
export function describeRepoShort(snapshot: RepoSnapshot): string {
  const when = snapshot.fetchedAt ? ` · leído ${snapshot.fetchedAt.slice(0, 10)}` : "";
  return `${snapshot.owner}/${snapshot.repo}@${snapshot.branch} · ${snapshot.totalFiles} archivos${when}`;
}
