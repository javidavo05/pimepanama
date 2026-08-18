"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEmailReceivedAt } from "@/lib/format-datetime";
import { MailDeliveryStatusBadge } from "@/components/empresa/mail/mail-delivery-status";

type ThreadMessage = {
  id: string;
  folder: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string;
  toAddresses: string[];
  bodyPreview: string | null;
  receivedAt: string;
  deliveryStatus: string | null;
  resendId: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  bouncedAt: string | null;
  bounceReason: string | null;
  accountLabel: string;
  isCurrent: boolean;
};

type ThreadSummary = {
  sent: number;
  received: number;
  delivered: number;
  opened: number;
  bounced: number;
  pending: number;
};

function deliveryBadge(msg: ThreadMessage) {
  return (
    <MailDeliveryStatusBadge
      email={{
        folder: msg.folder,
        deliveryStatus: msg.deliveryStatus,
        resendId: msg.resendId,
        bounceReason: msg.bounceReason,
      }}
    />
  );
}

export function EmailThreadPanel({
  emailId,
  refreshKey = 0,
}: {
  emailId: string;
  refreshKey?: number;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [summary, setSummary] = useState<ThreadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((msg) => {
      const haystack = [
        msg.subject,
        msg.fromName,
        msg.fromEmail,
        msg.toAddresses.join(" "),
        msg.bodyPreview,
        msg.accountLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [messages, searchQuery]);

  const loadThread = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/mail/inbox/${emailId}/thread`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cargar la conversación");
        return;
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    loadThread();
  }, [loadThread, refreshKey]);

  useEffect(() => {
    if (!summary?.pending) return;
    const timer = setInterval(() => {
      loadThread();
    }, 5000);
    return () => clearInterval(timer);
  }, [summary?.pending, loadThread]);

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
          Conversación
        </h3>
        <button
          type="button"
          onClick={loadThread}
          disabled={loading}
          className="text-[10px] text-white/45 hover:text-white/70 disabled:opacity-40"
        >
          Actualizar
        </button>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {summary.received} recibido{summary.received !== 1 ? "s" : ""}
          </span>
          <span className="px-2 py-1 rounded bg-[#1AA7F0]/10 text-[#1AA7F0] border border-[#1AA7F0]/20">
            {summary.sent} enviado{summary.sent !== 1 ? "s" : ""}
          </span>
          {summary.delivered > 0 && (
            <span className="px-2 py-1 rounded bg-white/[0.04] text-white/55 border border-white/[0.08]">
              {summary.delivered} entregado{summary.delivered !== 1 ? "s" : ""}
            </span>
          )}
          {summary.opened > 0 && (
            <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
              {summary.opened} abierto{summary.opened !== 1 ? "s" : ""}
            </span>
          )}
          {summary.pending > 0 && (
            <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-200/80 border border-amber-500/20">
              {summary.pending} pendiente{summary.pending !== 1 ? "s" : ""}
            </span>
          )}
          {summary.bounced > 0 && (
            <span className="px-2 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/20">
              {summary.bounced} rebote{summary.bounced !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {loading && <p className="text-white/45 text-sm">Cargando hilo…</p>}
      {error && <p className="text-red-400/80 text-sm">{error}</p>}

      {!loading && !error && messages.length <= 1 && (
        <p className="text-white/45 text-sm">
          Solo hay un mensaje en este hilo. Si acabas de responder, pulsa{" "}
          <strong className="text-white/60">Actualizar</strong>.
        </p>
      )}

      {messages.length > 1 && (
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en esta conversación…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 pl-8 text-xs text-white/80 placeholder:text-white/35 focus:border-[#1AA7F0]/40 focus:outline-none focus:ring-1 focus:ring-[#1AA7F0]/30"
            aria-label="Buscar en esta conversación"
          />
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </div>
      )}

      {searchQuery.trim() && filteredMessages.length === 0 && !loading && (
        <p className="text-white/45 text-sm">Ningún mensaje coincide con «{searchQuery.trim()}».</p>
      )}

      <div className="space-y-2">
        {filteredMessages.map((msg) => {
          const isSent = msg.folder === "SENT";
          const border = isSent ? "border-l-[#1AA7F0]" : "border-l-emerald-400";
          const bg = msg.isCurrent
            ? isSent
              ? "bg-[#1AA7F0]/[0.06]"
              : "bg-emerald-500/[0.06]"
            : "bg-white/[0.02]";

          return (
            <div
              key={msg.id}
              className={`border-l-4 ${border} ${bg} rounded-r-lg px-3 py-2.5 transition-colors`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/80">
                    {isSent ? "Tú enviaste" : "Recibiste"} · {msg.accountLabel}
                  </p>
                  <p className="text-[11px] text-white/50 truncate">
                    {isSent
                      ? `Para ${msg.toAddresses.join(", ")}`
                      : `De ${msg.fromName ? `${msg.fromName} <${msg.fromEmail}>` : msg.fromEmail}`}
                  </p>
                </div>
                <span className="text-[10px] text-white/40 shrink-0">
                  {formatEmailReceivedAt(msg.receivedAt)}
                </span>
              </div>
              <p className="text-xs text-white/65 truncate mb-1">{msg.subject ?? "(Sin asunto)"}</p>
              {msg.bodyPreview && (
                <p className="text-[11px] text-white/45 line-clamp-2 mb-1.5 leading-relaxed">
                  {msg.bodyPreview}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {deliveryBadge(msg)}
                {!msg.isCurrent && (
                  <Link
                    href={`/empresa/correos/hub/${msg.id}`}
                    className="text-[10px] text-[#1AA7F0] hover:underline"
                  >
                    Ver mensaje
                  </Link>
                )}
                {msg.isCurrent && (
                  <span className="text-[10px] text-white/40">Viendo ahora</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-white/35 leading-relaxed border-t border-white/[0.06] pt-3">
        Tracking vía Resend: enviado → entregado → abierto. Configura el webhook en Resend Dashboard
        apuntando a /api/webhooks/resend.
      </p>
    </div>
  );
}
