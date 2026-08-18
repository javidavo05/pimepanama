"use client";

import { useEffect, useRef, useState } from "react";

export function AutoSyncOnMount({ accountIds }: { accountIds: string[] }) {
  const ran = useRef(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (ran.current || accountIds.length === 0) return;
    ran.current = true;
    setSyncing(true);
    Promise.all(
      accountIds.map((id) =>
        fetch(`/api/empresa/mail/accounts/${id}/sync`, { method: "POST" })
          .then((r) => r.json())
          .catch(() => ({ fetched: 0 }))
      )
    ).then((results) => {
      const total = results.reduce((s: number, r) => s + (r.fetched ?? 0), 0);
      setSyncing(false);
      if (total > 0) window.location.reload();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!syncing) return null;

  return (
    <span className="flex items-center gap-1.5 text-white/55 text-xs">
      <span className="w-2.5 h-2.5 border border-white/20 border-t-white/50 rounded-full animate-spin" />
      Sincronizando…
    </span>
  );
}
