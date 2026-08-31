#!/usr/bin/env node
/**
 * Aplica migraciones de supabase/migrations/ contra Supabase usando la
 * Management API — sin abrir el dashboard ni pegar SQL a mano.
 *
 * Uso:
 *   node scripts/apply-supabase-migration.cjs            # la última del directorio
 *   node scripts/apply-supabase-migration.cjs 0023       # por número
 *   node scripts/apply-supabase-migration.cjs 0023_meetings.sql
 *   node scripts/apply-supabase-migration.cjs --pending   # todas las ⏳ del README
 *   node scripts/apply-supabase-migration.cjs --dry-run 0023
 *
 * Requiere en .env.local (nunca se commitea):
 *   SUPABASE_PROJECT_REF     ref del proyecto (onodhoqfybzmpaorhyve)
 *   SUPABASE_ACCESS_TOKEN    personal access token sbp_...
 *
 * Las migraciones son idempotentes, así que re-aplicar una ya aplicada es
 * inofensivo. Al terminar marca la fila del README como ✅ Aplicado.
 */

const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");
const README = path.join(MIGRATIONS_DIR, "README.md");
const API = "https://api.supabase.com/v1";

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function migrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
}

/** Resuelve "0023", "0023_meetings.sql" o vacío (=la última) a un nombre de archivo. */
function resolveTarget(arg) {
  const files = migrationFiles();
  if (files.length === 0) fail("No hay migraciones en supabase/migrations/");
  if (!arg) return [files[files.length - 1]];

  const exact = files.find((f) => f === arg);
  if (exact) return [exact];

  const byNumber = files.filter((f) => f.startsWith(`${String(arg).padStart(4, "0")}_`));
  if (byNumber.length === 0) fail(`No encontré ninguna migración que coincida con "${arg}".`);
  return byNumber;
}

/** Migraciones marcadas ⏳ en el README, en orden. */
function pendingFromReadme() {
  if (!fs.existsSync(README)) fail("No existe supabase/migrations/README.md");
  const readme = fs.readFileSync(README, "utf8");
  return migrationFiles().filter((file) => {
    const row = readme.split("\n").find((line) => line.includes(`\`${file}\``));
    return row ? row.includes("⏳") : true;
  });
}

async function runSql(ref, token, sql) {
  const res = await fetch(`${API}/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      detail = JSON.parse(text).message ?? text;
    } catch {
      /* el cuerpo no era JSON */
    }
    throw new Error(`HTTP ${res.status} — ${detail}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Marca la fila del README como aplicada, conservando el resto intacto. */
function markApplied(file) {
  if (!fs.existsSync(README)) return;
  const lines = fs.readFileSync(README, "utf8").split("\n");
  let changed = false;
  const updated = lines.map((line) => {
    if (!line.includes(`\`${file}\``) || !line.includes("⏳")) return line;
    changed = true;
    return line.replace("⏳ Pendiente", "✅ Aplicado");
  });
  if (changed) {
    fs.writeFileSync(README, updated.join("\n"));
    console.log(`   README actualizado → ✅ Aplicado`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const usePending = args.includes("--pending");
  const target = args.find((a) => !a.startsWith("--"));

  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

  if (!ref || !token) {
    fail(
      "Faltan SUPABASE_PROJECT_REF y/o SUPABASE_ACCESS_TOKEN en .env.local.\n" +
        "   El token se genera en https://supabase.com/dashboard/account/tokens"
    );
  }

  const files = usePending ? pendingFromReadme() : resolveTarget(target);

  if (files.length === 0) {
    console.log("\n✅ No hay migraciones pendientes.\n");
    return;
  }

  console.log(`\n📦 Proyecto Supabase: ${ref}`);
  console.log(`   Migraciones a aplicar: ${files.join(", ")}\n`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    if (dryRun) {
      console.log(`— ${file}: ${sql.split("\n").length} líneas (dry-run, no se ejecuta)`);
      continue;
    }

    process.stdout.write(`→ Aplicando ${file}… `);
    try {
      await runSql(ref, token, sql);
      console.log("✅");
      markApplied(file);
    } catch (err) {
      console.log("❌");
      fail(`${file} falló:\n   ${err.message}`);
    }
  }

  console.log("\n✅ Listo.\n");
}

main().catch((err) => fail(err.message));
