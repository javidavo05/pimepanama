/**
 * Importa correos enviados desde IMAP (carpeta Sent del servidor) hacia la base de datos.
 * Uso: npx tsx scripts/backfill-sent-mail.ts [días=90]
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const sinceDays = Number(process.argv[2] ?? 90);

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { backfillSentFolder, SENT_BACKFILL_DAYS } = await import("../src/lib/mail/imap-sync");

  const days = Number.isFinite(sinceDays) && sinceDays > 0 ? sinceDays : SENT_BACKFILL_DAYS;

  const accounts = await prisma.mailAccount.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });

  if (accounts.length === 0) {
    console.log("No hay cuentas de correo activas.");
    return;
  }

  console.log(`Importando enviados de los últimos ${days} días (${accounts.length} cuenta(s))…\n`);

  let total = 0;
  for (const account of accounts) {
    process.stdout.write(`  ${account.label} (${account.username})… `);
    try {
      const result = await backfillSentFolder(account, days);
      const fetched = result.folders.SENT ?? result.fetched;
      total += fetched;
      console.log(`+${fetched}`);
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nListo — ${total} correo(s) importado(s) en total.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
