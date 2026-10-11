"use client";

/**
 * Agendar la llamada inicial (PimeBook). Pensado también para clientes de EE. UU.:
 *  - en inglés con ?lang=en (o si el navegador está en inglés),
 *  - los horarios en la hora de quien visita, con la hora de Panamá al lado,
 *  - los próximos días hábiles en un toque, con el primero que tiene turnos ya elegido.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EventType = { slug: string; title: string; durationMin: number; description: string | null };
type Slot = { startTime: string; endTime: string; start: string; end: string };
type Lang = "es" | "en";

const T = {
  es: {
    eyebrow: "Llamada inicial · gratis", titulo: "Agenda una llamada con Pime", bajada: "30 minutos para entender lo que necesita. Hablamos en español o en inglés, sin compromiso.",
    dia: "Elige el día", hora: "Elige la hora", zona: (z: string) => `Horas en tu zona (${z}).`, panama: "En Panamá:", sinTurnos: "No quedan horarios este día. Prueba con el siguiente.", cargando: "Buscando horarios…",
    datos: "Tus datos", nombre: "Nombre", correo: "Correo", empresa: "Empresa (opcional)", notas: "¿Qué necesita? (opcional)",
    reservar: (d: string) => `Reservar la llamada del ${d}`, elegir: "Elige una hora para reservar", reservando: "Reservando…",
    listo: "Tu llamada quedó reservada", listoTxt: (d: string) => `Te esperamos el ${d}. Te llegará la confirmación a tu correo.`, volver: "Volver al inicio",
    faltan: "Escribe tu nombre y tu correo.", error: "No se pudo reservar. Intenta otra vez.",
  },
  en: {
    eyebrow: "Intro call · free", titulo: "Book a call with Pime", bajada: "30 minutes to understand what you need. We speak English and Spanish. No commitment.",
    dia: "Pick a day", hora: "Pick a time", zona: (z: string) => `Times shown in your time zone (${z}).`, panama: "Panama time:", sinTurnos: "No times left on this day. Try the next one.", cargando: "Looking for times…",
    datos: "Your details", nombre: "Name", correo: "Email", empresa: "Company (optional)", notas: "What do you need? (optional)",
    reservar: (d: string) => `Book the call on ${d}`, elegir: "Pick a time to book", reservando: "Booking…",
    listo: "Your call is booked", listoTxt: (d: string) => `See you on ${d}. A confirmation is on its way to your email.`, volver: "Back to home",
    faltan: "Please enter your name and email.", error: "We couldn't book it. Please try again.",
  },
};

/** Próximos días hábiles (lunes a viernes) en la zona de quien visita, como YYYY-MM-DD. */
function proximosDias(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  while (out.length < n) {
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function AgendarClient({ initialType, leadId, prefillEmail, prefillName, lang: langProp }: { initialType?: string; leadId?: string; prefillEmail?: string; prefillName?: string; lang?: string }) {
  const [lang, setLang] = useState<Lang>(langProp === "en" ? "en" : "es");
  useEffect(() => { if (!langProp && typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en")) setLang("en"); }, [langProp]);
  const t = T[lang];
  const locale = lang === "en" ? "en-US" : "es-PA";
  const zona = useMemo(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "local"; } }, []);

  const [tipo, setTipo] = useState<EventType | null>(null);
  const dias = useMemo(() => proximosDias(10), []);
  const [dia, setDia] = useState(dias[0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [empresa, setEmpresa] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/booking/event-types").then((r) => r.json()).then((d) => {
      const lista: EventType[] = d.eventTypes ?? [];
      setTipo(lista.find((x) => x.slug === initialType) ?? lista[0] ?? null);
    }).catch(() => setTipo(null));
  }, [initialType]);

  useEffect(() => {
    if (!tipo) return;
    const desde = new Date(`${dia}T00:00:00`), hasta = new Date(desde); hasta.setDate(hasta.getDate() + 1);
    setSlots(null); setSlot(null);
    fetch(`/api/public/booking/slots?${new URLSearchParams({ eventType: tipo.slug, from: desde.toISOString(), to: hasta.toISOString() })}`)
      .then((r) => r.json()).then((d) => setSlots(d.slots ?? [])).catch(() => setSlots([]));
  }, [tipo, dia]);

  const fmtDia = (iso: string, largo = false) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, largo ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric" });
  const fmtHora = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const fmtPanama = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" });
  const cuando = slot ? `${new Date(slot.startTime).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}, ${fmtHora(slot.startTime)}` : "";

  async function reservar() {
    if (!slot || !tipo) return;
    if (!name.trim() || !email.trim()) { setError(t.faltan); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/public/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: tipo.slug, startTime: slot.startTime, attendeeName: name, attendeeEmail: email, notes: [empresa && `${lang === "en" ? "Company" : "Empresa"}: ${empresa}`, notes, `${lang === "en" ? "Language: English" : "Idioma: español"}`, `Zona: ${zona}`].filter(Boolean).join("\n"), leadId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t.error);
      setDone(cuando);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setLoading(false);
    }
  }

  const campo = "w-full min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-base text-white placeholder:text-white/35 focus:border-[#6FA8FF] focus:outline-none";
  const etiqueta = "block text-xs font-semibold uppercase tracking-widest text-white/55 mb-2";

  if (done) {
    return (
      <main className="min-h-dvh bg-[#060E1E] text-white flex items-center justify-center px-4 py-12">
        <div className="max-w-md text-center space-y-4">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#6FA8FF]/15 text-[#6FA8FF]" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <h1 className="text-2xl font-semibold">{t.listo}</h1>
          <p className="text-white/65 text-sm">{t.listoTxt(done)}</p>
          <Link href={`/${lang}`} className="inline-flex items-center min-h-11 text-[#6FA8FF] text-sm font-semibold hover:underline">{t.volver}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#060E1E] text-white">
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 space-y-8">
        <header className="space-y-4">
          <Link href={`/${lang}`} aria-label="Pime" className="inline-flex min-h-11 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático del logo */}
            <img src="/brand/pime-normal-horizontal-invertido.svg" alt="Pime" width={112} height={32} className="h-8 w-auto" />
          </Link>
          <p className="text-[#6FA8FF] text-xs font-semibold uppercase tracking-widest">{t.eyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t.titulo}</h1>
          <p className="text-white/65 text-base leading-relaxed">{t.bajada}</p>
          <div className="flex gap-2 text-sm" role="group" aria-label="Idioma">
            {(["es", "en"] as Lang[]).map((l) => <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={`min-h-11 rounded-lg px-4 font-semibold ${lang === l ? "bg-white/10 text-white" : "text-white/55 hover:text-white"}`}>{l === "es" ? "Español" : "English"}</button>)}
          </div>
        </header>

        <section className="space-y-3">
          <h2 className={etiqueta}>{t.dia}</h2>
          <ul className="grid grid-cols-5 gap-2">
            {dias.map((d) => (
              <li key={d}><button type="button" onClick={() => setDia(d)} aria-pressed={dia === d} className={`w-full min-h-14 rounded-xl border text-sm font-semibold first-letter:uppercase ${dia === d ? "border-[#6FA8FF] bg-[#6FA8FF]/15 text-[#6FA8FF]" : "border-white/10 text-white/75 hover:border-white/25"}`}>{fmtDia(d)}</button></li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className={etiqueta}>{t.hora}</h2>
          <p className="text-white/50 text-xs">{t.zona(zona)}</p>
          {slots === null ? <p className="text-white/55 text-sm" aria-busy>{t.cargando}</p>
            : slots.length === 0 ? <p className="text-white/55 text-sm">{t.sinTurnos}</p>
            : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <li key={s.startTime}><button type="button" onClick={() => setSlot(s)} aria-pressed={slot?.startTime === s.startTime} className={`w-full min-h-12 rounded-xl border text-sm font-semibold tabular-nums ${slot?.startTime === s.startTime ? "border-[#6FA8FF] bg-[#6FA8FF]/15 text-[#6FA8FF]" : "border-white/10 text-white/80 hover:border-white/25"}`}>{fmtHora(s.startTime)}</button></li>
                ))}
              </ul>
            )}
          {slot && zona !== "America/Panama" && <p className="text-white/50 text-xs">{t.panama} {fmtPanama(slot.startTime)}</p>}
        </section>

        <section className="space-y-4 border-t border-white/10 pt-8">
          <h2 className={etiqueta}>{t.datos}</h2>
          <div><label htmlFor="ag-nombre" className="sr-only">{t.nombre}</label><input id="ag-nombre" autoComplete="name" placeholder={t.nombre} value={name} onChange={(e) => setName(e.target.value)} className={campo} /></div>
          <div><label htmlFor="ag-correo" className="sr-only">{t.correo}</label><input id="ag-correo" type="email" inputMode="email" autoComplete="email" placeholder={t.correo} value={email} onChange={(e) => setEmail(e.target.value)} className={campo} /></div>
          <div><label htmlFor="ag-empresa" className="sr-only">{t.empresa}</label><input id="ag-empresa" autoComplete="organization" placeholder={t.empresa} value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={campo} /></div>
          <div><label htmlFor="ag-notas" className="sr-only">{t.notas}</label><textarea id="ag-notas" placeholder={t.notas} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${campo} py-3 resize-none`} /></div>
          {error && <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300" role="alert">{error}</p>}
          <button type="button" disabled={loading || !slot} onClick={() => void reservar()} className="w-full min-h-12 rounded-xl bg-[#6FA8FF] px-4 text-base font-semibold text-[#0B1D3A] hover:bg-[#9CC3FF] disabled:opacity-50">
            {loading ? t.reservando : slot ? t.reservar(cuando) : t.elegir}
          </button>
        </section>
      </div>
    </main>
  );
}
