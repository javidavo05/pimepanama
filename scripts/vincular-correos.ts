/**
 * Pasada única sobre los correos ya guardados (migración 0062): liga cada uno al cliente o lead que ya existe
 * por la dirección de la contraparte, y después hereda el vínculo dentro de cada hilo. No usa IA ni crea leads:
 * las solicitudes nuevas se sugieren solo en los correos que entren de aquí en adelante.
 *
 * Es SQL por lotes (una ida a Supabase por paso), no correo por correo: desde local cada consulta tarda ~600 ms.
 * Idempotente: solo toca correos sin vínculo.
 *
 * Uso:
 *   npx tsx scripts/vincular-correos.ts --dry-run   # cuenta sin escribir
 *   npx tsx scripts/vincular-correos.ts
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: true });
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  // Contraparte de cada correo sin vínculo: quien escribe (recibidos) o los destinatarios (enviados),
  // sin direcciones de los buzones ni del equipo ni de sus dominios corporativos.
  const base = `
    WITH propias AS (
      SELECT lower(username) AS e, "userId" FROM "MailAccount"
      UNION SELECT lower(email), coalesce("ownerId", id) FROM "EmpresaUser"
    ),
    dominios AS (
      SELECT DISTINCT split_part(e, '@', 2) AS d, "userId" FROM propias
      WHERE split_part(e, '@', 2) NOT IN ('gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','icloud.com','me.com','aol.com','proton.me','protonmail.com')
    ),
    pares AS (
      SELECT m.id, m."userId", m."receivedAt", m.folder, lower(trim(regexp_replace(d, '^.*<([^>]+)>.*$', '\\1'))) AS e
      FROM "InboxEmail" m,
      LATERAL unnest(CASE WHEN m.folder = 'SENT' THEN m."toAddresses" || m."ccAddresses" ELSE ARRAY[m."fromEmail"] END) AS t(d)
      WHERE m.vinculo IS NULL AND m."leadId" IS NULL AND m."clientId" IS NULL AND m.folder NOT IN ('TRASH','SPAM','DRAFTS')
    ),
    ajenos AS (
      SELECT p.* FROM pares p
      WHERE p.e LIKE '%@%'
        AND NOT EXISTS (SELECT 1 FROM propias x WHERE x.e = p.e AND x."userId" = p."userId")
        AND NOT EXISTS (SELECT 1 FROM dominios x WHERE x.d = split_part(p.e, '@', 2) AND x."userId" = p."userId")
    ),
    cliente AS (
      SELECT DISTINCT ON (a.id) a.id, a.folder, a."receivedAt", c.id AS "clientId"
      FROM ajenos a
      JOIN (
        SELECT id, "userId", lower(trim(email)) AS e, 0 AS orden, "updatedAt" FROM "Client" WHERE coalesce(trim(email), '') <> '' AND NOT internal
        UNION ALL
        SELECT "clientId", "userId", lower(trim(email)), 1, "updatedAt" FROM "Contacto" WHERE coalesce(trim(email), '') <> ''
      ) c ON c.e = a.e AND c."userId" = a."userId"
      ORDER BY a.id, c.orden, c."updatedAt" DESC
    ),
    lead AS (
      SELECT DISTINCT ON (a.id) a.id, a.folder, l.id AS "leadId", l."convertedClientId"
      FROM ajenos a JOIN "Lead" l ON lower(trim(l.email)) = a.e AND l."userId" = a."userId"
      ORDER BY a.id, l."updatedAt" DESC
    ),
    resultado AS (
      SELECT coalesce(c.id, l.id) AS id,
             coalesce(c."clientId", l."convertedClientId") AS "clientId",
             CASE WHEN c."clientId" IS NULL OR l."convertedClientId" = c."clientId" THEN l."leadId" END AS "leadId"
      FROM cliente c FULL JOIN lead l ON l.id = c.id
    )`;

  const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`${base} SELECT count(*) AS n FROM resultado`);
  console.log(`${n} correo(s) se ligan por dirección${DRY_RUN ? "  ·  DRY RUN" : ""}`);
  const muestra = await prisma.$queryRawUnsafe<{ cliente: string | null; lead: string | null; n: bigint }[]>(`${base}
    SELECT c.name AS cliente, l.name AS lead, count(*) AS n FROM resultado r
    LEFT JOIN "Client" c ON c.id = r."clientId" LEFT JOIN "Lead" l ON l.id = r."leadId"
    GROUP BY 1, 2 ORDER BY n DESC LIMIT 25`);
  for (const m of muestra) console.log(`  ${String(m.n).padStart(4)}  ${m.cliente ?? "—"}${m.lead ? `  (lead: ${m.lead})` : ""}`);
  if (DRY_RUN) return;

  const ligados = await prisma.$executeRawUnsafe(`${base}
    UPDATE "InboxEmail" m SET "clientId" = r."clientId", "leadId" = r."leadId", vinculo = 'auto'
    FROM resultado r WHERE m.id = r.id`);
  console.log(`✓ ${ligados} ligados por dirección`);

  // Hilos: lo que quedó sin vínculo hereda el de otro correo del mismo hilo.
  const porHilo = await prisma.$executeRawUnsafe(`
    UPDATE "InboxEmail" m SET "clientId" = h."clientId", "leadId" = h."leadId", vinculo = 'auto'
    FROM (
      SELECT DISTINCT ON ("userId", "threadKey") "userId", "threadKey", "clientId", "leadId"
      FROM "InboxEmail" WHERE "threadKey" IS NOT NULL AND ("clientId" IS NOT NULL OR "leadId" IS NOT NULL) AND vinculo IS DISTINCT FROM 'ignorado'
      ORDER BY "userId", "threadKey", "receivedAt" DESC
    ) h
    WHERE m."userId" = h."userId" AND m."threadKey" = h."threadKey" AND m.vinculo IS NULL
      AND m."clientId" IS NULL AND m."leadId" IS NULL AND m.folder NOT IN ('TRASH','SPAM','DRAFTS')`);
  console.log(`✓ ${porHilo} ligados por hilo`);

  // Último contacto de cada cliente: el correo ligado más reciente.
  const contacto = await prisma.$executeRawUnsafe(`
    UPDATE "Client" c SET "ultimoContactoAt" = x.ultimo
    FROM (SELECT "clientId", max("receivedAt") AS ultimo FROM "InboxEmail" WHERE "clientId" IS NOT NULL GROUP BY 1) x
    WHERE c.id = x."clientId" AND (c."ultimoContactoAt" IS NULL OR c."ultimoContactoAt" < x.ultimo)`);
  console.log(`✓ ${contacto} cliente(s) con su último contacto al día`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
