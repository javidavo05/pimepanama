"use client";

/**
 * Conexión con Google Calendar en un solo lugar, como un pipeline de tres etapas:
 *   1. Google → Pime: tus eventos de Google entran a la agenda de Tareas, «Tu día» y Jarvis.
 *   2. Pime → Google: tus tareas, citas, cobros y pagos de Pime aparecen en Google.
 *   3. Sincronía: Pime lee tu Google ahora mismo y muestra lo que encontró hoy.
 * Cada etapa dice su estado real y se arregla desde aquí, sin ir a Configuración.
 */
import { useCallback, useEffect, useState } from "react";
import { AsistenteCalendario } from "./asistente-calendario";
import { AsistenteGoogle } from "./pime-en-google";

type Lectura = { conectado: boolean; verificado: string | null; error: string | null };
type Feed = { activo: false } | { activo: true; https: string; webcal: string; google: string; proximos: number };
type Prueba = { estado: "sin" | "ok" | "error"; eventos: { titulo: string }[]; error: string | null; at: Date };
type Etapa = "hecha" | "pendiente" | "error" | "cargando";

const hace = (d: Date) => {
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
};

function Chip({ e }: { e: Etapa }) {
  const t = { hecha: "Listo", pendiente: "Falta", error: "Revisar", cargando: "Revisando…" }[e];
  const c = { hecha: "bg-ok/10 text-ok", pendiente: "bg-fill-2 text-fg-dim", error: "bg-danger/10 text-danger", cargando: "bg-fill-2 text-fg-dim" }[e];
  return <span className={`inline-flex items-center rounded-full px-2 text-xs font-semibold leading-6 ${c}`}>{t}</span>;
}

export function PipelineGoogle({ onCambio }: { onCambio?: () => void }) {
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [prueba, setPrueba] = useState<Prueba | null>(null);
  const [fallo, setFallo] = useState(false);
  const [probando, setProbando] = useState(false);
  const [abrir, setAbrir] = useState<null | "leer" | "publicar">(null);
  const [ocupado, setOcupado] = useState(false);

  const probar = useCallback(async () => {
    setProbando(true);
    try {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const r = await fetch(`/api/empresa/calendario/eventos?desde=${hoy.toISOString()}&hasta=${new Date(hoy.getTime() + 86_400_000).toISOString()}`, { cache: "no-store" });
      const j = await r.json();
      setPrueba({ estado: j.estado ?? "error", eventos: j.eventos ?? [], error: j.error ?? null, at: new Date() });
    } catch {
      setPrueba({ estado: "error", eventos: [], error: "No se pudo leer tu Google Calendar.", at: new Date() });
    } finally { setProbando(false); }
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch("/api/empresa/calendario", { cache: "no-store" }), fetch("/api/empresa/calendario/google", { cache: "no-store" })]);
      if (!a.ok || !b.ok) throw new Error();
      const l = (await a.json()) as Lectura;
      setLectura(l); setFeed((await b.json()) as Feed); setFallo(false);
      if (l.conectado) void probar(); else setPrueba(null);
    } catch { setFallo(true); }
  }, [probar]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function desconectar() {
    setOcupado(true);
    try { await fetch("/api/empresa/calendario", { method: "DELETE" }); await cargar(); onCambio?.(); } finally { setOcupado(false); }
  }
  function listo() { void cargar(); onCambio?.(); }

  const e1: Etapa = !lectura ? "cargando" : lectura.conectado ? (lectura.error ? "error" : "hecha") : "pendiente";
  const e2: Etapa = !feed ? "cargando" : feed.activo ? "hecha" : "pendiente";
  const e3: Etapa = e1 !== "hecha" ? "pendiente" : probando || !prueba ? "cargando" : prueba.estado === "ok" ? "hecha" : "error";
  const hechas = [e1, e2, e3].filter((x) => x === "hecha").length;

  const etapa = "relative grid gap-3 content-start rounded-xl border border-line bg-fill p-4 min-w-0";
  const boton = "inline-flex items-center justify-center min-h-11 px-4 rounded-lg text-sm font-semibold";

  return (
    <section aria-labelledby="pg-titulo" className="mb-6 bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-fg-dim text-xs font-semibold uppercase tracking-[0.14em]">Agenda</p>
          <h2 id="pg-titulo" className="text-fg text-base font-semibold">Conexión con Google Calendar</h2>
          <p className="text-fg-dim text-sm">{hechas === 3 ? "Todo conectado: tu Google y Pime se ven en los dos lados." : `${hechas} de 3 etapas listas.`}</p>
        </div>
        <div className="h-2 w-full max-w-48 rounded-full bg-fill-3 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={hechas} aria-label="Etapas listas">
          <span className="block h-full bg-brand origin-left transition-transform duration-500" style={{ transform: `scaleX(${hechas / 3})` }} />
        </div>
      </div>

      {fallo ? (
        <p className="text-sm text-danger">No se pudo leer el estado de la conexión. <button type="button" className="underline font-semibold min-h-11" onClick={() => void cargar()}>Reintentar</button></p>
      ) : (
        <ol className="grid gap-3 md:grid-cols-3">
          <li className={etapa}>
            <div className="flex items-center justify-between gap-2"><span className="text-fg-dim text-xs font-semibold">1 · Google → Pime</span><Chip e={e1} /></div>
            <p className="text-fg text-sm font-semibold">Tus eventos de Google en Pime</p>
            <p className="text-fg-dim text-sm">{lectura?.conectado ? `Conectado${lectura.verificado ? ` · comprobado ${hace(new Date(lectura.verificado))}` : ""}. Salen aquí en la agenda, en «Tu día» y en Jarvis.` : "Pega la dirección secreta de tu Google Calendar. Pime solo lee; no cambia tus eventos."}</p>
            {lectura?.error && <p className="text-sm text-danger">{lectura.error}</p>}
            <div className="flex flex-wrap gap-2">
              {lectura?.conectado
                ? <><button type="button" className={`${boton} border border-line-mid text-fg-mute hover:text-fg`} onClick={() => setAbrir("leer")}>Cambiar dirección</button><button type="button" disabled={ocupado} className={`${boton} text-fg-dim hover:text-danger disabled:opacity-40`} onClick={() => void desconectar()}>Desconectar</button></>
                : <button type="button" disabled={!lectura} className={`${boton} bg-brand text-on-brand hover:bg-brand-hi disabled:opacity-40`} onClick={() => setAbrir("leer")}>Conectar mi Google</button>}
            </div>
          </li>

          <li className={etapa}>
            <div className="flex items-center justify-between gap-2"><span className="text-fg-dim text-xs font-semibold">2 · Pime → Google</span><Chip e={e2} /></div>
            <p className="text-fg text-sm font-semibold">Pime en tu Google Calendar</p>
            <p className="text-fg-dim text-sm">{feed?.activo ? `Activo · ${feed.proximos} ${feed.proximos === 1 ? "evento" : "eventos"} desde hoy. Google lo vuelve a leer solo cada pocas horas.` : "Tus tareas, citas, cobros y pagos aparecen en Google como el calendario «Pime Suite»."}</p>
            <div className="flex flex-wrap gap-2">
              {feed?.activo
                ? <a href={feed.google} target="_blank" rel="noreferrer" className={`${boton} border border-line-mid text-fg-mute hover:text-fg`}>Abrir en Google</a>
                : <button type="button" disabled={!feed} className={`${boton} ${e1 === "hecha" ? "bg-brand text-on-brand hover:bg-brand-hi" : "border border-line-mid text-fg-mute hover:text-fg"} disabled:opacity-40`} onClick={() => setAbrir("publicar")}>Agregar a Google</button>}
            </div>
          </li>

          <li className={etapa}>
            <div className="flex items-center justify-between gap-2"><span className="text-fg-dim text-xs font-semibold">3 · Sincronía</span><Chip e={e3} /></div>
            <p className="text-fg text-sm font-semibold">Lectura de hoy</p>
            <p className="text-fg-dim text-sm" aria-live="polite">
              {e1 !== "hecha" ? "Se activa al conectar tu Google en la etapa 1."
                : probando || !prueba ? "Leyendo tu Google Calendar…"
                : prueba.estado === "ok" ? `${prueba.eventos.length ? `${prueba.eventos.length} ${prueba.eventos.length === 1 ? "evento" : "eventos"} hoy: ${prueba.eventos.slice(0, 3).map((x) => x.titulo).join(" · ")}` : "Hoy no tienes eventos en Google."} · leído ${hace(prueba.at)}.`
                : `No se pudo leer: ${prueba.error ?? "error desconocido"}. Cambia la dirección en la etapa 1.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={e1 !== "hecha" || probando} className={`${boton} border border-line-mid text-fg-mute hover:text-fg disabled:opacity-40`} onClick={() => void probar()}>{probando ? "Leyendo…" : "Probar ahora"}</button>
            </div>
          </li>
        </ol>
      )}

      <AsistenteCalendario abierto={abrir === "leer"} onCerrar={() => setAbrir(null)} onListo={listo} />
      <AsistenteGoogle abierto={abrir === "publicar"} onCerrar={() => setAbrir(null)} onListo={listo} />
    </section>
  );
}
