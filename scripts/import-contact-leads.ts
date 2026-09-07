/**
 * Rescata al CRM las solicitudes del formulario público que quedaron solo como
 * correo en info@ antes de que /api/contact escribiera leads.
 *
 * La IA clasifica cada una: descarta el spam de bots y le pone prioridad al
 * resto con el motivo escrito, para que el tablero se pueda leer de un vistazo.
 *
 * Uso:
 *   npx tsx scripts/import-contact-leads.ts --dry-run   # muestra sin escribir
 *   npx tsx scripts/import-contact-leads.ts             # importa
 *
 * Es idempotente por diseño: `persistLead` deduplica por correo, así que
 * correrlo dos veces no crea fichas repetidas.
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { isContactFormEmail, parseContactEmail } = await import("../src/lib/leads/contact-email");
  const { classifyLead } = await import("../src/lib/leads/classify");
  const { persistLead } = await import("../src/lib/leads/persist");
  const { resolveOwnerUserId } = await import("../src/lib/owner-user");

  if (!process.env.OPENAI_API_KEY) throw new Error("Falta OPENAI_API_KEY en .env.local");

  const userId = await resolveOwnerUserId();
  const emails = await prisma.inboxEmail.findMany({
    where: { subject: { startsWith: "[PIME Panama] Nueva solicitud de" } },
    orderBy: { receivedAt: "asc" },
    select: { id: true, subject: true, bodyText: true, receivedAt: true },
  });

  console.log(`${emails.length} correo(s) del formulario en la bandeja${DRY_RUN ? "  ·  DRY RUN" : ""}\n`);

  let creados = 0, anexados = 0, ilegibles = 0, costo = 0;
  const descartados: Record<string, string[]> = { spam: [], proveedor: [], prueba: [] };

  for (const mail of emails) {
    if (!isContactFormEmail(mail.subject)) continue;

    const parsed = parseContactEmail(mail.bodyText);
    if (!parsed) {
      ilegibles += 1;
      console.log(`  ⚠️  ILEGIBLE  ${mail.subject}`);
      continue;
    }

    const verdict = await classifyLead({ ...parsed, receivedAt: mail.receivedAt });
    costo += verdict.costUSD;

    const quien = `${parsed.name}${parsed.company ? ` · ${parsed.company}` : ""}`;

    if (verdict.kind !== "prospecto") {
      descartados[verdict.kind].push(`${quien} — ${verdict.reason}`);
      console.log(`  ✗ ${verdict.kind.padEnd(9)} ${quien}  — ${verdict.reason}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `  ${verdict.priority.padEnd(5)} ${quien}\n` +
          `        ${verdict.reason}\n` +
          `        valor: ${verdict.estimatedValue != null ? `$${verdict.estimatedValue.toLocaleString("en-US")}` : "—"}  ·  ${verdict.suggestedAction}`
      );
      continue;
    }

    const { repeat } = await persistLead({
      userId,
      ...parsed,
      receivedAt: mail.receivedAt,
      priority: verdict.priority,
      priorityReason: verdict.reason,
      message: [
        parsed.message,
        "",
        "— Triaje IA —",
        `Prioridad ${verdict.priority}: ${verdict.reason}`,
        verdict.estimatedValue != null
          ? `Valor estimado por IA (sin validar): $${verdict.estimatedValue.toLocaleString("en-US")}`
          : null,
        verdict.suggestedAction ? `Siguiente paso: ${verdict.suggestedAction}` : null,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    });

    repeat ? (anexados += 1) : (creados += 1);
    console.log(`  ${repeat ? "↻" : "✓"} ${verdict.priority.padEnd(5)} ${quien}  — ${verdict.reason}`);
  }

  const totalDescartado = Object.values(descartados).reduce((n, l) => n + l.length, 0);
  console.log(
    `\n${DRY_RUN ? "Sin escribir. " : `${creados} lead(s) nuevo(s), ${anexados} anexado(s) a fichas existentes. `}` +
      `${totalDescartado} fuera del CRM ` +
      `(${Object.entries(descartados).filter(([, l]) => l.length).map(([k, l]) => `${l.length} ${k}`).join(", ") || "ninguno"})` +
      `, ${ilegibles} ilegible(s). Costo IA: $${costo.toFixed(4)}`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
