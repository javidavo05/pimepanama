#!/usr/bin/env node
/**
 * Bootstrap Supabase Postgres for pimepanama (admin CMS + /api/test-db).
 *
 * Requires DATABASE_URL + DIRECT_URL in .env.local, or:
 *   SUPABASE_DB_PASSWORD=your-db-password
 *
 * Usage:
 *   npm run db:setup-supabase
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const { buildSupabaseDatabaseUrls } = require("./supabase-urls.cjs");

const root = path.join(__dirname, "..");
const envLocalPath = path.join(root, ".env.local");

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

function run(cmd, args, extraEnv = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(envLocalPath);

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (password && (!process.env.DATABASE_URL || !process.env.DIRECT_URL)) {
    const urls = buildSupabaseDatabaseUrls(password, {
      poolerHost: process.env.SUPABASE_POOLER_HOST,
    });
    process.env.DATABASE_URL = process.env.DATABASE_URL || urls.DATABASE_URL;
    process.env.DIRECT_URL = process.env.DIRECT_URL || urls.DIRECT_URL;
    console.log("[setup] Built DATABASE_URL / DIRECT_URL from SUPABASE_DB_PASSWORD");
  }

  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    console.error(
      "\nMissing DATABASE_URL or DIRECT_URL.\n\n" +
        "Add to .env.local (from Supabase → Settings → Database → Connection string):\n" +
        '  DATABASE_URL="postgresql://postgres.[ref]:[password]@....pooler.supabase.com:6543/postgres?pgbouncer=true"\n' +
        '  DIRECT_URL="postgresql://postgres.[ref]:[password]@....pooler.supabase.com:5432/postgres"\n\n' +
        "Or set SUPABASE_DB_PASSWORD=... and re-run.\n"
    );
    process.exit(1);
  }

  console.log("\n[1/4] prisma generate");
  run("npx", ["prisma", "generate"]);

  console.log("\n[2/4] prisma migrate deploy");
  run("npx", ["prisma", "migrate", "deploy"]);

  console.log("\n[3/4] seed admin user");
  run("npx", ["tsx", "prisma/seed-admin.ts"]);

  console.log("\n[4/4] seed CMS content (software-focused, matches static landing)");
  run("npx", ["tsx", "prisma/update-landing-content.ts"]);

  console.log("\n✓ Supabase database ready.");
  console.log("  Test: curl https://pimepanama.com/api/test-db");
  console.log("  Admin: https://pimepanama.com/admin/login\n");
}

main();
