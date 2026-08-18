"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HubSyncButtonProps {
  accounts: { id: string; label: string }[];
}

export function HubSyncButton({ accounts }: HubSyncButtonProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<string | null>(null); // accountId being synced
  const [results, setResults] = useState<Record<string, string>>({});

  async function syncAccount(id: string) {
    setSyncing(id);
    setResults((r) => ({ ...r, [id]: "" }));
    try {
      const res = await fetch(`/api/empresa/mail/accounts/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setResults((r) => ({ ...r, [id]: `Error: ${data.error}` }));
        return;
      }

      const bodyRes = await fetch(`/api/empresa/mail/accounts/${id}/resync-bodies`, { method: "POST" });
      const bodyData = bodyRes.ok ? await bodyRes.json() : null;
      const htmlPart =
        bodyData?.upgraded > 0 ? ` · ${bodyData.upgraded} HTML` : "";

      setResults((r) => ({ ...r, [id]: `+${data.fetched}${htmlPart}` }));
      router.refresh();
    } catch {
      setResults((r) => ({ ...r, [id]: "Error de red" }));
    } finally {
      setSyncing(null);
    }
  }

  async function resyncBodiesOnly(id: string) {
    setSyncing(id);
    setResults((r) => ({ ...r, [id]: "" }));
    try {
      const res = await fetch(`/api/empresa/mail/accounts/${id}/resync-bodies`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setResults((r) => ({ ...r, [id]: `Error: ${data.error}` }));
      } else {
        setResults((r) => ({
          ...r,
          [id]: data.upgraded > 0 ? `${data.upgraded} HTML` : "0 HTML",
        }));
        router.refresh();
      }
    } catch {
      setResults((r) => ({ ...r, [id]: "Error de red" }));
    } finally {
      setSyncing(null);
    }
  }

  async function syncAll() {
    for (const acc of accounts) {
      await syncAccount(acc.id);
    }
  }

  async function backfillSent() {
    setSyncing("backfill");
    setResults((r) => ({ ...r, backfill: "" }));
    try {
      const res = await fetch("/api/empresa/mail/backfill-sent", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setResults((r) => ({ ...r, backfill: `Error: ${data.error}` }));
        return;
      }
      setResults((r) => ({
        ...r,
        backfill: `+${data.totalFetched ?? 0} enviados (${data.sinceDays ?? 90}d)`,
      }));
      router.refresh();
    } catch {
      setResults((r) => ({ ...r, backfill: "Error de red" }));
    } finally {
      setSyncing(null);
    }
  }

  if (accounts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={backfillSent}
        disabled={syncing !== null}
        title="Importar historial de enviados desde el servidor de correo (últimos 90 días)"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 disabled:opacity-40 text-emerald-400/90 rounded-lg transition-all"
      >
        {syncing === "backfill" ? (
          <span className="w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {results.backfill ? (
          <span className={results.backfill.startsWith("Error") ? "text-red-400" : "text-green-400"}>
            {results.backfill}
          </span>
        ) : (
          "Recuperar enviados"
        )}
      </button>
      {accounts.length > 1 && (
        <button
          onClick={syncAll}
          disabled={syncing !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] disabled:opacity-40 text-white/60 rounded-lg transition-all"
        >
          {syncing ? (
            <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Sincronizar todo
        </button>
      )}

      {accounts.map((acc) => (
        <div key={acc.id} className="flex items-center gap-1">
          <button
            onClick={() => syncAccount(acc.id)}
            disabled={syncing !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1AA7F0]/[0.06] border border-[#1AA7F0]/20 hover:bg-[#1AA7F0]/[0.12] disabled:opacity-40 text-[#1AA7F0]/70 rounded-lg transition-all"
          >
            {syncing === acc.id ? (
              <span className="w-3 h-3 border border-[#1AA7F0]/30 border-t-[#1AA7F0] rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {results[acc.id] ? (
              <span className={results[acc.id].startsWith("Error") ? "text-red-400" : "text-green-400"}>
                {results[acc.id]}
              </span>
            ) : (
              acc.label
            )}
          </button>
          <button
            type="button"
            onClick={() => resyncBodiesOnly(acc.id)}
            disabled={syncing !== null}
            title="Recuperar HTML de correos guardados como texto"
            className="px-2 py-1.5 text-[10px] bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 disabled:opacity-40 text-amber-400/80 rounded-lg transition-all"
          >
            HTML
          </button>
        </div>
      ))}
    </div>
  );
}
