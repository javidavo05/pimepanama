"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDateTimeEsPa } from "@/lib/format-datetime";
import { PushToggle } from "@/components/empresa/push-toggle";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  emailId?: string;
  link?: string | null;
}

/** Los avisos llegan con prefijo de prioridad en el título; lo mostramos como chip. */
const PRIORITY_PREFIXES = [
  { label: "Urgente", match: /^urgente:\s*/i, className: "bg-danger/15 text-danger-soft border-danger/25" },
  { label: "Atención", match: /^atenci[oó]n:\s*/i, className: "bg-warn/15 text-warn-soft border-warn/25" },
];

function splitPriority(title: string) {
  for (const p of PRIORITY_PREFIXES) {
    if (p.match.test(title)) {
      return { tag: p, text: title.replace(p.match, "") };
    }
  }
  return { tag: null, text: title };
}

// ── Un solo sondeo por pestaña ──────────────────────────────────────────────
// La campana se monta dos veces (columna de escritorio y barra del celular, una
// oculta por CSS) y antes cada una consultaba cada minuto, también con la
// pestaña en segundo plano: ~2.900 funciones al día por pestaña abierta. Los
// avisos nacen del cron mail-watch (cada 10 min) y los urgentes llegan además
// por push, así que basta con consultar cada 5 min mientras la pestaña se ve,
// y al volver a ella si lo último tiene más de un minuto.
const POLL_MS = 5 * 60_000;
const STALE_MS = 60_000;

type BellSnapshot = { unread: number; notifications: Notification[] };

let snapshot: BellSnapshot = { unread: 0, notifications: [] };
let lastFetch = 0;
let inflight: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(s: BellSnapshot) => void>();

function publish(next: BellSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l(next));
}

function fetchNotifications() {
  if (inflight) return inflight;
  lastFetch = Date.now();
  inflight = (async () => {
    try {
      const res = await fetch("/api/empresa/mail/notifications");
      if (!res.ok) return;
      const data = await res.json();
      publish({ unread: data.unreadCount ?? 0, notifications: data.notifications ?? [] });
    } catch { /* silent */ } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function refreshIfStale() {
  if (document.visibilityState === "visible" && Date.now() - lastFetch > STALE_MS) {
    void fetchNotifications();
  }
}

function subscribe(listener: (s: BellSnapshot) => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (Date.now() - lastFetch > STALE_MS) void fetchNotifications();
    timer = setInterval(() => {
      if (document.visibilityState === "visible") void fetchNotifications();
    }, POLL_MS);
    document.addEventListener("visibilitychange", refreshIfStale);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", refreshIfStale);
    }
  };
}

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [{ unread, notifications }, setSnapshot] = useState<BellSnapshot>(snapshot);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => subscribe(setSnapshot), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleOpen(e: React.MouseEvent) {
    // La campana del sidebar vive dentro de un <Link>: sin esto, abrirla navega.
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await fetch("/api/empresa/mail/notifications", { method: "PATCH" });
      publish({ unread: 0, notifications: snapshot.notifications.map((x) => ({ ...x, read: true })) });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        className="relative w-11 h-11 -m-2 inline-flex items-center justify-center rounded-lg text-fg-dim hover:text-fg-mute transition-colors"
      >
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger-solid rounded-full text-[9px] text-on-solid font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${align === "left" ? "left-0" : "right-0"} mt-2 w-[22rem] max-w-[calc(100vw-24px)] flex flex-col max-h-[min(32rem,calc(100vh-6rem))] bg-pop border border-line rounded-xl shadow-2xl z-50 overflow-hidden`}
        >
          <div className="shrink-0 px-4 py-3 border-b border-line flex items-center justify-between gap-3">
            <p className="text-fg-mute text-sm font-medium">Notificaciones</p>
            <Link href="/empresa/correos/hub" className="text-brand-fg text-xs hover:underline" onClick={() => setOpen(false)}>
              Ver bandeja
            </Link>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-fg-faint text-sm">Sin notificaciones</div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? (n.emailId ? `/empresa/correos/hub/${n.emailId}` : "/empresa/correos/hub")}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 border-b border-line hover:bg-fill transition-colors ${!n.read ? "bg-brand/[0.06]" : ""}`}
                >
                  {(() => {
                    const { tag, text } = splitPriority(n.title);
                    return (
                      <>
                        {tag && (
                          <span
                            className={`inline-block mb-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${tag.className}`}
                          >
                            {tag.label}
                          </span>
                        )}
                        <p className="text-fg text-sm font-medium leading-snug line-clamp-2 break-words">{text}</p>
                      </>
                    );
                  })()}
                  <p className="text-fg-mute text-xs leading-relaxed mt-1 line-clamp-2 break-words">{n.body}</p>
                  <p className="text-fg-faint text-[11px] mt-1">{formatDateTimeEsPa(n.createdAt)}</p>
                </Link>
              ))}
            </div>
          )}

          <div className="shrink-0 border-t border-line">
            <PushToggle />
          </div>
        </div>
      )}
    </div>
  );
}
