"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EventType = { slug: string; title: string; durationMin: number; description: string | null };
type Slot = { startTime: string; endTime: string; start: string; end: string };

export function AgendarClient({
  initialType,
  leadId,
  prefillEmail,
  prefillName,
}: {
  initialType?: string;
  leadId?: string;
  prefillEmail?: string;
  prefillName?: string;
}) {
  const [types, setTypes] = useState<EventType[]>([]);
  const [selectedType, setSelectedType] = useState(initialType || "consulta");
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/public/booking/event-types")
      .then((r) => r.json())
      .then((d) => {
        setTypes(d.eventTypes ?? []);
        if (d.eventTypes?.[0] && !initialType) setSelectedType(d.eventTypes[0].slug);
      })
      .catch(() => {});
  }, [initialType]);

  const dayRange = useMemo(() => {
    const from = new Date(`${selectedDay}T00:00:00`);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [selectedDay]);

  useEffect(() => {
    if (!selectedType) return;
    const q = new URLSearchParams({
      eventType: selectedType,
      from: dayRange.from,
      to: dayRange.to,
    });
    fetch(`/api/public/booking/slots?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots ?? []);
        setSelectedSlot(null);
      })
      .catch(() => setSlots([]));
  }, [selectedType, dayRange.from, dayRange.to]);

  async function submit() {
    if (!selectedSlot) {
      setError("Elige un horario.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: selectedType,
          startTime: selectedSlot.startTime,
          attendeeName: name,
          attendeeEmail: email,
          attendeePhone: phone || undefined,
          notes: notes || undefined,
          leadId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#030611] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl text-[#C8A96E]">✓</div>
          <h1 className="text-2xl font-semibold">Cita confirmada</h1>
          <p className="text-white/60 text-sm">Te enviamos un correo de confirmación a {email}.</p>
          <Link href="/" className="text-[#1AA7F0] text-sm hover:underline">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  const currentType = types.find((t) => t.slug === selectedType);

  return (
    <main className="min-h-screen bg-[#030611] text-white">
      <div className="max-w-xl mx-auto px-5 py-10 space-y-8">
        <div>
          <p className="text-[#1AA7F0] text-xs uppercase tracking-widest mb-2">PimeBook</p>
          <h1 className="text-3xl font-semibold">Agenda una consulta</h1>
          <p className="text-white/55 text-sm mt-2">Elige tipo, fecha y horario disponible.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-white/45">Tipo de cita</h2>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setSelectedType(t.slug)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  selectedType === t.slug
                    ? "border-[#C8A96E] bg-[#C8A96E]/10 text-[#C8A96E]"
                    : "border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                {t.title} · {t.durationMin} min
              </button>
            ))}
          </div>
          {currentType?.description ? <p className="text-white/45 text-sm">{currentType.description}</p> : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-white/45">Fecha</h2>
          <input
            type="date"
            value={selectedDay}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-white/45">Horario</h2>
          {slots.length === 0 ? (
            <p className="text-white/45 text-sm">Sin horarios disponibles este día.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.startTime}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`py-2 rounded-lg text-sm border ${
                    selectedSlot?.startTime === s.startTime
                      ? "border-[#1AA7F0] bg-[#1AA7F0]/10 text-[#1AA7F0]"
                      : "border-white/10 text-white/70 hover:border-white/20"
                  }`}
                >
                  {s.start}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 border-t border-white/10 pt-6">
          <h2 className="text-xs uppercase tracking-widest text-white/45">Tus datos</h2>
          <input
            placeholder="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white"
          />
          <input
            type="email"
            placeholder="Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white"
          />
          <input
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white"
          />
          <textarea
            placeholder="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white resize-none"
          />
          {error ? <p className="text-red-400 text-sm">{error}</p> : null}
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="w-full py-3 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] font-semibold rounded-lg"
          >
            {loading ? "Reservando…" : "Confirmar cita"}
          </button>
        </section>
      </div>
    </main>
  );
}
