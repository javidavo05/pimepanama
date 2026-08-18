import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { AutoSyncOnMount } from "@/components/empresa/mail/auto-sync-on-mount";
import { HubMailShell } from "@/components/empresa/mail/hub-mail-shell";
import { ensureMailSignaturesSeeded } from "@/lib/mail/signature-bootstrap";
import {
  CANONICAL_FOLDERS,
  parseFolderParam,
  type CanonicalFolder,
} from "@/lib/mail/folders";
import { extractEmailAddress } from "@/lib/mail/thread";
import { mailBodyPreview } from "@/lib/mail/body-format";

export const metadata = { title: "Bandeja de entrada — Pime Suite" };
export const dynamic = "force-dynamic";

const ACCOUNT_PALETTE = [
  { borderColor: "bg-[#1AA7F0]", dotColor: "bg-[#1AA7F0]", badgeBg: "bg-[#1AA7F0]/15", badgeText: "text-[#1AA7F0]", activeBg: "bg-[#1AA7F0]/10 text-[#1AA7F0]" },
  { borderColor: "bg-[#6344E8]", dotColor: "bg-[#6344E8]", badgeBg: "bg-[#6344E8]/15", badgeText: "text-[#8B6FFF]", activeBg: "bg-[#6344E8]/10 text-[#8B6FFF]" },
  { borderColor: "bg-[#E85D04]", dotColor: "bg-[#E85D04]", badgeBg: "bg-[#E85D04]/15", badgeText: "text-[#FF7A2B]", activeBg: "bg-[#E85D04]/10 text-[#FF7A2B]" },
  { borderColor: "bg-[#06D6A0]", dotColor: "bg-[#06D6A0]", badgeBg: "bg-[#06D6A0]/15", badgeText: "text-[#06D6A0]", activeBg: "bg-[#06D6A0]/10 text-[#06D6A0]" },
  { borderColor: "bg-[#FFB703]", dotColor: "bg-[#FFB703]", badgeBg: "bg-[#FFB703]/15", badgeText: "text-[#FFB703]", activeBg: "bg-[#FFB703]/10 text-[#FFB703]" },
  { borderColor: "bg-[#FB5607]", dotColor: "bg-[#FB5607]", badgeBg: "bg-[#FB5607]/15", badgeText: "text-[#FB5607]", activeBg: "bg-[#FB5607]/10 text-[#FB5607]" },
];

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dateFrom?: string; dateTo?: string; tag?: string; filter?: string; folder?: string }>;
}) {
  const user = await getEmpresaUser();
  await ensureMailSignaturesSeeded(user.id);

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const dateFrom = sp.dateFrom ? new Date(sp.dateFrom) : undefined;
  const dateTo = sp.dateTo ? new Date(sp.dateTo + "T23:59:59") : undefined;
  const tag = sp.tag;
  const filter = sp.filter;
  const activeFolder = parseFolderParam(sp.folder);

  const [accounts, clients, globalUnreadCount, folderGroups, company] = await Promise.all([
    prisma.mailAccount.findMany({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, label: true, username: true, lastSyncAt: true, smtpHost: true,
        fromName: true, signatureName: true, signatureTitle: true,
        signatureEnabled: true, signatureHtml: true,
      },
    }),
    prisma.client.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, email: true },
    }),
    prisma.inboxEmail.count({ where: { userId: user.id, isRead: false, folder: "INBOX" } }),
    prisma.inboxEmail.groupBy({
      by: ["folder"],
      where: { userId: user.id },
      _count: { id: true },
    }),
    user.configId
      ? prisma.companyConfig.findFirst({
          where: { id: user.configId },
          select: { name: true, email: true, phone: true, website: true, logoUrl: true },
        })
      : Promise.resolve(null),
  ]);

  const folderCounts = Object.fromEntries(
    CANONICAL_FOLDERS.map((f) => [f, 0])
  ) as Record<CanonicalFolder, number>;
  for (const g of folderGroups) {
    const key = g.folder as CanonicalFolder;
    if (key in folderCounts) folderCounts[key] = g._count.id;
  }

  const emails = await prisma.inboxEmail.findMany({
    where: {
      userId: user.id,
      folder: activeFolder,
      ...(filter === "unread" && activeFolder === "INBOX" && { isRead: false }),
      ...(filter === "starred" && { isStarred: true }),
      ...(tag && { aiTags: { has: tag } }),
      ...(dateFrom && { receivedAt: { gte: dateFrom } }),
      ...(dateTo && { receivedAt: dateTo ? { ...(dateFrom ? { gte: dateFrom } : {}), lte: dateTo } : undefined }),
      ...(q && {
        OR: [
          { subject: { contains: q, mode: "insensitive" as const } },
          { fromName: { contains: q, mode: "insensitive" as const } },
          { fromEmail: { contains: q, mode: "insensitive" as const } },
          { aiSummary: { contains: q, mode: "insensitive" as const } },
          { bodyText: { contains: q, mode: "insensitive" as const } },
        ],
      }),
    },
    select: {
      id: true, subject: true, fromName: true, fromEmail: true, toAddresses: true,
      receivedAt: true, isRead: true, isStarred: true, aiTags: true,
      aiSummary: true, folder: true, messageId: true,
      deliveryStatus: true, resendId: true, bounceReason: true,
      bodyText: true,
      account: { select: { id: true, label: true } },
      _count: { select: { attachments: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: 150,
  });

  const accountColors = accounts.map((acc, i) => ({
    ...acc,
    ...ACCOUNT_PALETTE[i % ACCOUNT_PALETTE.length],
  }));

  const clientByEmail = Object.fromEntries(
    clients.flatMap((c) => (c.email ? [[c.email.toLowerCase(), c]] : []))
  );

  const serialized = emails.map((e) => {
    const counterparty =
      e.folder === "SENT" && e.toAddresses[0]
        ? extractEmailAddress(e.toAddresses[0])
        : e.fromEmail.toLowerCase();
    return {
      ...e,
      receivedAt: e.receivedAt.toISOString(),
      bodyPreview: e.folder === "SENT" ? mailBodyPreview(e.bodyText) : null,
      clientMatch: clientByEmail[counterparty] ?? null,
    };
  });

  return (
    <div className="w-full">
      <AutoSyncOnMount accountIds={accounts.map((a) => a.id)} />

      {accounts.length === 0 ? (
        <div className="bg-gradient-to-r from-[#1AA7F0]/[0.07] to-[#6344E8]/[0.07] border border-[#1AA7F0]/15 rounded-xl p-6 text-center space-y-3">
          <p className="text-white/70 font-medium">No tienes cuentas IMAP conectadas</p>
          <p className="text-white/55 text-sm">Conecta tu correo para leer, clasificar con IA y responder desde aquí.</p>
          <Link
            href="/empresa/correos/cuentas/nueva"
            className="inline-block px-5 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all"
          >
            Conectar cuenta
          </Link>
        </div>
      ) : (
        <HubMailShell
          accounts={accountColors}
          company={company}
          initialEmails={serialized}
          activeFolder={activeFolder}
          folderCounts={folderCounts}
          unreadCount={globalUnreadCount}
          filter={filter}
          searchParams={{ q, dateFrom: sp.dateFrom, dateTo: sp.dateTo, tag, filter, folder: sp.folder }}
          initialQ={q}
          initialDateFrom={sp.dateFrom ?? ""}
          initialDateTo={sp.dateTo ?? ""}
          initialTag={tag ?? ""}
          initialFilter={filter ?? ""}
        />
      )}
    </div>
  );
}
