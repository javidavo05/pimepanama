"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tile } from "@/components/empresa/page-header";

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

  // Celular: cinco botones iguales en dos filas (grid de 3 columnas), a lo
  // ancho de la tarjeta. Desde tablet, una sola fila compacta.
  return (
    <div className="w-full lg:w-auto space-y-2">
      {testResult && (
        <p className={`text-xs ${testResult.startsWith("✓") ? "text-ok" : "text-danger"}`}>{testResult}</p>
      )}
      <div className="grid grid-cols-3 gap-2 lg:flex">
        <button onClick={handleTest} disabled={testing} className={tile.neutral}>
          {testing ? "Probando…" : "Probar"}
        </button>
        <button onClick={handleSync} disabled={syncing} className={tile.neutral}>
          {syncing ? "Sincronizando…" : "Sincronizar"}
        </button>
        <button onClick={handleResyncBodies} disabled={syncing} title="Recuperar HTML de correos guardados como texto" className={tile.neutral}>
          HTML
        </button>
        <Link href={`/empresa/correos/cuentas/${accountId}`} className={tile.neutral}>
          Editar
        </Link>
        <button onClick={handleDelete} className={`${tile.danger} col-span-2`}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
