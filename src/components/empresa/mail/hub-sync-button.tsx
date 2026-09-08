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
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald2/10 border border-emerald2/20 hover:bg-emerald2/15 disabled:opacity-40 text-ok rounded-lg transition-all"
      >
        {syncing === "backfill" ? (
          <span className="w-3 h-3 border border-emerald2/30 border-t-emerald-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {results.backfill ? (
          <span className={results.backfill.startsWith("Error") ? "text-danger" : "text-ok"}>
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-fill border border-line hover:bg-fill-2 disabled:opacity-40 text-fg-dim rounded-lg transition-all"
        >
          {syncing ? (
            <span className="w-3 h-3 border border-line-loud border-t-fg-dim rounded-full animate-spin" />
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand/[0.06] border border-brand/20 hover:bg-brand/[0.12] disabled:opacity-40 text-brand-fg rounded-lg transition-all"
          >
            {syncing === acc.id ? (
              <span className="w-3 h-3 border border-brand/30 border-t-[#1AA7F0] rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {results[acc.id] ? (
              <span className={results[acc.id].startsWith("Error") ? "text-danger" : "text-ok"}>
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
            className="px-2 py-1.5 text-[10px] bg-warn/10 border border-warn/20 hover:bg-warn/15 disabled:opacity-40 text-warn rounded-lg transition-all"
          >
            HTML
          </button>
        </div>
      ))}
    </div>
  );
}
