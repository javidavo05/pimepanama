import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { backfillSentFolder, SENT_BACKFILL_DAYS } from "@/lib/mail/imap-sync";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const { searchParams } = new URL(request.url);
    const sinceDaysParam = searchParams.get("sinceDays");
    const sinceDays =
      sinceDaysParam && Number.isFinite(Number(sinceDaysParam)) && Number(sinceDaysParam) > 0
        ? Number(sinceDaysParam)
        : SENT_BACKFILL_DAYS;

    const accounts = await prisma.mailAccount.findMany({
      where: { userId: user.id, active: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No hay cuentas activas" }, { status: 400 });
    }

    const results: Record<string, { label: string; fetched: number; error?: string }> = {};
    let totalFetched = 0;

    for (const account of accounts) {
      try {
        const result = await backfillSentFolder(account, sinceDays);
        const fetched = result.folders.SENT ?? result.fetched;
        results[account.id] = { label: account.label, fetched };
        totalFetched += fetched;
      } catch (err) {
        results[account.id] = {
          label: account.label,
          fetched: 0,
          error: err instanceof Error ? err.message : "Error de sincronización",
        };
      }
    }

    return NextResponse.json({
      ok: true,
      sinceDays,
      totalFetched,
      accounts: results,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backfill error" },
      { status: 500 }
    );
  }
}
