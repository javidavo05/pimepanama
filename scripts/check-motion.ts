/**
 * Puerta de movimiento. Recorre src/components y falla si un componente de sección
 * o interactivo no declara data-motion="<nombre>".
 *
 * Sección: archivo bajo src/components/sections/ o que renderiza <section, <header, <footer, <nav o <main.
 * Interactivo: renderiza <button, <a, <Link, <input, <select, <textarea, <form, o maneja onClick/onPointer.
 * Un archivo puede eximirse solo con el comentario `// motion: none — <motivo>` en su primera línea
 * (p. ej. un primitivo puramente tipográfico). Las exenciones se listan en la salida.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src", "components");
const SECTION = /<(section|header|footer|nav|main)\b/;
const INTERACTIVE = /<(button|a|Link|input|select|textarea|form)\b|on(Click|Pointer\w*|KeyDown|Submit|Change)=/;
const MOTION = /data-motion=\{?["'`]([\w-]+)/;
const EXEMPT = /^\/\/ motion: none — .+/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(name) && !/\.(test|stories)\./.test(name)) out.push(p);
  }
  return out;
}

let files: string[] = [];
try { files = walk(ROOT); } catch { console.log("check-motion: no hay src/components todavía."); process.exit(0); }

const failures: string[] = [];
const exempt: string[] = [];
let checked = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const rel = relative(process.cwd(), f);
  const isSection = rel.includes("/sections/") || SECTION.test(src);
  const isInteractive = INTERACTIVE.test(src);
  if (!isSection && !isInteractive) continue;
  checked++;
  if (EXEMPT.test(src.split("\n")[0] ?? "")) { exempt.push(rel); continue; }
  if (!MOTION.test(src)) failures.push(`${rel} (${isSection ? "sección" : "interactivo"})`);
}

if (exempt.length) console.log("Exentos con motivo:\n  " + exempt.join("\n  "));
if (failures.length) {
  console.error(`check-motion: ${failures.length} componente(s) sin data-motion:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-motion OK: ${checked} componente(s) de sección o interactivos declaran data-motion.`);
