const fs = require("fs");
const path = require("path");

const EXPECTED = {
  projectId: "prj_m8QWgvneB5dDJ9iHLUUQ9VngWlyS",
  orgId: "team_8rQXYfiDNYmZSPJA4RIYaOEW",
  projectName: "pimepanama-wt62",
  scope: "javier-vallejos-projects",
};

const projectFile = path.join(process.cwd(), ".vercel", "project.json");

function fail(message) {
  console.error(`\n[vercel] ${message}`);
  console.error(
    "\nPara enlazar el proyecto correcto:\n" +
      `  npx vercel link --project ${EXPECTED.projectName} --scope ${EXPECTED.scope} --yes\n`,
  );
  process.exit(1);
}

if (!fs.existsSync(projectFile)) {
  fail("No existe .vercel/project.json. No se puede desplegar sin proyecto enlazado.");
}

let config;
try {
  config = JSON.parse(fs.readFileSync(projectFile, "utf8"));
} catch {
  fail(".vercel/project.json no es JSON válido.");
}

if (config.projectId !== EXPECTED.projectId) {
  fail(
    `projectId incorrecto: ${config.projectId ?? "(vacío)"}\n` +
      `  Esperado: ${EXPECTED.projectId} (${EXPECTED.projectName})`,
  );
}

if (config.orgId !== EXPECTED.orgId) {
  fail(
    `orgId incorrecto: ${config.orgId ?? "(vacío)"}\n` + `  Esperado: ${EXPECTED.orgId} (${EXPECTED.scope})`,
  );
}

console.log(`[vercel] Proyecto validado: ${EXPECTED.scope}/${EXPECTED.projectName} (${EXPECTED.projectId})`);
