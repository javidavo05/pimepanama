"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

type RSVPEntry = {
  id: string;
  name: string;
  guests: number;
  meal: string;
  message: string;
  timestamp: string;
};

const INITIAL_RSVPS: RSVPEntry[] = [
  { id: "r1", name: "Carmen & Felipe", guests: 2, meal: "Pollo", message: "¡Estamos emocionados de celebrar con ustedes!", timestamp: "hace 2 días" },
  { id: "r2", name: "Familia Rodríguez", guests: 4, meal: "Mixto", message: "Los queremos mucho. Ahí estaremos.", timestamp: "hace 3 días" },
  { id: "r3", name: "Ing. Marco Solís", guests: 1, meal: "Vegetariano", message: "Felicitaciones a la hermosa pareja.", timestamp: "hace 5 días" },
];

const PHOTOS = [
  { id: "ph1", author: "Tía Rosa", caption: "Sesión de fotos en Casco Viejo", time: "ayer" },
  { id: "ph2", author: "Carlos B.", caption: "La decoración quedó hermosa 💐", time: "hace 2 días" },
  { id: "ph3", author: "Ana María", caption: "El vestido 😍", time: "hace 3 días" },
];

type Tab = "rsvp" | "gallery" | "form";

export function WeddingSiteRSVP() {
  const [tab, setTab] = useState<Tab>("rsvp");
  const [rsvps, setRsvps] = useState(INITIAL_RSVPS);
  const [form, setForm] = useState({ name: "", guests: "1", meal: "chicken", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const totalGuests = rsvps.reduce((a, b) => a + b.guests, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const entry: RSVPEntry = {
      id: `r${Date.now()}`,
      name: form.name,
      guests: parseInt(form.guests),
      meal: form.meal === "chicken" ? "Pollo" : form.meal === "fish" ? "Pescado" : "Vegetariano",
      message: form.message,
      timestamp: "justo ahora",
    };
    setRsvps((prev) => [entry, ...prev]);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setTab("rsvp"); }, 2000);
  }

  return (
    <div className="space-y-5">
      {/* wedding card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#ec4899]/20 bg-gradient-to-br from-[#ec4899]/10 via-transparent to-[#8b5cf6]/8 p-5 text-center">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 10 C20 10 15 5 10 10 C5 15 10 20 20 30 C30 20 35 15 30 10 C25 5 20 10 20 10Z' fill='%23ec4899' fill-opacity='0.5'/%3E%3C/svg%3E\")" }}
        />
        <p className="text-[10px] uppercase tracking-[0.6em] text-[#f472b6]/60">Boda</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Valentina & Rodrigo</h2>
        <p className="mt-1 text-xs text-white/40">22 de Marzo, 2025 · Country Club de Panamá</p>
        <div className="mt-3 flex justify-center gap-6 text-[10px] text-white/40">
          <div className="text-center">
            <p className="text-xl font-bold text-[#f472b6]">{rsvps.length}</p>
            <p>respuestas</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{totalGuests}</p>
            <p>invitados</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-[#60A5FA]">127</p>
            <p>días</p>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        {(["rsvp", "gallery", "form"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSubmitted(false); }}
            className="relative flex-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-[0.3em] transition"
          >
            {tab === t && (
              <motion.div
                layoutId="ws-tab"
                className="absolute inset-0 rounded-xl bg-[#ec4899]/20"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${tab === t ? "text-[#f472b6]" : "text-white/40"}`}>
              {t === "rsvp" ? "Confirmaciones" : t === "gallery" ? "Galería" : "Mi RSVP"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "rsvp" && (
          <motion.div key="rsvp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {rsvps.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ec4899]/15 text-[#f472b6]">
                    <Icon icon="ph:heart" className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{r.name}</p>
                      <span className="text-[10px] text-white/25">{r.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-white/40">{r.guests} persona{r.guests > 1 ? "s" : ""} · {r.meal}</p>
                    {r.message && <p className="mt-1.5 text-xs italic text-white/35">"{r.message}"</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {tab === "gallery" && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/30">Fotos compartidas por invitados</p>
            {PHOTOS.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                <div className="h-16 w-20 shrink-0 rounded-xl bg-gradient-to-br from-[#ec4899]/20 via-[#8b5cf6]/15 to-transparent flex items-center justify-center">
                  <Icon icon="ph:image" className="h-6 w-6 text-white/20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.author}</p>
                  <p className="text-[10px] text-white/40">{p.caption}</p>
                  <p className="text-[10px] text-white/25">{p.time}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
              <Icon icon="ph:upload-simple" className="mx-auto mb-2 h-6 w-6 text-white/20" />
              <p className="text-xs text-white/30">Arrastra tus fotos aquí o haz click para subir</p>
              <p className="text-[10px] text-white/15 mt-1">AWS S3 presigned upload</p>
            </div>
          </motion.div>
        )}

        {tab === "form" && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 p-8 text-center"
                >
                  <Icon icon="ph:heart-fill" className="h-10 w-10 text-[#f472b6]" />
                  <p className="text-lg font-bold text-white">¡Confirmado!</p>
                  <p className="text-sm text-white/50">Gracias por confirmar tu asistencia</p>
                </motion.div>
              ) : (
                <motion.form key="form-fields" onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-[0.3em] text-white/35">Nombre</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Tu nombre completo"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#ec4899]/40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.3em] text-white/35">Personas</label>
                      <select
                        value={form.guests}
                        onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-[#0a1020] px-3 py-2.5 text-sm text-white outline-none focus:border-[#ec4899]/40"
                      >
                        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.3em] text-white/35">Menú</label>
                      <select
                        value={form.meal}
                        onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-[#0a1020] px-3 py-2.5 text-sm text-white outline-none focus:border-[#ec4899]/40"
                      >
                        <option value="chicken">Pollo</option>
                        <option value="fish">Pescado</option>
                        <option value="vegan">Vegetariano</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-[0.3em] text-white/35">Mensaje (opcional)</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Un mensaje para los novios…"
                      rows={2}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#ec4899]/40"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Confirmar asistencia
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
