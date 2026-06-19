#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { buildSupabaseDatabaseUrls } = require("./supabase-urls.cjs");

const root = path.join(__dirname, "..");
const envLocal = path.join(root, ".env.local");

for (const line of fs.readFileSync(envLocal, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  process.env[t.slice(0, i)] = t.slice(i + 1);
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD missing in .env.local");
  process.exit(1);
}

const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
  "sa-east-1",
];

function probe(label, url) {
  const result = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--url", url, "--stdin"],
    {
      cwd: root,
      input: "SELECT 1 as ok;",
      encoding: "utf8",
      timeout: 15000,
    }
  );
  const out = (result.stderr || result.stdout || "").trim();
  if (result.status === 0) {
    console.log("OK", label);
    return true;
  }
  const first = out.split("\n").find((l) => l.includes("FATAL") || l.includes("Can't reach")) || out.slice(0, 120);
  console.log("FAIL", label, "-", first);
  return false;
}

const direct = buildSupabaseDatabaseUrls(password).DIRECT_DB_URL;
if (probe("direct-ipv6", direct)) {
  console.log("\nUse DIRECT_URL (and DATABASE_URL for migrate):", direct.replace(password, "***"));
  process.exit(0);
}

for (const region of regions) {
  for (const prefix of ["aws-0", "aws-1"]) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    const urls = buildSupabaseDatabaseUrls(password, { poolerHost: host });
    if (probe(`session ${host}`, urls.DIRECT_URL)) {
      console.log("\nSUPABASE_POOLER_HOST=" + host);
      console.log("DIRECT_URL set (session pooler, port 5432)");
      console.log("DATABASE_URL set (transaction pooler, port 6543)");
      process.exit(0);
    }
  }
}

console.error("\nNo working host found. Copy exact URIs from Supabase Dashboard → Connect.");
process.exit(1);
