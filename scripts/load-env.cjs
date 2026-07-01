const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadProjectEnv(root = path.join(__dirname, "..")) {
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const { buildSupabaseDatabaseUrls } = require("./supabase-urls.cjs");
  const password = process.env.SUPABASE_DB_PASSWORD;
  const dbUrl = process.env.DATABASE_URL ?? "";

  if (password && !dbUrl.startsWith("postgres")) {
    const urls = buildSupabaseDatabaseUrls(password);
    process.env.DATABASE_URL = urls.DATABASE_URL;
    process.env.DIRECT_URL = urls.DIRECT_URL;
  }
}

module.exports = { loadEnvFile, loadProjectEnv };
