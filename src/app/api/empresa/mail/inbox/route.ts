import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId") ?? undefined;
    const isRead = url.searchParams.get("isRead");
    const isStarred = url.searchParams.get("isStarred");
    const tag = url.searchParams.get("tag");
    const search = url.searchParams.get("search") ?? undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const limit = 30;

    const emails = await prisma.inboxEmail.findMany({
      where: {
        userId: user.id,
        ...(accountId && { accountId }),
        ...(isRead !== null && { isRead: isRead === "true" }),
        ...(isStarred !== null && { isStarred: isStarred === "true" }),
        ...(tag && { aiTags: { has: tag } }),
        ...(search && {
          OR: [
            { subject: { contains: search, mode: "insensitive" } },
            { fromEmail: { contains: search, mode: "insensitive" } },
            { fromName: { contains: search, mode: "insensitive" } },
            { bodyText: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true, subject: true, fromName: true, fromEmail: true,
        receivedAt: true, isRead: true, isStarred: true, aiTags: true,
        aiSummary: true, folder: true,
        account: { select: { id: true, label: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return NextResponse.json(emails);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
