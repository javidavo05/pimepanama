"use client";

import { useMemo, useState } from "react";
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
  watchedCount: number;
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
  watchedCount,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h1 className="text-fg text-xl font-semibold tracking-tight">
            {FOLDER_LABELS[activeFolder]}
          </h1>
          {activeFolder === "INBOX" && (
            <UnreadBadge
              count={unreadCount}
              active={filter === "unread"}
              searchParams={searchParams}
            />
          )}
          <UnreadBadge
            count={watchedCount}
            active={filter === "important"}
            searchParams={searchParams}
            filterValue="important"
            label={`${watchedCount} importante${watchedCount !== 1 ? "s" : ""}`}
            titleOn="Quitar filtro de importantes"
            titleOff="Ver solo conversaciones marcadas como importantes"
            tone="amber"
          />
        </div>
        <HubSyncButton
          accounts={accounts.map((a) => ({ id: a.id, label: a.label }))}
          onCompose={() => setComposeOpen(true)}
        />
      </div>

      <div className="md:hidden mb-3">
        <FolderSidebar activeFolder={activeFolder} counts={folderCounts} layout="chips" />
      </div>

      <div className="bg-panel-2 border border-line rounded-2xl overflow-hidden flex">
        <aside className="hidden md:block w-44 shrink-0 border-r border-line bg-panel/50 px-2">
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
