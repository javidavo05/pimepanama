"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AccountActions({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/empresa/mail/accounts/${accountId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Sincronizado. ${data.fetched} correos nuevos.`);
        router.refresh();
      }
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
        <span className={`text-xs ${testResult.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{testResult}</span>
      )}
      <button onClick={handleTest} disabled={testing}
        className="px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] disabled:opacity-40 text-white/60 rounded-lg transition-all">
        {testing ? "..." : "Probar"}
      </button>
      <button onClick={handleSync} disabled={syncing}
        className="px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] disabled:opacity-40 text-white/60 rounded-lg transition-all">
        {syncing ? "Sync..." : "Sincronizar"}
      </button>
      <Link href={`/empresa/correos/cuentas/${accountId}`}
        className="px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] text-white/60 rounded-lg transition-all">
        Editar
      </Link>
      <button onClick={handleDelete}
        className="px-3 py-1.5 text-xs border border-red-500/20 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 rounded-lg transition-all">
        Eliminar
      </button>
    </div>
  );
}
