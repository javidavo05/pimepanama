const { spawnSync } = require("child_process");
const path = require("path");

const SCOPE = "javier-vallejos-projects";

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

run("node", [path.join("scripts", "verify-vercel-project.cjs")], "verify");
run("npm", ["run", "build"], "build");
// Sin --force: con --force Vercel descarta la caché de build y compila todo desde cero en cada deploy.
// No se usa `vercel build` + `--prebuilt`: el build local en macOS deja el motor de Prisma de darwin (schema.prisma
// no declara binaryTargets para Linux) y la función fallaría en Vercel. El build local de arriba solo valida.
// Ojo: el proyecto también despliega con cada push a main; no correr este script además de un push.
run("npx", ["vercel", "deploy", "--prod", "--scope", SCOPE, "--yes"], "deploy");
