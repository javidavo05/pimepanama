"use client";

/**
 * Conectar Google Calendar en 3 pasos, con la dirección secreta iCal (solo lectura):
 *   1. Abrir la configuración de Google Calendar (enlace directo) y ubicar la dirección secreta.
 *   2. Pegarla: Pime la comprueba leyendo tu agenda de hoy y la guarda cifrada.
 *   3. Listo: tus eventos salen en «Tu día» y el asistente los conoce.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Asistente, btnAsistente } from "@/components/empresa/asistente/asistente";

const PASOS = ["Buscar la dirección", "Pegarla", "Listo"];

export function AsistenteCalendario({ abierto, onCerrar, onListo }: { abierto: boolean; onCerrar: () => void; onListo?: () => void }) {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [url, setUrl] = useState("");
  const [estado, setEstado] = useState<{ cargando?: boolean; error?: string; hoy?: number; primeros?: string[] }>({});

  function cerrar() { setPaso(1); setUrl(""); setEstado({}); onCerrar(); }

  async function conectar(valor = url) {
    if (!valor.trim()) return;
    setEstado({ cargando: true });
    try {
      const r = await fetch("/api/empresa/calendario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: valor.trim() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo conectar.");
      setEstado({ hoy: j.hoy, primeros: j.primeros });
      setPaso(3);
      onListo?.();
      router.refresh();
    } catch (e) {
      setEstado({ error: e instanceof Error ? e.message : "No se pudo conectar." });
    }
  }

  const pie = paso === 1 ? (
    <>
      <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(2)}>Ya la tengo</button>
      <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer" onClick={() => setPaso(2)} className={btnAsistente.principal}>Abrir Google Calendar</a>
    </>
  ) : paso === 2 ? (
    <>
      <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(1)}>Atrás</button>
      <button type="button" className={btnAsistente.principal} disabled={!url.trim() || estado.cargando} onClick={() => void conectar()}>{estado.cargando ? "Leyendo tu agenda…" : "Conectar calendario"}</button>
    </>
  ) : (
    <button type="button" className={btnAsistente.principal} onClick={cerrar}>Terminar</button>
  );

  return (
    <Asistente abierto={abierto} onCerrar={cerrar} titulo={paso === 3 ? "Calendario conectado" : "Conectar tu Google Calendar"} paso={paso} pasos={PASOS} pie={pie}>
      {paso === 1 && (
        <div className="space-y-6">
          <p className="text-fg-mute text-sm leading-relaxed">Pime solo lee tu agenda para mostrarte tu día y para que el asistente sepa qué tienes. No crea ni cambia eventos.</p>
          <ol className="space-y-4 text-sm">
            {[
              ["Toca «Abrir Google Calendar».", "Se abre la configuración. En el teléfono, ábrela en el navegador: la app no tiene esta opción."],
              ["A la izquierda, elige tu calendario.", "Está bajo «Configuración de mis calendarios», con tu nombre."],
              ["Baja hasta «Integrar el calendario».", "Copia la «Dirección secreta en formato iCal» (termina en .ics) y vuelve aquí."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-brand-fg text-xs font-bold">{i + 1}</span>
                <span><span className="block text-fg font-semibold">{t}</span><span className="block text-fg-dim">{d}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-fg-dim text-xs">Es secreta: quien la tenga puede ver tu agenda. Pégala solo aquí. Si algún día se filtra, la restableces en esa misma pantalla.</p>
        </div>
      )}
      {paso === 2 && (
        <div className="space-y-4">
          <label htmlFor="cal-url" className="block text-fg text-sm font-semibold">Pega la dirección secreta</label>
          <input id="cal-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={url}
            onChange={(e) => { setUrl(e.target.value); setEstado({}); }}
            onPaste={(e) => { const v = e.clipboardData.getData("text").trim(); if (/^https:\/\/calendar\.google\.com\/calendar\/ical\//.test(v)) { e.preventDefault(); setUrl(v); void conectar(v); } }}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            className="w-full min-h-12 rounded-xl border border-line-mid bg-fill px-4 text-base text-fg placeholder:text-fg-trace focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <p className="text-fg-dim text-xs">Al pegarla, Pime lee tu agenda de hoy para comprobarla y la guarda cifrada. Nadie la vuelve a ver.</p>
          {estado.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
        </div>
      )}
      {paso === 3 && (
        <div className="space-y-4 text-center py-4">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok/10 text-ok" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <p className="text-fg text-base font-semibold">{estado.hoy ? `Hoy tienes ${estado.hoy} ${estado.hoy === 1 ? "evento" : "eventos"}` : "Calendario conectado"}</p>
          <p className="text-fg-dim text-sm">{estado.primeros?.length ? estado.primeros.join(" · ") : "Hoy no tienes eventos. Desde ahora salen en «Tu día»."}</p>
        </div>
      )}
    </Asistente>
  );
}

export function BotonCalendario({ etiqueta = "Conectar Google Calendar", className }: { etiqueta?: string; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={className}>{etiqueta}</button>
      <AsistenteCalendario abierto={abierto} onCerrar={() => setAbierto(false)} />
    </>
  );
}

/** Tarjeta de Configuración: estado del calendario, conectar o desconectar. */
export function CalendarioConfig() {
  const [s, setS] = useState<{ conectado: boolean; verificado: string | null } | null>(null);
  const [error, setError] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const cargar = useCallback(async () => {
    try { const r = await fetch("/api/empresa/calendario", { cache: "no-store" }); if (!r.ok) throw new Error(); setS(await r.json()); setError(false); } catch { setError(true); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  async function quitar() { await fetch("/api/empresa/calendario", { method: "DELETE" }); await cargar(); }
  return (
    <section className="bg-panel border border-line rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-fg text-sm font-semibold">Tu Google Calendar en «Tu día»</h2>
          <p className="text-fg-dim text-xs mt-1">Opcional, al revés: Pime lee tus eventos de Google para mostrarlos en «Tu día» y en el asistente.</p>
        </div>
        {s?.conectado
          ? <button type="button" onClick={() => void quitar()} className="inline-flex items-center min-h-11 px-4 rounded-lg text-sm font-semibold text-fg-dim hover:text-danger">Desconectar</button>
          : <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center min-h-11 px-4 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg">Conectar</button>}
      </div>
      {error ? <p className="text-sm text-danger">No se pudo leer el estado. <button type="button" className="underline font-semibold" onClick={() => void cargar()}>Reintentar</button></p>
        : s === null ? <p className="text-sm text-fg-dim" aria-busy>Cargando…</p>
        : <p className={`text-sm ${s.conectado ? "text-ok" : "text-fg-dim"}`}>{s.conectado ? "Conectado." : "Sin conectar."}</p>}
      <AsistenteCalendario abierto={abierto} onCerrar={() => setAbierto(false)} onListo={() => void cargar()} />
    </section>
  );
}
