#!/usr/bin/env node
/**
 * Lee Plataformas access and data.xlsx y regenera src/lib/platforms-seed.ts
 * Uso: node scripts/parse-platforms-xlsx.cjs
 */
const fs = require("fs");
const path = require("path");

let XLSX;
try {
  XLSX = require("xlsx");
} catch {
  console.error("Instala xlsx: npm i -D xlsx");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const xlsxPath = path.join(root, "Plataformas access and data.xlsx");
const outPath = path.join(root, "src/lib/platforms-seed.ts");

function normUrl(v) {
  if (!v || !String(v).trim()) return null;
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function normSlot(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const slot = Math.round(n);
  if (slot < 1 || slot > 2) return null;
  return slot;
}

function normEmail(v) {
  const s = v != null ? String(v).trim().toLowerCase() : "";
  return s || null;
}

function esc(s) {
  return JSON.stringify(s);
}

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

const seed = [];
let sortOrder = 0;
for (const row of rows) {
  const name = String(row.Plataforma || "").trim();
  if (!name) continue;

  const supabaseRaw = row["Supabase "] ?? row.Supabase ?? "";
  const isDataTransfer = name.toLowerCase() === "data transfer";
  const supabaseEmail = isDataTransfer ? null : normEmail(supabaseRaw);
  const notes = isDataTransfer && supabaseRaw ? String(supabaseRaw).trim() : null;

  seed.push({
    sortOrder,
    name,
    accessUrl: normUrl(row.Access),
    supabaseEmail,
    supabaseSlot: normSlot(row.Cupo),
    vercelEmail: normEmail(row.Vercel),
    vercelSlot: normSlot(row["Cupo 2"]),
    linkUrl: normUrl(row.Link),
    githubEmail: normEmail(row.Github),
    brevoEmail: normEmail(row.BREVO),
    notes,
  });
  sortOrder++;
}

function rowToTs(r) {
  const fields = [
    `sortOrder: ${r.sortOrder}`,
    `name: ${esc(r.name)}`,
  ];
  if (r.accessUrl) fields.push(`accessUrl: normUrl(${esc(r.accessUrl)})`);
  if (r.supabaseEmail) fields.push(`supabaseEmail: normEmail(${esc(r.supabaseEmail)})`);
  if (r.supabaseSlot != null) fields.push(`supabaseSlot: ${r.supabaseSlot}`);
  if (r.vercelEmail) fields.push(`vercelEmail: normEmail(${esc(r.vercelEmail)})`);
  if (r.vercelSlot != null) fields.push(`vercelSlot: ${r.vercelSlot}`);
  if (r.linkUrl) fields.push(`linkUrl: normUrl(${esc(r.linkUrl)})`);
  if (r.githubEmail) fields.push(`githubEmail: normEmail(${esc(r.githubEmail)})`);
  if (r.brevoEmail) fields.push(`brevoEmail: normEmail(${esc(r.brevoEmail)})`);
  if (r.notes) fields.push(`notes: ${esc(r.notes)}`);
  return `  {\n    ${fields.join(",\n    ")},\n  }`;
}

const body = `/**
 * Seed inicial de plataformas — orden del Excel "Plataformas access and data.xlsx".
 * Regenerar con: node scripts/parse-platforms-xlsx.cjs
 */

export type PlatformSeedRow = {
  name: string;
  accessUrl?: string | null;
  supabaseEmail?: string | null;
  supabaseSlot?: number | null;
  vercelEmail?: string | null;
  vercelSlot?: number | null;
  linkUrl?: string | null;
  githubEmail?: string | null;
  brevoEmail?: string | null;
  notes?: string | null;
  sortOrder: number;
};

function normUrl(v: string | undefined | null): string | null {
  if (!v?.trim()) return null;
  const s = v.trim();
  if (/^https?:\\/\\//i.test(s)) return s;
  return \`https://\${s}\`;
}

function normSlot(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const slot = Math.round(n);
  if (slot < 1 || slot > 2) return null;
  return slot;
}

function normEmail(v: string | undefined | null): string | null {
  const s = v?.trim();
  return s || null;
}

/** Filas del Excel (Sheet1). */
export const PLATFORMS_SEED: PlatformSeedRow[] = [
${seed.map(rowToTs).join(",\n")}
];

export { normUrl, normSlot, normEmail };
`;

fs.writeFileSync(outPath, body, "utf8");
console.log(`Wrote ${seed.length} rows to ${outPath}`);
