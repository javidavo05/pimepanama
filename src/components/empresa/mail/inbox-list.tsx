"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface ClientMatch { id: string; name: string; email: string | null }

interface InboxEmailRow {
  id: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  aiTags: string[];
  aiSummary: string | null;
  messageId: string | null;
  account: { id: string; label: string };
  _count: { attachments: number };
  clientMatch: ClientMatch | null;
}

interface AccountColor {
  id: string;
  label: string;
  borderColor: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  activeBg: string;
}

interface InboxListProps {
  initialEmails: InboxEmailRow[];
  accounts: AccountColor[];
  initialQ?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialTag?: string;
  initialFilter?: string;
}

const TAG_COLORS: Record<string, string> = {
  urgent:     "bg-red-500/15 text-red-400 border-red-500/20",
  invoice:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  payment:    "bg-green-500/15 text-green-400 border-green-500/20",
  "follow-up":"bg-blue-500/15 text-blue-400 border-blue-500/20",
  support:    "bg-purple-500/15 text-purple-400 border-purple-500/20",
  spam:       "bg-white/10 text-white/30 border-white/10",
  general:    "bg-white/[0.04] text-white/30 border-white/[0.08]",
};

const ALL_TAGS = ["urgent","invoice","payment","follow-up","support"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `hace ${Math.max(1,Math.floor(diff / 60000))}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  const now = new Date();
  if (now.getFullYear() === d.getFullYear())
    return d.toLocaleDateString("es-PA", { month: "short", day: "numeric" });
  return d.toLocaleDateString("es-PA", { year: "2-digit", month: "short", day: "numeric" });
}

export function InboxList({
  initialEmails,
  accounts,
  initialQ = "",
  initialDateFrom = "",
  initialDateTo = "",
  initialTag = "",
  initialFilter = "",
}: InboxListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [emails, setEmails] = useState(initialEmails);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Local filter state (mirrors searchParams)
  const [q, setQ] = useState(initialQ);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [showFilters, setShowFilters] = useState(!!(initialQ || initialDateFrom || initialDateTo || initialTag || initialFilter));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colorMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  // Push search to server
  function pushSearch(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const vals = { q, dateFrom, dateTo, tag: activeTag, filter: activeFilter, ...overrides };
    if (vals.q) params.set("q", vals.q);
    if (vals.dateFrom) params.set("dateFrom", vals.dateFrom);
    if (vals.dateTo) params.set("dateTo", vals.dateTo);
    if (vals.tag) params.set("tag", vals.tag);
    if (vals.filter) params.set("filter", vals.filter);
    const qs = params.toString();
    startTransition(() => { router.push(pathname + (qs ? "?" + qs : "")); });
  }

  function handleQChange(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushSearch({ q: v }), 400);
  }

  function toggleTag(t: string) {
    const next = activeTag === t ? "" : t;
    setActiveTag(next);
    pushSearch({ tag: next });
  }

  function toggleFilter(f: string) {
    const next = activeFilter === f ? "" : f;
    setActiveFilter(next);
    pushSearch({ filter: next });
  }

  // Sync from server re-render
  useEffect(() => { setEmails(initialEmails); }, [initialEmails]);

  async function handleStar(ev: React.MouseEvent, emailId: string, current: boolean) {
    ev.preventDefault(); ev.stopPropagation();
    await fetch(`/api/empresa/mail/inbox/${emailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: !current }),
    });
    setEmails((list) => list.map((m) => m.id === emailId ? { ...m, isStarred: !current } : m));
  }

  const visible = selectedAccount
    ? emails.filter((e) => e.account.id === selectedAccount)
    : emails;

  const countAll = emails.length;
  const unreadAll = emails.filter((e) => !e.isRead).length;
  const hasActiveFilters = !!(q || dateFrom || dateTo || activeTag || activeFilter);

  return (
    <div>
      {/* Search + filter bar */}
      <div className="border-b border-white/[0.05] px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => handleQChange(e.target.value)}
              placeholder="Buscar por asunto, remitente, contenido..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/30 transition-all"
            />
            {q && (
              <button onClick={() => { setQ(""); pushSearch({ q: "" }); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${showFilters || hasActiveFilters ? "bg-[#1AA7F0]/10 border-[#1AA7F0]/25 text-[#1AA7F0]" : "border-white/[0.07] text-white/40 hover:text-white/70"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
            Filtros{hasActiveFilters ? " ·" : ""}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); pushSearch({ dateFrom: e.target.value }); }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs text-white/60 focus:outline-none focus:border-[#1AA7F0]/30"
              />
              <span className="text-white/20 text-xs">→</span>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); pushSearch({ dateTo: e.target.value }); }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs text-white/60 focus:outline-none focus:border-[#1AA7F0]/30"
              />
            </div>

            <div className="w-px h-4 bg-white/10" />

            {/* Quick filters */}
            {[["unread","No leídos"], ["starred","Destacados"]].map(([f, l]) => (
              <button key={f} onClick={() => toggleFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${activeFilter === f ? "bg-[#1AA7F0]/10 border-[#1AA7F0]/25 text-[#1AA7F0]" : "border-white/[0.07] text-white/40 hover:text-white/60"}`}>
                {l}
              </button>
            ))}

            <div className="w-px h-4 bg-white/10" />

            {/* Tags */}
            {ALL_TAGS.map((t) => (
              <button key={t} onClick={() => toggleTag(t)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${activeTag === t ? TAG_COLORS[t] : "border-white/[0.07] text-white/30 hover:text-white/60"}`}>
                {t}
              </button>
            ))}

            {hasActiveFilters && (
              <button onClick={() => {
                setQ(""); setDateFrom(""); setDateTo(""); setActiveTag(""); setActiveFilter("");
                startTransition(() => router.push(pathname));
              }} className="text-xs text-white/25 hover:text-white/60 transition-colors ml-auto">
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Account filter pills */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04] flex-wrap">
          <button onClick={() => setSelectedAccount(null)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${selectedAccount === null ? "bg-white/[0.08] text-white font-medium" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}>
            Todos
            <span className={`text-[10px] px-1 rounded-full ${selectedAccount === null ? "bg-white/15 text-white/70" : "bg-white/[0.06] text-white/30"}`}>{countAll}</span>
            {unreadAll > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#1AA7F0]" />}
          </button>
          {accounts.map((acc) => {
            const cnt = emails.filter((e) => e.account.id === acc.id).length;
            const unread = emails.filter((e) => e.account.id === acc.id && !e.isRead).length;
            const active = selectedAccount === acc.id;
            return (
              <button key={acc.id} onClick={() => setSelectedAccount(active ? null : acc.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${active ? acc.activeBg + " font-medium" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}>
                <span className={`w-2 h-2 rounded-full ${acc.dotColor}`} />
                <span className={active ? acc.badgeText : ""}>{acc.label}</span>
                <span className={`text-[10px] px-1 rounded-full ${active ? acc.badgeBg : "bg-white/[0.06] text-white/30"}`}>{cnt}</span>
                {unread > 0 && <span className={`w-1.5 h-1.5 rounded-full ${acc.dotColor}`} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Email rows */}
      {visible.length === 0 ? (
        <div className="text-center py-20 text-white/20 text-sm space-y-1">
          <p>{hasActiveFilters ? "Sin resultados para este filtro." : "No hay correos."}</p>
          {!hasActiveFilters && <p className="text-xs">El sync corre automáticamente al entrar.</p>}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {visible.map((email) => {
            const acc = colorMap[email.account.id];
            return (
              <Link key={email.id} href={`/empresa/correos/hub/${email.id}`}
                className={`flex items-start gap-0 pr-4 py-3.5 hover:bg-white/[0.03] transition-colors group relative ${!email.isRead ? "bg-[#1AA7F0]/[0.02]" : ""}`}>

                {/* Account color bar */}
                <div className={`w-0.5 self-stretch shrink-0 ${acc?.borderColor ?? "bg-white/10"}`} />

                <div className="flex items-start gap-3 flex-1 pl-3 min-w-0">
                  {/* Read dot */}
                  <div className="mt-1.5 flex-none w-3 flex justify-center">
                    <div className={`w-1.5 h-1.5 rounded-full ${!email.isRead ? "bg-[#1AA7F0]" : "bg-transparent"}`} />
                  </div>

                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5 ${acc?.badgeBg ?? "bg-white/[0.06]"} ${acc?.badgeText ?? "text-white/50"}`}>
                    {(email.fromName || email.fromEmail).charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-sm truncate ${!email.isRead ? "text-white font-medium" : "text-white/65"}`}>
                          {email.fromName || email.fromEmail}
                        </p>
                        {/* Client link */}
                        {email.clientMatch && (
                          <Link href={`/empresa/clientes/${email.clientMatch.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#C8A96E]/15 text-[#C8A96E] border border-[#C8A96E]/20 hover:bg-[#C8A96E]/25 shrink-0 transition-colors">
                            👤 {email.clientMatch.name}
                          </Link>
                        )}
                      </div>
                      <span className="text-white/25 text-xs shrink-0">{fmtDate(email.receivedAt)}</span>
                    </div>
                    <p className={`text-xs truncate mb-1 ${!email.isRead ? "text-white/80" : "text-white/45"}`}>
                      {email.subject ?? "(Sin asunto)"}
                    </p>
                    {email.aiSummary && (
                      <p className="text-white/28 text-xs truncate">{email.aiSummary}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {email.aiTags.filter((t) => t !== "general").slice(0, 3).map((tag) => (
                        <span key={tag} className={`px-1.5 py-0.5 text-[10px] rounded border ${TAG_COLORS[tag] ?? TAG_COLORS.general}`}>{tag}</span>
                      ))}
                      {email._count.attachments > 0 && (
                        <span className="text-white/25 text-[10px] flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {email._count.attachments}
                        </span>
                      )}
                      {acc && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${acc.badgeBg} ${acc.badgeText} opacity-60`}>{acc.label}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Star */}
                <button onClick={(e) => handleStar(e, email.id, email.isStarred)}
                  className={`mt-1.5 ml-2 flex-none transition-all ${email.isStarred ? "text-amber-400" : "text-white/15 opacity-0 group-hover:opacity-100 hover:text-amber-400"}`}>
                  <svg className="w-4 h-4" fill={email.isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
