/**
 * Prueba el análisis de documentos contra un PDF real, sin servidor.
 *   npx tsx scripts/test-analyze-document.ts "/ruta/Propuesta.pdf" [salida.json] [modelo]
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { analyzeProjectDocument } from "../src/lib/ai/project-from-document";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  const [file, out, model] = process.argv.slice(2);
  if (!file) throw new Error("Falta la ruta del PDF");
  const data = fs.readFileSync(file).toString("base64");
  const started = Date.now();
  const r = await analyzeProjectDocument(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), {
    fileName: path.basename(file),
    fileDataUrl: `data:application/pdf;base64,${data}`,
  }, model);
  const parsed = JSON.parse(r.outputText);
  if (out) fs.writeFileSync(out, JSON.stringify(parsed, null, 2));
  const n = parsed.phases.reduce((s: number, p: { deliverables: unknown[] }) => s + p.deliverables.length, 0);
  console.log(`${parsed.sourceType} · ${parsed.phases.length} fases · ${n} entregables · ${Math.round((Date.now() - started) / 1000)} s · ${r.inputTokens}/${r.outputTokens} tokens${r.incomplete ? " · INCOMPLETO" : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
