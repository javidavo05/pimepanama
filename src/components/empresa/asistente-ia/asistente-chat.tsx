"use client";

/**
 * Asistente de Pime Suite (prompt maestro §4): botón fijo en toda la suite, conversación por texto o voz.
 * Lo que escribe en el sistema llega como propuesta con Confirmar; nada se crea sin ese toque.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchLargo } from "@/lib/fetch-largo";

type Propuesta = { id: string; kind: string; summary: string; estado?: "propuesta" | "hecha" | "cancelada" | "deshecha" | "error"; href?: string | null; error?: string };
type Msg = { rol: "usuario" | "asistente"; texto: string; propuestas?: Propuesta[] };

const SUGERENCIAS = ["¿Qué tengo hoy?", "¿Quién me debe dinero?", "Factura aparte a HOLO por 400 por asesoramiento de sitio web", "Tarea para mañana: revisar el acta de la Unión"];
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
  const rec = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  // La conversación sobrevive a cambiar de página dentro de la suite (solo en este navegador).
  useEffect(() => { try { const g = sessionStorage.getItem(CLAVE); if (g) setMsgs(JSON.parse(g)); } catch { /* sin almacenamiento */ } }, []);
  useEffect(() => { try { sessionStorage.setItem(CLAVE, JSON.stringify(msgs.slice(-30))); } catch { /* sin almacenamiento */ } }, [msgs]);
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: "smooth" }); }, [msgs, pensando]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setAbierto((a) => !a); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
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
      const r = await fetch("/api/empresa/asistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes: nuevos.map(({ rol, texto }) => ({ rol, texto })) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "El asistente no respondió.");
      setMsgs((m) => [...m, { rol: "asistente", texto: j.respuesta, propuestas: (j.propuestas ?? []).map((p: Propuesta) => ({ ...p, estado: "propuesta" })) }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "El asistente no respondió.");
    } finally {
      setPensando(false);
    }
  }, [msgs, pensando]);

  async function decidir(idMsg: number, p: Propuesta, accion: "confirmar" | "cancelar" | "deshacer") {
    const poner = (cambio: Partial<Propuesta>) => setMsgs((m) => m.map((x, i) => (i === idMsg ? { ...x, propuestas: x.propuestas?.map((y) => (y.id === p.id ? { ...y, ...cambio } : y)) } : x)));
    try {
      const r = await fetch(`/api/empresa/asistente/${p.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo.");
      poner({ estado: j.estado, href: j.href ?? p.href, error: undefined });
    } catch (e) {
      poner({ estado: accion === "deshacer" ? "hecha" : "error", error: e instanceof Error ? e.message : "No se pudo." });
    }
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
        className="fixed z-40 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6 inline-flex items-center gap-2 min-h-14 min-w-14 justify-center rounded-full bg-brand text-on-brand shadow-lg hover:bg-brand-hi md:px-6">
        <IconoAsistente className="h-6 w-6" /><span className="hidden md:inline text-sm font-semibold">Asistente</span>
      </button>

      <dialog ref={dialogo} onClose={() => setAbierto(false)} onClick={(e) => { if (e.target === dialogo.current) setAbierto(false); }} aria-labelledby="asistente-titulo"
        className="m-0 h-dvh max-h-dvh w-full max-w-none md:ml-auto md:h-dvh md:w-[440px] border-0 md:border-l border-line bg-panel p-0 text-fg backdrop:bg-black/40 open:flex open:flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
          <div className="min-w-0">
            <h2 id="asistente-titulo" className="flex items-center gap-2 text-fg text-base font-semibold"><IconoAsistente className="h-5 w-5 text-brand-fg" />Asistente</h2>
            <p className="text-fg-dim text-xs mt-1">Pide en palabras o con la voz. Antes de crear algo te pido que confirmes.</p>
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
              {m.propuestas?.map((p) => (
                <div key={p.id} className="rounded-2xl border border-line-mid bg-panel p-4 space-y-3">
                  <p className="text-fg-dim text-xs font-semibold uppercase tracking-widest">{p.estado === "hecha" ? "Hecho" : p.estado === "cancelada" ? "Cancelado" : p.estado === "deshecha" ? "Deshecho" : "Para confirmar"}</p>
                  <p className="text-fg text-sm font-semibold [overflow-wrap:anywhere]">{p.summary}</p>
                  {p.error && <p className="text-danger text-sm" role="alert">{p.error}</p>}
                  {(p.estado === "propuesta" || p.estado === "error") && (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void decidir(i, p, "cancelar")} className="min-h-11 rounded-xl border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg">Cancelar</button>
                      <button type="button" onClick={() => void decidir(i, p, "confirmar")} className="min-h-11 rounded-xl bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hi">Confirmar</button>
                    </div>
                  )}
                  {p.estado === "hecha" && (
                    <div className="flex flex-wrap gap-2">
                      {p.href && <Link href={p.href} onClick={() => setAbierto(false)} className="inline-flex items-center min-h-11 px-4 rounded-xl bg-fill text-sm font-semibold text-brand-fg">Abrir</Link>}
                      <button type="button" onClick={() => void decidir(i, p, "deshacer")} className="inline-flex items-center min-h-11 px-4 rounded-xl text-sm font-semibold text-fg-dim hover:text-fg">Deshacer</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {(pensando || transcribiendo) && <p className="text-fg-dim text-sm" role="status">{transcribiendo ? "Transcribiendo tu voz…" : "Pensando…"}</p>}
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
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(texto); } }}
                rows={1} placeholder="Ej.: factura aparte a HOLO por 400" aria-label="Escribe al asistente"
                className="min-h-12 max-h-32 flex-1 resize-none rounded-xl border border-line-mid bg-fill px-4 py-3 text-base sm:text-sm text-fg placeholder:text-fg-trace focus:border-brand focus:outline-none" />
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
