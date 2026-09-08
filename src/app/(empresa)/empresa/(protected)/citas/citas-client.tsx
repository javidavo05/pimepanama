"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Booking = {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  startTime: string;
  endTime: string;
  status: string;
  eventType: { title: string };
  lead: { id: string; name: string } | null;
};

export function CitasClient() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/empresa/bookings");
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  async function cancel(id: string) {
    if (!confirm("¿Cancelar esta cita?")) return;
    await fetch(`/api/empresa/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-semibold">Citas</h1>
          <p className="text-fg-faint text-sm mt-1">Reservas de PimeBook</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/empresa/citas/config"
            className="px-4 py-2 border border-line-mid text-fg-mute text-sm rounded-lg hover:border-line-loud"
          >
            Configurar
          </Link>
          <a
            href="/agendar"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-sand text-on-accent text-sm font-semibold rounded-lg"
          >
            Ver página pública
          </a>
        </div>
      </div>

      {loading ? (
        <p className="text-fg-faint text-sm">Cargando…</p>
      ) : bookings.length === 0 ? (
        <p className="text-fg-faint text-sm">Sin citas aún.</p>
      ) : (
        <div className="bg-panel border border-line rounded-xl divide-y divide-line">
          {bookings.map((b) => (
            <div key={b.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-fg font-medium">{b.attendeeName}</p>
                <p className="text-fg-faint text-sm">{b.eventType.title} · {b.attendeeEmail}</p>
                <p className="text-fg-ghost text-xs mt-1">
                  {new Date(b.startTime).toLocaleString("es-PA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {b.lead ? (
                  <Link href={`/empresa/leads/${b.lead.id}`} className="text-brand-fg text-xs hover:underline">
                    Lead: {b.lead.name}
                  </Link>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    b.status === "CONFIRMED"
                      ? "text-ok border-green-500/30"
                      : "text-fg-ghost border-line-mid"
                  }`}
                >
                  {b.status}
                </span>
                {b.status === "CONFIRMED" ? (
                  <button
                    type="button"
                    onClick={() => cancel(b.id)}
                    className="text-xs text-danger hover:text-danger-soft"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
