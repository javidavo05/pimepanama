// Puerta final: axe-core sobre cada ruta con Playwright (WebKit y Chromium de la skill de teléfonos).
// Uso: con el build en :3001 →  node scripts/axe.mjs
import { createRequire } from "node:module";
const require = createRequire(process.env.HOME + "/.claude/skills/pime-phone-check/scripts/");
const { chromium } = require("playwright");
const { default: AxeBuilder } = await import("@axe-core/playwright");
const BASE = process.env.BASE ?? "http://localhost:3001";
const RUTAS = ["/es", "/es/portfolio", "/es/portfolio/misaza", "/es/servicios", "/es/empresa", "/es/contacto", "/en", "/en/contacto"];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); let total = 0;
for (const r of RUTAS) {
  const p = await ctx.newPage();
  await p.goto(BASE + r, { waitUntil: "networkidle" }); await p.addStyleTag({ content: "[data-reveal]{opacity:1!important;transform:none!important}" });
  const res = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const graves = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  total += graves.length;
  console.log(r.padEnd(24), graves.length ? "✗ " + graves.map((v) => `${v.id} (${v.nodes.length})`).join(", ") : "✓", res.violations.length - graves.length ? `· ${res.violations.length - graves.length} menores` : "");
  for (const v of graves) for (const n of v.nodes.slice(0, 2)) console.log("   ", v.id, "→", n.target.join(" "), "|", (n.failureSummary || "").split("\n")[1]?.trim());
  await p.close();
}
await b.close(); process.exit(total ? 1 : 0);
