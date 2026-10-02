"use client";

import { useEffect, useState } from "react";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";

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
        <Link
          href="/empresa/citas"
          className="inline-flex items-center min-h-11 sm:min-h-8 text-fg-faint text-sm hover:text-fg-mute"
        >
          ← Citas
        </Link>
        <h1 className="text-fg text-2xl font-semibold mt-2">Configuración de citas</h1>
      </div>

      <label className="flex items-center gap-2 min-h-11 sm:min-h-8 text-sm text-fg-mute">
        <input type="checkbox" checked={bookingAutoLead} onChange={(e) => setBookingAutoLead(e.target.checked)} />
        Crear o vincular lead automáticamente desde citas públicas
      </label>

      <div className="space-y-2">
        <label className="block text-fg-faint text-xs uppercase tracking-widest">
          Cuenta de correo para firmas y citas
        </label>
        <select
          value={signingMailAccountId}
          onChange={(e) => setSigningMailAccountId(e.target.value)}
          className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm"
        >
          <option value="">Primera cuenta SMTP</option>
          {mailAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} ({a.username})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-panel border border-line rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-fg-faint text-xs uppercase tracking-widest">Horario semanal</h2>
        {[1, 2, 3, 4, 5].map((weekday) => {
          const row = availability.find((a) => a.weekday === weekday) ?? {
            weekday,
            startTime: "09:00",
            endTime: "17:00",
          };
          return (
            // En el celular, el día va arriba y las dos horas debajo en columnas
            // iguales a lo ancho: al lado del día, «09:00 AM» no entraba.
            <div
              key={weekday}
              className="grid grid-cols-2 items-center gap-2 sm:flex sm:gap-3 text-sm"
            >
              <span className="col-span-2 sm:w-10 text-fg-faint">{WEEKDAYS[weekday]}</span>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => updateSlot(weekday, "startTime", e.target.value)}
                className="w-full min-w-0 min-h-11 sm:w-auto sm:min-w-28 sm:min-h-8 bg-fill border border-line-mid rounded px-2 py-1 text-fg"
              />
              <span className="hidden sm:inline text-fg-ghost">—</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => updateSlot(weekday, "endTime", e.target.value)}
                className="w-full min-w-0 min-h-11 sm:w-auto sm:min-w-28 sm:min-h-8 bg-fill border border-line-mid rounded px-2 py-1 text-fg"
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className={`${btn.accent} w-full sm:w-auto`}
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
      {msg ? <p className="text-sm text-fg-faint">{msg}</p> : null}
    </div>
  );
}
