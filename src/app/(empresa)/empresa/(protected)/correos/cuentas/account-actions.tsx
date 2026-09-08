"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AccountActions({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleResyncBodies() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/empresa/mail/accounts/${accountId}/resync-bodies`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`HTML recuperado en ${data.upgraded} de ${data.scanned} correos.`);
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/empresa/mail/accounts/${accountId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      const bodyRes = await fetch(`/api/empresa/mail/accounts/${accountId}/resync-bodies`, { method: "POST" });
      const bodyData = bodyRes.ok ? await bodyRes.json() : null;
      const htmlMsg = bodyData?.upgraded > 0 ? ` · ${bodyData.upgraded} con HTML recuperado` : "";
      alert(`Sincronizado. ${data.fetched} correos nuevos${htmlMsg}.`);
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/empresa/mail/accounts/${accountId}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data.ok ? `✓ Conexión OK — ${data.folders?.length ?? 0} carpetas` : `✗ ${data.error}`);
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta cuenta y todos sus correos?")) return;
    await fetch(`/api/empresa/mail/accounts/${accountId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {testResult && (
        <span className={`text-xs ${testResult.startsWith("✓") ? "text-ok" : "text-danger"}`}>{testResult}</span>
      )}
      <button onClick={handleTest} disabled={testing}
        className="px-3 py-1.5 text-xs bg-fill border border-line hover:bg-fill-2 disabled:opacity-40 text-fg-dim rounded-lg transition-all">
        {testing ? "..." : "Probar"}
      </button>
      <button onClick={handleSync} disabled={syncing}
        className="px-3 py-1.5 text-xs bg-fill border border-line hover:bg-fill-2 disabled:opacity-40 text-fg-dim rounded-lg transition-all">
        {syncing ? "Sync..." : "Sincronizar"}
      </button>
      <button onClick={handleResyncBodies} disabled={syncing}
        className="px-3 py-1.5 text-xs bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 disabled:opacity-40 text-warn/80 rounded-lg transition-all">
        Recuperar HTML
      </button>
      <Link href={`/empresa/correos/cuentas/${accountId}`}
        className="px-3 py-1.5 text-xs bg-fill border border-line hover:bg-fill-2 text-fg-dim rounded-lg transition-all">
        Editar
      </Link>
      <button onClick={handleDelete}
        className="px-3 py-1.5 text-xs border border-red-500/20 hover:bg-red-500/10 text-danger/60 hover:text-danger rounded-lg transition-all">
        Eliminar
      </button>
    </div>
  );
}
