// Captura cada tablero de /avance/casos a 2560×1600 (escala 2) → public/cases/<slug>.png; luego se convierte a WebP.
// Uso: con `npm run dev` en :3000 →  node scripts/capture-cases.mjs   (Playwright de ~/.claude/skills/pime-phone-check/scripts)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(process.env.HOME + "/.claude/skills/pime-phone-check/scripts/");
const { chromium } = require("playwright");
const SLUGS = ["svitzer", "uapa-suite", "academyx", "bnb-real-estate", "smart-church", "john-henry"];
mkdirSync("public/cases", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:3000/avance/casos", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
for (const s of SLUGS) { const el = await p.$(`#${s} > div`); await el.screenshot({ path: `public/cases/${s}.png` }); console.log("ok", s); }
await b.close();
