#!/usr/bin/env node
/**
 * Push DATABASE_URL, DIRECT_URL, and optional Supabase API vars to Vercel.
 * Reads from .env.local or SUPABASE_DB_PASSWORD.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=... npm run vercel:env-supabase
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const { buildSupabaseDatabaseUrls } = require("./supabase-urls.cjs");

const SCOPE = "javier-vallejos-projects";
const ENVS = ["production", "preview", "development"];

const root = path.join(__dirname, "..");

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

function runCapture(cmd, args, input) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    input,
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

async function setVercelEnv(name, value, environment) {
  console.log(`  → ${name} (${environment})`);
  runCapture("npx", [
    "vercel",
    "env",
    "rm",
    name,
    environment,
    "--scope",
    SCOPE,
    "--yes",
  ]);
  runCapture(
    "npx",
    ["vercel", "env", "add", name, environment, "--scope", SCOPE],
    value
  );
}

async function main() {
  loadEnvFile(path.join(root, ".env"));
  loadEnvFile(path.join(root, ".env.local"));

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (password && (!process.env.DATABASE_URL || !process.env.DIRECT_URL)) {
    const urls = buildSupabaseDatabaseUrls(password, {
      poolerHost: process.env.SUPABASE_POOLER_HOST,
    });
    process.env.DATABASE_URL = process.env.DATABASE_URL || urls.DATABASE_URL;
    process.env.DIRECT_URL = process.env.DIRECT_URL || urls.DIRECT_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || urls.SUPABASE_URL;
  }

  const pairs = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["DIRECT_URL", process.env.DIRECT_URL],
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ].filter(([, v]) => Boolean(v));

  if (pairs.length < 2) {
    console.error(
      "Need DATABASE_URL + DIRECT_URL in .env.local, or SUPABASE_DB_PASSWORD.\n" +
        "Optional: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    process.exit(1);
  }

  console.log(`Updating Vercel env (${SCOPE})...\n`);
  for (const env of ENVS) {
    for (const [name, value] of pairs) {
      await setVercelEnv(name, value, env);
    }
  }

  console.log("\n✓ Vercel env updated. Redeploy: npm run deploy:vercel\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
