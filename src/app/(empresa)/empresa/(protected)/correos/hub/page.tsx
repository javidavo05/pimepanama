import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { InboxList } from "@/components/empresa/mail/inbox-list";
import { HubSyncButton } from "@/components/empresa/mail/hub-sync-button";
import { AutoSyncOnMount } from "@/components/empresa/mail/auto-sync-on-mount";

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
  searchParams: Promise<{ q?: string; dateFrom?: string; dateTo?: string; tag?: string; filter?: string }>;
}) {
  const user = await getEmpresaUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const dateFrom = sp.dateFrom ? new Date(sp.dateFrom) : undefined;
  const dateTo = sp.dateTo ? new Date(sp.dateTo + "T23:59:59") : undefined;
  const tag = sp.tag;
  const filter = sp.filter;

  const [accounts, clients] = await Promise.all([
    prisma.mailAccount.findMany({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, label: true, username: true, lastSyncAt: true },
    }),
    prisma.client.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const emails = await prisma.inboxEmail.findMany({
    where: {
      userId: user.id,
      ...(filter === "unread" && { isRead: false }),
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
      id: true, subject: true, fromName: true, fromEmail: true,
      receivedAt: true, isRead: true, isStarred: true, aiTags: true,
      aiSummary: true, folder: true, messageId: true,
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

  // Build client email lookup for linking
  const clientByEmail = Object.fromEntries(
    clients.flatMap((c) => c.email ? [[c.email.toLowerCase(), c]] : [])
  );

  const serialized = emails.map((e) => ({
    ...e,
    receivedAt: e.receivedAt.toISOString(),
    clientMatch: clientByEmail[e.fromEmail.toLowerCase()] ?? null,
  }));

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-white text-xl font-semibold tracking-tight">Bandeja de entrada</h1>
          {unreadCount > 0 && (
            <span className="bg-[#1AA7F0]/20 text-[#1AA7F0] text-xs rounded-full px-2 py-0.5 font-medium">
              {unreadCount} sin leer
            </span>
          )}
          <AutoSyncOnMount accountIds={accounts.map((a) => a.id)} />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/empresa/correos/cuentas" className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">⚙️ Cuentas</Link>
          <Link href="/empresa/correos" className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">📤 Archivados</Link>
          {accounts.length > 0 && (
            <HubSyncButton accounts={accountColors.map((a) => ({ id: a.id, label: a.label }))} />
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-gradient-to-r from-[#1AA7F0]/[0.07] to-[#6344E8]/[0.07] border border-[#1AA7F0]/15 rounded-xl p-6 text-center space-y-3">
          <p className="text-white/70 font-medium">No tienes cuentas IMAP conectadas</p>
          <p className="text-white/35 text-sm">Conecta tu correo para leer, clasificar con IA y responder desde aquí.</p>
          <Link href="/empresa/correos/cuentas/nueva"
            className="inline-block px-5 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all">
            Conectar cuenta
          </Link>
        </div>
      ) : (
        <div className="bg-[#07070e] border border-white/[0.06] rounded-2xl overflow-hidden">
          <InboxList
            initialEmails={serialized}
            accounts={accountColors}
            initialQ={q}
            initialDateFrom={sp.dateFrom ?? ""}
            initialDateTo={sp.dateTo ?? ""}
            initialTag={tag ?? ""}
            initialFilter={filter ?? ""}
          />
        </div>
      )}
    </div>
  );
}
