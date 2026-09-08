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

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/empresa/mail/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unreadCount ?? 0);
      setNotifications(data.notifications ?? []);
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

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
      setUnread(0);
      setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-1.5 text-fg-dim hover:text-fg-mute transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-solid rounded-full text-[9px] text-on-solid font-bold flex items-center justify-center leading-none">
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
