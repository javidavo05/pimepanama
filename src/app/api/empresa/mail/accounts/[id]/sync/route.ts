import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { syncAccount, SENT_BACKFILL_DAYS } from "@/lib/mail/imap-sync";
import { CANONICAL_FOLDERS, type CanonicalFolder } from "@/lib/mail/folders";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!account.active) return NextResponse.json({ error: "Account is inactive" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const foldersParam = searchParams.get("folders");
    const sinceDaysParam = searchParams.get("sinceDays");
    let folders: CanonicalFolder[] | undefined;
    if (foldersParam) {
      const requested = foldersParam.split(",").map((f) => f.trim().toUpperCase());
      folders = CANONICAL_FOLDERS.filter((f) => requested.includes(f));
    }

    const sinceDays = sinceDaysParam ? Number(sinceDaysParam) : undefined;
    const since =
      sinceDays && Number.isFinite(sinceDays) && sinceDays > 0
        ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
        : undefined;

    const result = await syncAccount(account, { folders, since });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync error" }, { status: 500 });
  }
}
