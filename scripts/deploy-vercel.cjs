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
run("npx", ["vercel", "deploy", "--prod", "--scope", SCOPE, "--yes", "--force"], "deploy");
