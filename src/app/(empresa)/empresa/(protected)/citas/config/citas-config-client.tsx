"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Availability = { weekday: number; startTime: string; endTime: string };
type MailAccountOption = { id: string; label: string; username: string };

export function CitasConfigClient() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bookingAutoLead, setBookingAutoLead] = useState(true);
  const [signingMailAccountId, setSigningMailAccountId] = useState<string>("");
  const [mailAccounts, setMailAccounts] = useState<MailAccountOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/empresa/booking-settings")
      .then((r) => r.json())
      .then((d) => {
        setAvailability(d.availability ?? []);
        setBookingAutoLead(d.bookingAutoLead ?? true);
        setSigningMailAccountId(d.signingMailAccountId ?? "");
        setMailAccounts(d.mailAccounts ?? []);
      })
      .catch(() => {});
  }, []);

  function updateSlot(weekday: number, field: "startTime" | "endTime", value: string) {
    setAvailability((prev) => {
      const existing = prev.find((a) => a.weekday === weekday);
      if (existing) {
        return prev.map((a) => (a.weekday === weekday ? { ...a, [field]: value } : a));
      }
      return [...prev, { weekday, startTime: field === "startTime" ? value : "09:00", endTime: field === "endTime" ? value : "17:00" }];
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/empresa/booking-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability,
          bookingAutoLead,
          signingMailAccountId: signingMailAccountId || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setMsg("Guardado");
    } catch {
      setMsg("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/empresa/citas" className="text-white/50 text-sm hover:text-white/70">← Citas</Link>
        <h1 className="text-white text-2xl font-semibold mt-2">Configuración de citas</h1>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={bookingAutoLead} onChange={(e) => setBookingAutoLead(e.target.checked)} />
        Crear o vincular lead automáticamente desde citas públicas
      </label>

      <div className="space-y-2">
        <label className="block text-white/50 text-xs uppercase tracking-widest">
          Cuenta de correo para firmas y citas
        </label>
        <select
          value={signingMailAccountId}
          onChange={(e) => setSigningMailAccountId(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm"
        >
          <option value="">Predeterminada (primera cuenta SMTP)</option>
          {mailAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} ({a.username})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h2 className="text-white/50 text-xs uppercase tracking-widest">Horario semanal</h2>
        {[1, 2, 3, 4, 5].map((weekday) => {
          const row = availability.find((a) => a.weekday === weekday) ?? {
            weekday,
            startTime: "09:00",
            endTime: "17:00",
          };
          return (
            <div key={weekday} className="flex items-center gap-3 text-sm">
              <span className="w-10 text-white/50">{WEEKDAYS[weekday]}</span>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => updateSlot(weekday, "startTime", e.target.value)}
                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white"
              />
              <span className="text-white/30">—</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => updateSlot(weekday, "endTime", e.target.value)}
                className="bg-white/[0.03] border border-white/10 rounded px-2 py-1 text-white"
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="px-5 py-2.5 bg-[#C8A96E] text-[#030611] font-semibold rounded-lg disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
      {msg ? <p className="text-sm text-white/50">{msg}</p> : null}
    </div>
  );
}
