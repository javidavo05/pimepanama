const { spawnSync } = require("child_process");
const path = require("path");

const SCOPE = "javier-vallejos-projects";
const EXPECTED_PROJECT = "prj_m8QWgvneB5dDJ9iHLUUQ9VngWlyS";
const EXPECTED_TEAM = "team_8rQXYfiDNYmZSPJA4RIYaOEW";

function run(command, args, label) {
  console.log(`\n> ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Evita el doble build: el proyecto está conectado a Git y cada push a main ya despliega producción.
// Si HEAD está limpio y ya está en origin/main, ese commit ya tiene (o va a tener) su deploy por Git.
// Forzar de todos modos: `npm run deploy:vercel -- --duplicar` (p. ej. un deploy por Git que falló).
function git(args) {
  const r = spawnSync("git", args, { cwd: process.cwd(), encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

async function gitDeployFor(sha) {
  const token = process.env.VERCEL_TOKEN;
  if (!token || typeof fetch !== "function") return null;
  const url =
    "https://api.vercel.com/v6/deployments?limit=10" +
    `&projectId=${EXPECTED_PROJECT}&teamId=${EXPECTED_TEAM}&sha=${sha}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const { deployments = [] } = await res.json();
    return deployments.find((d) => !["ERROR", "CANCELED"].includes(d.state)) ?? null;
  } catch {
    return null;
  }
}

async function guardDuplicate() {
  if (process.argv.includes("--duplicar")) {
    console.log("\n[deploy] --duplicar: se despliega aunque el commit ya esté en main.");
    return;
  }
  const head = git(["rev-parse", "HEAD"]);
  const dirty = git(["status", "--porcelain"]);
  if (!head || dirty === null || dirty !== "") return; // cambios sin commit: solo el CLI los puede subir
  git(["fetch", "--quiet", "origin", "main"]);
  const inMain = spawnSync("git", ["merge-base", "--is-ancestor", head, "origin/main"]).status === 0;
  if (!inMain) return; // commit que no está en main: Git no lo despliega a producción
  const existing = await gitDeployFor(head);
  const estado = existing ? ` (deploy ${existing.state}: https://${existing.url})` : "";
  console.error(
    `\n[deploy] ${head.slice(0, 7)} ya está en origin/main${estado}.\n` +
      "  El push a main ya lo despliega por Git; un deploy por CLI lo compilaría dos veces.\n" +
      "  Si de verdad hace falta (deploy por Git fallido, etc.): npm run deploy:vercel -- --duplicar\n",
  );
  process.exit(0);
}

async function main() {
  run("node", [path.join("scripts", "verify-vercel-project.cjs")], "verify");
  await guardDuplicate();
  run("npm", ["run", "build"], "build");
  // Sin --force: con --force Vercel descarta la caché de build y compila todo desde cero en cada deploy.
  // No se usa `vercel build` + `--prebuilt`: el build local en macOS deja el motor de Prisma de darwin (schema.prisma
  // no declara binaryTargets para Linux) y la función fallaría en Vercel. El build local de arriba solo valida.
  // El proyecto también despliega con cada push a main; guardDuplicate() evita repetirlo.
  run("npx", ["vercel", "deploy", "--prod", "--scope", SCOPE, "--yes"], "deploy");
}

main();
