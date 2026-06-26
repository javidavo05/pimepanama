"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  emailId?: string;
}

export function NotificationBell() {
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

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await fetch("/api/empresa/mail/notifications", { method: "PATCH" });
      setUnread(0);
      setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-1.5 text-white/30 hover:text-white/70 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#0d0d18] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-white/70 text-sm font-medium">Notificaciones</p>
            <Link href="/empresa/correos/hub" className="text-[#1AA7F0] text-xs hover:underline" onClick={() => setOpen(false)}>
              Ver bandeja
            </Link>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/25 text-sm">Sin notificaciones</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.emailId ? `/empresa/correos/hub/${n.emailId}` : "/empresa/correos/hub"}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${!n.read ? "bg-[#1AA7F0]/[0.04]" : ""}`}
                >
                  <p className="text-white/80 text-xs font-medium leading-snug">{n.title}</p>
                  <p className="text-white/35 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-white/20 text-[10px] mt-1">{new Date(n.createdAt).toLocaleString("es-PA")}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
