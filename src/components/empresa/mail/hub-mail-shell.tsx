"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InboxList } from "@/components/empresa/mail/inbox-list";
import { HubSyncButton } from "@/components/empresa/mail/hub-sync-button";
import { UnreadBadge } from "@/components/empresa/mail/unread-badge";
import { FolderSidebar } from "@/components/empresa/mail/folder-sidebar";
import { EmailComposeModal, type ComposeAccount, type CompanyPreview } from "@/components/empresa/mail/email-compose-modal";
import { FOLDER_LABELS, type CanonicalFolder } from "@/lib/mail/folders";

interface AccountColor {
  id: string;
  label: string;
  username: string;
  smtpHost: string | null;
  fromName?: string | null;
  signatureName?: string | null;
  signatureTitle?: string | null;
  signatureEnabled?: boolean;
  signatureHtml?: string | null;
  borderColor: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  activeBg: string;
}

interface HubMailShellProps {
  accounts: AccountColor[];
  company: CompanyPreview | null;
  initialEmails: Parameters<typeof InboxList>[0]["initialEmails"];
  activeFolder: CanonicalFolder;
  folderCounts: Record<CanonicalFolder, number>;
  unreadCount: number;
  filter?: string;
  searchParams: {
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    tag?: string;
    filter?: string;
    folder?: string;
  };
  initialQ: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialTag: string;
  initialFilter: string;
}

export function HubMailShell({
  accounts,
  company,
  initialEmails,
  activeFolder,
  folderCounts,
  unreadCount,
  filter,
  searchParams,
  initialQ,
  initialDateFrom,
  initialDateTo,
  initialTag,
  initialFilter,
}: HubMailShellProps) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);

  const composeAccounts: ComposeAccount[] = useMemo(
    () =>
      accounts.map((a) => ({
        id: a.id,
        label: a.label,
        username: a.username,
        smtpHost: a.smtpHost,
        fromName: a.fromName,
        signatureName: a.signatureName,
        signatureTitle: a.signatureTitle,
        signatureEnabled: a.signatureEnabled,
        signatureHtml: a.signatureHtml,
      })),
    [accounts]
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-white text-xl font-semibold tracking-tight">
            {FOLDER_LABELS[activeFolder]}
          </h1>
          {activeFolder === "INBOX" && (
            <UnreadBadge
              count={unreadCount}
              active={filter === "unread"}
              searchParams={searchParams}
            />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-sm font-semibold rounded-lg transition-all inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Redactar
          </button>
          <Link href="/empresa/correos/cuentas" className="px-3 py-1.5 text-xs text-white/60 hover:text-white/70">
            Cuentas
          </Link>
          <Link href="/empresa/correos" className="px-3 py-1.5 text-xs text-white/60 hover:text-white/70">
            Archivados
          </Link>
          <HubSyncButton accounts={accounts.map((a) => ({ id: a.id, label: a.label }))} />
        </div>
      </div>

      <div className="md:hidden mb-3">
        <FolderSidebar activeFolder={activeFolder} counts={folderCounts} layout="chips" />
      </div>

      <div className="bg-[#07070e] border border-white/[0.06] rounded-2xl overflow-hidden flex">
        <aside className="hidden md:block w-44 shrink-0 border-r border-white/[0.06] bg-[#0a0a10]/50 px-2">
          <FolderSidebar activeFolder={activeFolder} counts={folderCounts} layout="sidebar" />
        </aside>
        <div className="flex-1 min-w-0">
          <InboxList
            initialEmails={initialEmails}
            accounts={accounts}
            initialQ={initialQ}
            initialDateFrom={initialDateFrom}
            initialDateTo={initialDateTo}
            initialTag={initialTag}
            initialFilter={initialFilter}
            initialFolder={activeFolder}
            showAccountPills={activeFolder === "INBOX"}
          />
        </div>
      </div>

      <EmailComposeModal
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          router.refresh();
        }}
        accounts={composeAccounts}
        company={company}
        mode="new"
      />
    </div>
  );
}
