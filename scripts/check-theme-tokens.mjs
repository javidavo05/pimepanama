#!/usr/bin/env node
/**
 * Detecta colores ciegos al tema dentro del scope `.empresa-app`.
 *
 * La suite interna soporta claro/oscuro vía tokens semánticos (ver "Sistema de
 * color" en src/app/globals.css). Cualquier clase de color fija — paleta
 * Tailwind numerada, hex arbitrario, blanco/negro literal — no sigue al tema y
 * se ve mal en al menos uno de los dos.
 *
 * Excepción legítima: `theme-ok: <motivo>`. Cubre desde el comentario hasta la
 * siguiente línea en blanco, así que una sola nota vale para todo un bloque
 * contiguo (un objeto de colores, una paleta) y no hay que repetirla por línea.
 * El motivo es obligatorio; sin él la excepción no cuenta. Vive junto al código
 * para que se revise cuando ese código cambie.
 *
 *   node scripts/check-theme-tokens.mjs            # scope por defecto
 *   node scripts/check-theme-tokens.mjs --json     # salida cruda
 *   node scripts/check-theme-tokens.mjs <rutas...> # scope explícito
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// `src/lib` entra al alcance porque también produce clases de Tailwind: los
// mapas de color por estado viven ahí y se escaparon de la primera migración.
const DEFAULT_ROOTS = [
  "src/app/(empresa)",
  "src/components/empresa",
  "src/components/pimesign",
  "src/components/ui",
  "src/lib",
];

// Por debajo de esto el escaneo no es representativo: es un oráculo roto, no un
// aprobado. Sube si el scope crece; nunca lo bajes para que "pase".
const MIN_FILES = 50;

// Fuera de alcance a propósito: PDF y correo no son la UI temada. Se imprimen o
// se envían sobre papel/fondo blanco fijo, así que ahí un color literal es la
// respuesta correcta, no un desvío.
const EXCLUDE = [
  "src/lib/pdf",
  "src/lib/design-system",
  "src/lib/email-templates.ts",
];
const isExcluded = (p) => EXCLUDE.some((e) => p === e || p.startsWith(e + "/"));

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const roots = args.filter((a) => !a.startsWith("--"));
const ROOTS = roots.length ? roots : DEFAULT_ROOTS;

const PATTERNS = [
  [/\btext-white\b(?!\/)/g, "text-white"],
  [/\btext-white\/\d+/g, "text-white/N"],
  [/\btext-black\b/g, "text-black"],
  [/\bbg-white\b(?!\/)/g, "bg-white"],
  [/\bbg-white\/\d+/g, "bg-white/N"],
  [/\bbg-black\b(?!\/)/g, "bg-black"],
  [/\bbg-black\/\d+/g, "bg-black/N"],
  [/\bborder-white\/?\[?[\d.]*\]?/g, "border-white"],
  [/\bborder-black\/?\[?[\d.]*\]?/g, "border-black"],
  [/\bdivide-white\/?\d*/g, "divide-white"],
  [/\bring-white\/?\d*/g, "ring-white"],
  [
    /\b(?:bg|text|border|from|via|to|ring|shadow|fill|stroke|divide|outline|decoration|accent|caret)-\[#[0-9a-fA-F]{3,8}\]/g,
    "hex-arbitrario",
  ],
  [/\b(?:bg|text|border|from|via|to|ring)-\[rgba?\([^\]]*\)\]/g, "rgb-arbitrario"],
  [
    /\b(?:bg|text|border|from|via|to|ring|divide|placeholder)-(?:slate|gray|zinc|neutral|stone)-\d{2,3}(?:\/(?:\d+|\[[^\]]+\]))?/g,
    "gris-fijo",
  ],
  [
    /\b(?:bg|text|border|from|via|to|ring|divide|placeholder|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/(?:\d+|\[[^\]]+\]))?/g,
    "color-fijo",
  ],
  // Colores que no pasan por Tailwind: props de gráficos, estilos en línea,
  // atributos SVG. Fue el punto ciego que dejó el gráfico de ingresos en blanco
  // fijo, invisible en tema claro.
  [/["'`]#[0-9a-fA-F]{3,8}["'`]/g, "hex-en-literal"],
  [/rgba?\(\s*\d+\s*[,\s]\s*\d+\s*[,\s]\s*\d+/g, "rgb-en-literal"],
];

// Excepción sólo si trae motivo: `theme-ok: renderiza HTML de terceros`.

const EXEMPT = /theme-ok:\s*\S/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && !isExcluded(p)) walk(p, out);
    } else if (/\.tsx?$/.test(entry.name) && !isExcluded(p)) {
      out.push(p);
    }
  }
  return out;
}

const findings = [];
let scanned = 0;

for (const root of ROOTS) {
  let files;
  try {
    files = statSync(root).isDirectory() ? walk(root) : [root];
  } catch {
    console.error(`ERROR: raíz ilegible -> ${root}`);
    process.exit(2);
  }
  scanned += files.length;
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    // Marca de una pasada qué líneas quedan cubiertas por una excepción.
    const exempt = new Array(lines.length).fill(false);
    for (let i = 0; i < lines.length; i++) {
      if (!EXEMPT.test(lines[i])) continue;
      exempt[i] = true;
      for (let j = i + 1; j < lines.length && lines[j].trim() !== ""; j++) exempt[j] = true;
    }
    lines.forEach((line, i) => {
        if (exempt[i]) return;
        for (const [re, kind] of PATTERNS) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(line))) {
            findings.push({ file, line: i + 1, kind, match: m[0] });
          }
        }
    });
  }
}

if (scanned < MIN_FILES) {
  console.error(
    `ERROR: sólo ${scanned} archivo(s) escaneado(s); se esperaban >= ${MIN_FILES}. El scope está mal.`,
  );
  process.exit(2);
}

if (JSON_OUT) {
  console.log(JSON.stringify(findings, null, 2));
  process.exit(findings.length === 0 ? 0 : 1);
}

const byFile = new Map();
for (const f of findings) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);
for (const [file, n] of [...byFile].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(n).padStart(4)}  ${file}`);
}
for (const f of findings.slice(0, 0)) void f;

console.log("─".repeat(60));
console.log(`ARCHIVOS_ESCANEADOS ${scanned}`);
console.log(`TOTAL_ARCHIVOS      ${byFile.size}`);
console.log(`TOTAL_HALLAZGOS     ${findings.length}`);
if (findings.length === 0) console.log("THEME_SCAN_CLEAN");
process.exit(findings.length === 0 ? 0 : 1);
