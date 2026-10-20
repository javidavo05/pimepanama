"use client";

/**
 * Asistente de Pime Suite (prompt maestro §4): botón fijo en toda la suite, conversación por texto o voz.
 * Lo chico y claro lo hace al instante y queda con «Deshacer»; lo grande (borrar, anular, USD 1,000 o más,
 * facturas emitidas, planes con pagos) queda «Por confirmar» con Confirmar y Cancelar.
 */
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchLargo } from "@/lib/fetch-largo";

type Estado = "propuesta" | "hecha" | "cancelada" | "deshecha" | "error";
type Accion = { id: string; kind: string; summary: string; estado: Estado; motivo?: string | null; href?: string | null; error?: string; ocupado?: boolean; antes?: Estado };
type Msg = { rol: "usuario" | "asistente"; texto: string; acciones?: Accion[]; /** versión anterior guardada en el navegador */ propuestas?: Accion[] };

const SUGERENCIAS = ["¿Qué tengo hoy?", "¿Quién me debe dinero?", "Añade un pago de 300 de hoy a HOLO", "Tarea para mañana: revisar el acta de la Unión"];
const CLAVE = "pime-asistente";

function IconoAsistente({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></svg>;
}
function IconoMic({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>;
}
function IconoEnviar({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

export function AsistenteChat() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLTextAreaElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  // La conversación sobrevive a cambiar de página dentro de la suite (solo en este navegador).
  useEffect(() => { try { const g = sessionStorage.getItem(CLAVE); if (g) setMsgs((JSON.parse(g) as Msg[]).map((m) => ({ ...m, acciones: m.acciones ?? m.propuestas, propuestas: undefined }))); } catch { /* sin almacenamiento */ } }, []);
  useEffect(() => { try { sessionStorage.setItem(CLAVE, JSON.stringify(msgs.slice(-30))); } catch { /* sin almacenamiento */ } }, [msgs]);
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: "smooth" }); }, [msgs, pensando]);
  // Al abrir, lo último a la vista (las tarjetas por confirmar suelen estar al final).
  useEffect(() => { if (abierto) requestAnimationFrame(() => lista.current?.scrollTo({ top: lista.current.scrollHeight })); }, [abierto]);
  // La caja crece con lo que se escribe o dicta, hasta su tope (max-h en CSS); de ahí en adelante se desplaza.
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    el.style.height = "";
    if (!el.value) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [texto, abierto, grabando]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  // ⌘K es del buscador global; el asistente se abre desde su botón o desde «Preguntar al asistente» del buscador.
  useEffect(() => {
    const f = (e: Event) => { const t = (e as CustomEvent<{ texto?: string }>).detail?.texto; setAbierto(true); if (t) setTexto(t); };
    window.addEventListener("pime:asistente", f);
    return () => window.removeEventListener("pime:asistente", f);
  }, []);

  useEffect(() => {
    if (!grabando) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [grabando]);

  const enviar = useCallback(async (contenido: string) => {
    const t = contenido.trim();
    if (!t || pensando) return;
    const nuevos: Msg[] = [...msgs, { rol: "usuario", texto: t }];
    setMsgs(nuevos); setTexto(""); setError(null); setPensando(true);
    try {
      const r = await fetchLargo("/api/empresa/asistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes: nuevos.map(({ rol, texto }) => ({ rol, texto })) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "El asistente no respondió.");
      setMsgs((m) => [...m, { rol: "asistente", texto: j.respuesta, acciones: j.acciones ?? [] }]);
      if ((j.acciones ?? []).some((a: Accion) => a.estado === "hecha")) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "El asistente no respondió.");
    } finally {
      setPensando(false);
    }
  }, [msgs, pensando, router]);

  async function decidir(idMsg: number, p: Accion, accion: "confirmar" | "cancelar" | "deshacer") {
    const poner = (cambio: Partial<Accion>) => setMsgs((m) => m.map((x, i) => (i === idMsg ? { ...x, acciones: x.acciones?.map((y) => (y.id === p.id ? { ...y, ...cambio } : y)) } : x)));
    poner({ ocupado: true, error: undefined });
    try {
      const r = await fetch(`/api/empresa/asistente/${p.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo.");
      poner({ estado: j.estado === "fallida" ? "error" : j.estado, antes: p.estado, href: j.href ?? p.href, error: undefined, ocupado: false });
      if (accion !== "cancelar") router.refresh();
    } catch (e) {
      // Si no se pudo deshacer, sigue hecha; si no se pudo confirmar, queda con el error y se puede reintentar.
      poner({ estado: accion === "confirmar" ? "error" : p.estado, error: e instanceof Error ? e.message : "No se pudo.", ocupado: false });
    }
  }

  async function confirmarTodo(idMsg: number, pendientes: Accion[]) {
    // En orden: una propuesta puede depender de la anterior.
    for (const p of pendientes) await decidir(idMsg, p, "confirmar");
  }

  async function voz() {
    if (grabando) { rec.current?.stop(); return; }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((x) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(x)) ?? "";
      const r = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      trozos.current = [];
      r.ondataavailable = (e) => { if (e.data.size) trozos.current.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setGrabando(false);
        const blob = new Blob(trozos.current, { type: r.mimeType || "audio/webm" });
        if (blob.size < 1500) return;
        setTranscribiendo(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, `voz.${(r.mimeType || "").includes("mp4") ? "m4a" : "webm"}`);
          fd.append("language", "es");
          const res = await fetchLargo("/api/empresa/ai/transcribe", { method: "POST", body: fd });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.transcript?.trim()) throw new Error("No te entendí. Intenta otra vez, más cerca del micrófono.");
          await enviar(j.transcript);
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo transcribir.");
        } finally {
          setTranscribiendo(false);
        }
      };
      rec.current = r;
      r.start();
      setSegundos(0);
      setGrabando(true);
    } catch {
      setError("No hay permiso para el micrófono. Actívalo en el navegador y vuelve a tocar el micrófono.");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir el asistente"
        className="fixed z-40 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6 inline-flex items-center gap-2 min-h-14 min-w-14 justify-center rounded-full bg-brand text-on-brand shadow-lg hover:bg-brand-hi md:px-6 [@media(max-height:560px)]:!min-h-11 [@media(max-height:560px)]:!min-w-11 [@media(max-height:560px)]:!px-0 [@media(max-height:560px)]:!bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:[@media(max-height:560px)]:!bottom-4">
        {/* En pantallas bajas (teléfono o plegable en horizontal) queda solo el ícono, más chico y pegado a la barra de abajo: no tapa media pantalla. */}
        <IconoAsistente className="h-6 w-6" /><span className="hidden md:inline text-sm font-semibold [@media(max-height:560px)]:!hidden">Asistente</span>
      </button>

      <dialog ref={dialogo} onClose={() => setAbierto(false)} onClick={(e) => { if (e.target === dialogo.current) setAbierto(false); }} aria-labelledby="asistente-titulo"
        className="m-0 h-dvh max-h-dvh w-full max-w-none md:ml-auto md:h-dvh md:w-[440px] border-0 md:border-l border-line bg-panel p-0 text-fg backdrop:bg-black/40 open:flex open:flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
          <div className="min-w-0">
            <h2 id="asistente-titulo" className="flex items-center gap-2 text-fg text-base font-semibold"><IconoAsistente className="h-5 w-5 text-brand-fg" />Asistente</h2>
            <p className="text-fg-dim text-xs mt-1">Pide en palabras o con la voz. Lo hago al instante y lo puedes deshacer; lo grande te lo dejo para confirmar.</p>
          </div>
          <div className="flex items-center gap-1">
            {msgs.length > 0 && <button type="button" onClick={() => setMsgs([])} className="inline-flex items-center min-h-11 px-3 rounded-lg text-xs font-semibold text-fg-dim hover:text-fg">Nueva</button>}
            <button type="button" onClick={() => setAbierto(false)} className="grid h-11 w-11 place-items-center rounded-full text-fg-dim hover:bg-fill hover:text-fg" aria-label="Cerrar el asistente">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </header>

        <div ref={lista} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4" aria-live="polite">
          {msgs.length === 0 && (
            <div className="space-y-4">
              <p className="text-fg-mute text-sm">Prueba con algo así:</p>
              <ul className="grid gap-2">
                {SUGERENCIAS.map((s) => (
                  <li key={s}><button type="button" onClick={() => void enviar(s)} className="w-full min-h-12 rounded-xl border border-line-mid px-4 py-3 text-left text-sm text-fg hover:border-brand">{s}</button></li>
                ))}
              </ul>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.rol === "usuario" ? "flex justify-end" : "space-y-3"}>
              <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm [overflow-wrap:anywhere] ${m.rol === "usuario" ? "bg-brand text-on-brand" : "bg-fill text-fg"}`}>{m.texto}</p>
              {m.acciones && m.acciones.length > 0 && <Tarjetas acciones={m.acciones} onDecidir={(p, acc) => void decidir(i, p, acc)} onConfirmarTodo={(xs) => void confirmarTodo(i, xs)} onAbrir={() => setAbierto(false)} />}
            </div>
          ))}
          {(pensando || transcribiendo) && <p className="text-fg-dim text-sm" role="status">{transcribiendo ? "Transcribiendo tu voz…" : "Trabajando en eso…"}</p>}
          {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void enviar(texto); }} className="border-t border-line px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
          {grabando ? (
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm text-danger font-semibold" role="status"><span className="motion-safe:animate-pulse">●</span> Escuchando… {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, "0")}</span>
              <button type="button" onClick={() => void voz()} className="min-h-12 px-6 rounded-xl bg-danger text-on-solid text-sm font-semibold">Listo, enviar</button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea ref={caja} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(texto); } }}
                rows={1} placeholder="Ej.: factura aparte a HOLO por 400" aria-label="Escribe al asistente"
                className="min-h-12 max-h-[min(40dvh,320px)] flex-1 resize-none overflow-y-auto rounded-xl border-0 ring-1 ring-inset ring-line-mid bg-fill px-4 py-3 text-base leading-6 text-fg placeholder:text-fg-trace focus:ring-2 focus:ring-brand focus:outline-none" />
              {texto.trim() ? (
                <button type="submit" disabled={pensando} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-on-brand disabled:opacity-50" aria-label="Enviar"><IconoEnviar /></button>
              ) : (
                <button type="button" onClick={() => void voz()} disabled={pensando || transcribiendo} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-on-brand disabled:opacity-50" aria-label="Hablar al asistente"><IconoMic /></button>
              )}
            </div>
          )}
        </form>
      </dialog>
    </>
  );
}

const ETIQUETA: Record<Estado, string> = { hecha: "Hecho", propuesta: "Por confirmar", error: "No se pudo", deshecha: "Deshecho", cancelada: "Cancelado" };

/**
 * Lo que hizo y lo que propone el asistente en un mensaje, en dos tarjetas: «Hecho» (cada cosa con Abrir y
 * Deshacer) y «Por confirmar» (cada cosa con Cancelar y Confirmar; con dos o más, «Confirmar las N»).
 * Lo deshecho o cancelado queda tachado en su lugar para no perder el hilo.
 */
function Tarjetas({ acciones, onDecidir, onConfirmarTodo, onAbrir }: { acciones: Accion[]; onDecidir: (p: Accion, a: "confirmar" | "cancelar" | "deshacer") => void; onConfirmarTodo: (xs: Accion[]) => void; onAbrir: () => void }) {
  // Cada acción queda en el grupo donde nació: una propuesta trae su motivo; lo instantáneo, no.
  const origen = (a: Accion) => (a.motivo ? "confirmar" : a.estado === "error" ? "error" : "hecho");
  const grupos = [
    { clave: "hecho", titulo: "Hecho", xs: acciones.filter((a) => origen(a) === "hecho") },
    { clave: "confirmar", titulo: "Por confirmar", xs: acciones.filter((a) => origen(a) === "confirmar") },
    { clave: "error", titulo: "No se pudo", xs: acciones.filter((a) => origen(a) === "error") },
  ].filter((g) => g.xs.length);
  return (
    <div className="space-y-3">
      {grupos.map((g) => {
        const pendientes = g.xs.filter((a) => a.estado === "propuesta");
        const ocupado = g.xs.some((a) => a.ocupado);
        return (
          <section key={g.clave} aria-label={g.titulo} className={`rounded-2xl border bg-panel ${g.clave === "confirmar" && pendientes.length ? "border-brand/40" : "border-line-mid"}`}>
            <header className="flex items-center justify-between gap-2 px-4 pt-3">
              <h3 className={`text-xs font-semibold ${g.clave === "hecho" ? "text-ok" : g.clave === "error" ? "text-danger" : "text-brand-fg"}`}>{g.titulo}{g.xs.length > 1 ? ` · ${g.xs.length}` : ""}</h3>
            </header>
            <ul className="divide-y divide-line">
              {g.xs.map((a) => <Fila key={a.id} a={a} secundario={pendientes.length > 1} onDecidir={onDecidir} onAbrir={onAbrir} />)}
            </ul>
            {pendientes.length > 1 && (
              <div className="border-t border-line p-3">
                <button type="button" disabled={ocupado} onClick={() => onConfirmarTodo(pendientes)} className="w-full min-h-11 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hi disabled:opacity-50">
                  {ocupado ? "Confirmando…" : `Confirmar las ${pendientes.length}`}
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Con varias por confirmar, la acción principal es «Confirmar las N» y cada fila confirma en secundario. */
function Fila({ a, secundario, onDecidir, onAbrir }: { a: Accion; secundario: boolean; onDecidir: (p: Accion, x: "confirmar" | "cancelar" | "deshacer") => void; onAbrir: () => void }) {
  const apagada = a.estado === "deshecha" || a.estado === "cancelada";
  return (
    <li className="space-y-2 px-4 py-3">
      <p className={`text-sm [overflow-wrap:anywhere] ${apagada ? "text-fg-dim line-through" : "text-fg"}`}>{a.summary}</p>
      {a.estado === "propuesta" && a.motivo && <p className="text-xs text-fg-dim">{a.motivo}</p>}
      {(apagada || (a.estado === "hecha" && a.antes === "propuesta")) && <p className="text-xs text-fg-dim">{ETIQUETA[a.estado]}</p>}
      {a.error && <p className="text-sm text-danger" role="alert">{a.error}</p>}
      {a.estado === "propuesta" && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={a.ocupado} onClick={() => onDecidir(a, "cancelar")} className="min-h-11 rounded-xl border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg disabled:opacity-50">Cancelar</button>
          <button type="button" disabled={a.ocupado} onClick={() => onDecidir(a, "confirmar")} className={`min-h-11 rounded-xl text-sm font-semibold disabled:opacity-50 ${secundario ? "border border-brand/40 text-brand-fg hover:bg-fill" : "bg-brand text-on-brand hover:bg-brand-hi"}`}>{a.ocupado ? "Haciendo…" : "Confirmar"}</button>
        </div>
      )}
      {a.estado === "hecha" && (
        <div className="flex flex-wrap gap-2">
          {a.href && <Link href={a.href} onClick={onAbrir} className="inline-flex items-center min-h-11 px-4 rounded-xl bg-fill text-sm font-semibold text-brand-fg">Abrir</Link>}
          <button type="button" disabled={a.ocupado} onClick={() => onDecidir(a, "deshacer")} className="inline-flex items-center min-h-11 px-4 rounded-xl text-sm font-semibold text-fg-dim hover:text-fg disabled:opacity-50">{a.ocupado ? "Deshaciendo…" : "Deshacer"}</button>
        </div>
      )}
    </li>
  );
}
