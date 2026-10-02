"use client";

import { useState } from "react";
import Link from "@/components/empresa/link";
import { useRouter } from "next/navigation";
import { ActionRow, btn, tile } from "@/components/empresa/page-header";

interface HubSyncButtonProps {
  accounts: { id: string; label: string }[];
  onCompose: () => void;
}

const SYNC_ICON =
  "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15";

function Spinner() {
  return <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />;
}

function SyncIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={SYNC_ICON} />
    </svg>
  );
}

/**
 * Acciones de la bandeja: Redactar, Sincronizar y «Más». Antes eran hasta diez
 * botones de tamaños y colores distintos en la cabecera; en el celular ocupaban
 * media pantalla. Las herramientas de mantenimiento (recuperar enviados,
 * sincronizar una cuenta, recuperar HTML) viven ahora dentro de «Más».
 */
export function HubSyncButton({ accounts, onCompose }: HubSyncButtonProps) {
  const router = useRouter();
  const [toolsOpen, setToolsOpen] = useState(false);
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

      const analyzed = await analyzePending(id, `+${data.fetched}${htmlPart}`);
      const aiPart = analyzed > 0 ? ` · ${analyzed} analizados` : "";

      setResults((r) => ({ ...r, [id]: `+${data.fetched}${htmlPart}${aiPart}` }));
      router.refresh();
    } catch {
      setResults((r) => ({ ...r, [id]: "Error de red" }));
    } finally {
      setSyncing(null);
    }
  }

  /**
   * Analiza con IA lo que quedó sin resumen, por tandas. Un fallo aquí no
   * tumba el sync: el correo ya se bajó y se reintenta en el próximo.
   */
  async function analyzePending(id: string, prefix: string): Promise<number> {
    let total = 0;
    setResults((r) => ({ ...r, [id]: `${prefix} · analizando…` }));
    for (let round = 0; round < 12; round++) {
      try {
        const res = await fetch(`/api/empresa/mail/accounts/${id}/analyze`, { method: "POST" });
        if (!res.ok) break;
        const data: { analyzed: number; remaining: number } = await res.json();
        total += data.analyzed;
        if (data.remaining === 0 || data.analyzed === 0) break;
        setResults((r) => ({ ...r, [id]: `${prefix} · analizando, faltan ${data.remaining}` }));
      } catch {
        break;
      }
    }
    return total;
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

  const lastResult = Object.entries(results).find(([key, value]) => key !== "backfill" && value)?.[1];

  return (
    <div className="relative w-full sm:w-auto">
      <ActionRow>
        <button type="button" onClick={onCompose} className={btn.primary}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Redactar
        </button>
        {accounts.length > 0 && (
          <button
            type="button"
            onClick={syncAll}
            disabled={syncing !== null}
            title={lastResult || "Bajar los correos nuevos de todas las cuentas"}
            className={btn.secondary}
          >
            {syncing && syncing !== "backfill" ? <Spinner /> : <SyncIcon />}
            {syncing && syncing !== "backfill" ? "Sincronizando" : "Sincronizar"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          aria-expanded={toolsOpen}
          aria-controls="hub-mail-tools"
          className={btn.secondary}
        >
          Más
          <svg className={`w-4 h-4 transition-transform ${toolsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </ActionRow>

      {toolsOpen && (
        <div
          id="hub-mail-tools"
          className="mt-2 sm:absolute sm:right-0 sm:top-full sm:z-30 sm:w-96 bg-pop border border-line-mid rounded-xl shadow-2xl p-3 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <Link href="/empresa/correos/cuentas" className={tile.neutral}>
              Cuentas
            </Link>
            <Link href="/empresa/correos" className={tile.neutral}>
              Archivados
            </Link>
          </div>

          {accounts.length > 0 && (
            <>
              <button
                type="button"
                onClick={backfillSent}
                disabled={syncing !== null}
                title="Importar historial de enviados desde el servidor de correo (últimos 90 días)"
                className={`${tile.neutral} w-full`}
              >
                {syncing === "backfill" ? <Spinner /> : null}
                {results.backfill ? (
                  <span className={results.backfill.startsWith("Error") ? "text-danger" : "text-ok"}>{results.backfill}</span>
                ) : (
                  "Recuperar enviados (90 días)"
                )}
              </button>

              <div className="space-y-2">
                <p className="text-fg-faint text-xs uppercase tracking-widest font-medium">Por cuenta</p>
                {accounts.map((acc) => (
                  <div key={acc.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => syncAccount(acc.id)}
                      disabled={syncing !== null}
                      className={`${tile.neutral} justify-start min-w-0`}
                    >
                      {syncing === acc.id ? <Spinner /> : <SyncIcon />}
                      <span className="truncate">
                        {results[acc.id] ? (
                          <span className={results[acc.id].startsWith("Error") ? "text-danger" : "text-ok"}>
                            {acc.label}: {results[acc.id]}
                          </span>
                        ) : (
                          acc.label
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => resyncBodiesOnly(acc.id)}
                      disabled={syncing !== null}
                      title="Recuperar HTML de correos guardados como texto"
                      aria-label={`Recuperar HTML de ${acc.label}`}
                      className={tile.neutral}
                    >
                      HTML
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
