/**
 * Pasada sobre los correos recibidos recientes que entraron antes de que la IA buscara solicitudes de
 * cotización (2026-10-20): los vuelve a analizar y guarda lo que pide cada uno (InboxEmail.solicitud).
 * No crea leads: lo de remitentes nuevos queda como «Posible lead» para aprobarlo; lo de un cliente o lead
 * conocido queda ligado a su ficha. Sin avisos al teléfono (son correos viejos).
 *
 * Uso:
 *   npx tsx scripts/detectar-solicitudes.ts --dias 45 --dry-run   # cuenta y estima el costo
 *   npx tsx scripts/detectar-solicitudes.ts --dias 45
 */
import path from "node:path";
import { createRequire } from "node:module";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });
const require = createRequire(import.meta.url);
// Hace que las llamadas no hagan nada donde claude-progress no está instalado.
let claudeProgress: (...a: string[]) => void = () => {};
try { ({ claudeProgress } = require(path.join(process.env.CLAUDE_PROGRESS_DIR ?? "", "claude-progress.js"))); } catch {}

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const DIAS = Number(arg("--dias") ?? 45);
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const { analyzeEmail } = await import("../src/lib/mail/ai-analyze");
  const { htmlToPlainText, isHtmlEmail } = await import("../src/lib/mail/email-html");
  const { esBuzonAutomatico } = await import("../src/lib/crm/vinculo-correo");
  const { vincularCorreo, direccionesPropias } = await import("../src/lib/crm/vinculo-correo-datos");
  if (!process.env.OPENAI_API_KEY) throw new Error("Falta OPENAI_API_KEY en .env.local");

  const todos = await prisma.inboxEmail.findMany({
    where: {
      folder: "INBOX", receivedAt: { gte: new Date(Date.now() - DIAS * 86_400_000) }, solicitud: { equals: Prisma.DbNull },
      NOT: { aiTags: { has: "spam" } }, OR: [{ vinculo: null }, { vinculo: "auto" }],
    },
    orderBy: { receivedAt: "desc" },
  });
  const propias = todos.length ? await direccionesPropias(todos[0].userId) : null;
  const correos = todos.filter((m) => {
    const de = m.fromEmail.toLowerCase();
    return !esBuzonAutomatico(de) && !propias?.direcciones.has(de) && !propias?.dominios.has(de.split("@")[1] ?? "");
  });
  console.log(`${correos.length} correo(s) de personas en ${DIAS} días (de ${todos.length} sin spam) · costo estimado ≈ $${(correos.length * 0.003).toFixed(2)}${DRY_RUN ? "  ·  DRY RUN" : ""}`);
  if (DRY_RUN) return prisma.$disconnect();

  let hechos = 0, solicitudes = 0, sugeridas = 0, ligadas = 0, costo = 0, fallos = 0;
  claudeProgress("-n", "solicitudes", `0/${correos.length}`);
  for (let i = 0; i < correos.length; i += 3) {
    await Promise.all(correos.slice(i, i + 3).map(async (m) => {
      try {
        const cuerpo = m.bodyText ?? "";
        const a = await analyzeEmail(m.subject ?? "", (isHtmlEmail(cuerpo) ? htmlToPlainText(cuerpo) : cuerpo).slice(0, 2000));
        costo += a.costUSD;
        if (a.solicitud) {
          solicitudes++;
          const r = await vincularCorreo(m, { solicitud: a.solicitud, etiquetas: a.tags, avisar: false });
          if (!r.ligado && r.sugerido) sugeridas++;
          if (r.ligado) ligadas++;
          console.log(`  ★ ${m.fromEmail} | ${(m.subject ?? "").slice(0, 60)} → ${a.solicitud.necesidad}`);
        }
      } catch (e) { fallos++; console.error("  ✗", m.id, (e as Error).message); }
      hechos++;
    }));
    claudeProgress("-n", "solicitudes", `${hechos}/${correos.length}`, `${solicitudes} solicitud(es)`);
  }
  claudeProgress("-n", "solicitudes", "done", `${solicitudes} solicitud(es)`);
  console.log(`✓ ${hechos} analizados · ${solicitudes} solicitudes (${sugeridas} por aprobar, ${ligadas} de clientes o leads conocidos) · ${fallos} fallos · $${costo.toFixed(3)}`);
  await prisma.$disconnect();
}

main().catch((e) => { claudeProgress("-n", "solicitudes", "fail", String(e)); console.error(e); process.exit(1); });
