import { config } from "dotenv";
import { resolve } from "path";
import { ImapFlow } from "imapflow";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const { prisma } = await import("../src/lib/prisma.ts");
const { decryptPassword } = await import("../src/lib/mail/crypto.ts");
const { resolveImapPath } = await import("../src/lib/mail/folders.ts");

const account = await prisma.mailAccount.findFirst({
  where: { username: { contains: "javier@pimepanama.com" } },
});
if (!account) {
  console.log("Cuenta javier@pimepanama.com no encontrada");
  process.exit(1);
}

const client = new ImapFlow({
  host: account.host,
  port: account.port,
  secure: account.tls,
  auth: { user: account.username, pass: decryptPassword(account.passwordEnc) },
  logger: false,
});

await client.connect();
const list = await client.list();
const sentPath = resolveImapPath("SENT", list.map((b) => b.path));
console.log("Carpeta Sent en servidor:", sentPath);

const lock = await client.getMailboxLock(sentPath);
try {
  const toUapa = await client.search({ to: "tesoreria@uapanama.org" }, { uid: true });
  console.log("\nIMAP → to:tesoreria@uapanama.org (histórico):", toUapa);

  const status = await client.status(sentPath, { messages: true });
  console.log("Total mensajes en Sent (servidor):", status.messages);

  const since = new Date("2026-07-20T00:00:00Z");
  const toUapaSince = await client.search({ since, to: "tesoreria@uapanama.org" }, { uid: true });
  console.log("IMAP → to:tesoreria@uapanama.org (desde 20 jul):", toUapaSince);

  const subjectVisita = await client.search({ since, subject: "Visita7" }, { uid: true });
  console.log("IMAP → subject:Visita7 (desde 20 jul):", subjectVisita);

  const allSince = await client.search({ since }, { uid: true });
  console.log("Total en Sent desde 20 jul:", allSince?.length ?? 0);

  const inspect = [...new Set([...(toUapa ?? []), ...(toUapaSince ?? []), ...(subjectVisita ?? [])])];
  if (inspect.length) {
    for await (const msg of client.fetch(inspect, { envelope: true, uid: true }, { uid: true })) {
      console.log("\n--- Mensaje en servidor ---");
      console.log("UID:", msg.uid);
      console.log("Fecha:", msg.envelope?.date);
      console.log("Asunto:", msg.envelope?.subject);
      console.log("Para:", msg.envelope?.to?.map((t) => t.address).join(", "));
    }
  }
} finally {
  lock.release();
  await client.logout();
}

await prisma.$disconnect();
