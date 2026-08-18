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
          <h1 className="text-white text-2xl font-semibold">Citas</h1>
          <p className="text-white/50 text-sm mt-1">Reservas de PimeBook</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/empresa/citas/config"
            className="px-4 py-2 border border-white/10 text-white/70 text-sm rounded-lg hover:border-white/20"
          >
            Configurar
          </Link>
          <a
            href="/agendar"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-[#C8A96E] text-[#030611] text-sm font-semibold rounded-lg"
          >
            Ver página pública
          </a>
        </div>
      </div>

      {loading ? (
        <p className="text-white/45 text-sm">Cargando…</p>
      ) : bookings.length === 0 ? (
        <p className="text-white/45 text-sm">Sin citas aún.</p>
      ) : (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
          {bookings.map((b) => (
            <div key={b.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-white font-medium">{b.attendeeName}</p>
                <p className="text-white/50 text-sm">{b.eventType.title} · {b.attendeeEmail}</p>
                <p className="text-white/40 text-xs mt-1">
                  {new Date(b.startTime).toLocaleString("es-PA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {b.lead ? (
                  <Link href={`/empresa/leads/${b.lead.id}`} className="text-[#1AA7F0] text-xs hover:underline">
                    Lead: {b.lead.name}
                  </Link>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    b.status === "CONFIRMED"
                      ? "text-green-400 border-green-500/30"
                      : "text-white/40 border-white/10"
                  }`}
                >
                  {b.status}
                </span>
                {b.status === "CONFIRMED" ? (
                  <button
                    type="button"
                    onClick={() => cancel(b.id)}
                    className="text-xs text-red-400 hover:text-red-300"
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
