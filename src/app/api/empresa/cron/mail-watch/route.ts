import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAccount } from "@/lib/mail/imap-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Margen de la búsqueda IMAP: SINCE trabaja por día, no por hora. */
const LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Baja la bandeja de entrada de quienes tienen conversaciones marcadas, para
 * que la respuesta avise aunque nadie tenga el hub abierto. El aviso en sí lo
 * dispara el sync (handleIncomingForWatches).
 *
 * Lo llama un scheduler externo cada pocos minutos (GitHub Actions): el plan
 * Hobby de Vercel solo permite crons diarios.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // A diferencia de los recordatorios, este endpoint abre conexiones IMAP:
  // sin secreto configurado no corre.
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owners = await prisma.watchedThread.findMany({
    distinct: ["userId"],
    select: { userId: true },
  });
  if (owners.length === 0) return NextResponse.json({ accounts: 0, fetched: 0 });

  const accounts = await prisma.mailAccount.findMany({
    where: { userId: { in: owners.map((o) => o.userId) }, active: true },
  });

  const since = new Date(Date.now() - LOOKBACK_MS);
  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        const r = await syncAccount(account, { folders: ["INBOX"], since, touchLastSync: false });
        return { accountId: account.id, fetched: r.fetched };
      } catch (err) {
        console.error(`[cron/mail-watch] falló el sync de ${account.label}`, err);
        return { accountId: account.id, fetched: 0, error: true };
      }
    })
  );

  return NextResponse.json({
    accounts: accounts.length,
    fetched: results.reduce((sum, r) => sum + r.fetched, 0),
    failed: results.filter((r) => r.error).length,
  });
}

export const GET = run;
export const POST = run;
