"use client";

/**
 * Jarvis: la pantalla de inicio del panel. Un núcleo al centro con cada conexión real alrededor; al hablarle
 * (voz o texto) se encienden las líneas por donde viaja el pedido. Los paneles llegan del servidor ya armados
 * (con los permisos de cada área) y se iluminan cuando su fuente participa.
 * Niveles: N1 lo resuelve aquí mismo (abrir una sección), N2 es una respuesta del asistente sin cambios y
 * N3 es cuando el asistente hace o propone cambios.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchLargo } from "@/lib/fetch-largo";
import type { Conexion } from "@/lib/jarvis/conexiones";
import { iniciarEsfera, colorDe, posicionEnAnillo, type Vivo } from "./esfera";
import "./jarvis.css";

type EstadoAccion = "propuesta" | "hecha" | "cancelada" | "deshecha" | "error";
type Accion = { id: string; kind: string; summary: string; estado: EstadoAccion; motivo?: string | null; href?: string | null; error?: string; ocupado?: boolean };
type Mensaje = { rol: "usuario" | "asistente"; texto: string };
type Estado = "espera" | "escuchando" | "transcribiendo" | "pensando" | "hablando";
type Memoria = { nodos: number; aristas: number; areas: { id: string; n: number; top: string[] }[]; links: [string, string, number][] };

const NOMBRES: Record<Estado, string> = { espera: "En espera", escuchando: "Escuchando", transcribiendo: "Pasando tu voz a texto", pensando: "Pensando", hablando: "Respondiendo" };

const ICONOS: Record<string, ReactNode> = {
  pime: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  correo: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  agenda: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  github: <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="8" r="2" /><path d="M6 8v8M18 10c0 4-6 3-10 7" /></>,
  sistemas: <><path d="M3 12h4l3-7 4 14 3-7h4" /></>,
  portal: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  oido: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  asistente: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></>,
  voz: <><path d="M4 10v4h4l5 4V6L8 10Z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></>,
  persona: <><circle cx="12" cy="9" r="3.5" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /><circle cx="12" cy="12" r="10" /></>,
};

/** Atajos de nivel 1: abrir una sección sin pasar por la IA. */
const SECCIONES: [RegExp, string, string][] = [
  [/factura/, "/empresa/facturas", "Facturas"], [/cotizaci/, "/empresa/cotizaciones", "Cotizaciones"], [/contrato/, "/empresa/contratos", "Contratos"],
  [/por cobrar|cobro|me deben/, "/empresa/cuentas-por-cobrar", "Por cobrar"], [/por pagar|gasto/, "/empresa/por-pagar", "Por pagar"], [/dinero|ingreso/, "/empresa/dinero", "Dinero"],
  [/cliente/, "/empresa/clientes", "Clientes"], [/proyecto/, "/empresa/proyectos", "Proyectos"], [/lead|prospecto/, "/empresa/leads", "Leads"], [/venta|embudo|oportunidad/, "/empresa/ventas", "Ventas"],
  [/correo|mail/, "/empresa/correos/hub", "Correos"], [/tarea|pendiente/, "/empresa/tareas", "Tareas"], [/reuni/, "/empresa/reuniones", "Reuniones"], [/cita/, "/empresa/citas", "Citas"],
  [/ticket|soporte/, "/empresa/tickets", "Tickets"], [/sistema/, "/empresa/sistemas", "Sistemas"], [/plataforma/, "/empresa/platforms", "Plataformas"], [/campa/, "/empresa/campanas", "Campañas"],
  [/reporte/, "/empresa/reportes", "Reportes"], [/configura|ajuste/, "/empresa/configuracion", "Configuración"],
];
function atajo(texto: string): { href: string; nombre: string } | null {
  const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (!/^(abre|abrir|ve a|vete a|ir a|ll[eé]vame a|muestra|mu[eé]strame|ens[eé]ñame|entra a)\b/.test(t)) return null;
  for (const [re, href, nombre] of SECCIONES) if (re.test(t)) return { href, nombre };
  return null;
}
/** Qué fuentes se encienden mientras el asistente trabaja, según de qué habla el pedido. */
function fuentesDe(texto: string): string[] {
  const t = texto.toLowerCase();
  const f = ["pime"];
  if (/correo|mail|escrib/.test(t)) f.push("correo");
  if (/hoy|mañana|agenda|reuni|cita|tarea|semana/.test(t)) f.push("agenda");
  if (/github|commit|avance|código|codigo/.test(t)) f.push("github");
  if (/sistema|caído|caido|pulso/.test(t)) f.push("sistemas");
  if (/ticket|portal|cuenta del cliente/.test(t)) f.push("portal");
  return f;
}

type Props = {
  nombre: string; fecha: string; resumen: string;
  conexiones: Conexion[]; memoria: Memoria | null;
  principal?: ReactNode; izquierda: ReactNode; derecha: ReactNode; abajo: ReactNode;
};

export function Jarvis({ nombre, fecha, resumen, conexiones, memoria, principal, izquierda, derecha, abajo }: Props) {
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<Estado>("espera");
  const [nivel, setNivel] = useState<0 | 1 | 2 | 3>(0);
  const [dicho, setDicho] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [historial, setHistorial] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [detalle, setDetalle] = useState<{ t?: string; d: string }>({ d: "Toca cualquier conexión para ver qué aporta." });
  const [encendidos, setEncendidos] = useState<string[]>([]);
  const [modo, setModo] = useState<"conexiones" | "memoria">("conexiones");
  const [completa, setCompleta] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  const [hora, setHora] = useState("");
  const vivo = useRef<Vivo>({ estado: "espera", encendidos: [], hover: null, modo: "conexiones", finArrastre: 0 });
  const rec = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  const sistemasN = conexiones.filter((c) => c.tipo !== "persona");
  const enLinea = sistemasN.filter((c) => c.estado === "ok").length;

  useEffect(() => { vivo.current.estado = estado; }, [estado]);
  useEffect(() => { vivo.current.modo = modo; }, [modo]);
  useEffect(() => {
    vivo.current.encendidos = encendidos;
    // Los paneles cuya fuente participa se iluminan.
    raiz.current?.querySelectorAll<HTMLElement>("[data-src]").forEach((p) => {
      const fuentes = (p.dataset.src ?? "").split(" ");
      p.classList.toggle("jv-lit", fuentes.some((f) => encendidos.includes(f)));
    });
  }, [encendidos]);

  // Preferencia de voz (solo en este navegador) y reloj.
  useEffect(() => { try { if (localStorage.getItem("jarvis-voz") === "0") setVozActiva(false); } catch { /* sin almacenamiento */ } }, []);
  useEffect(() => {
    const f = () => setHora(new Date().toLocaleTimeString("es-PA", { hour12: false, timeZone: "America/Panama" }));
    f(); const t = setInterval(f, 1000); return () => clearInterval(t);
  }, []);

  const encender = useCallback((ids: string[]) => {
    setEncendidos(ids);
  }, []);

  const hablar = useCallback((t: string) => {
    if (!vozActiva || typeof window === "undefined" || !("speechSynthesis" in window) || !t) { return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t.replace(/USD\s?/g, "").slice(0, 600));
      const voces = window.speechSynthesis.getVoices();
      u.voice = voces.find((v) => v.lang === "es-MX") ?? voces.find((v) => v.lang === "es-US") ?? voces.find((v) => v.lang.startsWith("es")) ?? null;
      u.lang = u.voice?.lang ?? "es-MX"; u.rate = 1.04;
      setEstado("hablando");
      u.onend = () => setEstado("espera");
      u.onerror = () => setEstado("espera");
      window.speechSynthesis.speak(u);
    } catch { setEstado("espera"); }
  }, [vozActiva]);

  const procesar = useCallback(async (pedido: string) => {
    const t = pedido.trim();
    if (!t || estado === "pensando" || estado === "transcribiendo") return;
    setError(null); setDicho(`«${t}»`); setRespuesta(""); setAcciones([]); setTexto("");
    const ir = atajo(t);
    if (ir) {
      setNivel(1); encender(["pime"]); setRespuesta(`Abriendo ${ir.nombre}.`); hablar(`Abriendo ${ir.nombre}.`);
      router.push(ir.href);
      return;
    }
    setNivel(0); setEstado("pensando"); encender(["asistente", ...fuentesDe(t)]);
    const nuevos: Mensaje[] = [...historial, { rol: "usuario" as const, texto: t }].slice(-12);
    try {
      const r = await fetchLargo("/api/empresa/asistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes: nuevos }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "El asistente no respondió.");
      const acc: Accion[] = j.acciones ?? [];
      setHistorial([...nuevos, { rol: "asistente" as const, texto: j.respuesta }].slice(-12));
      setAcciones(acc); setRespuesta(j.respuesta); setNivel(acc.length ? 3 : 2);
      encender(["voz", ...fuentesDe(t)]);
      if (acc.some((a) => a.estado === "hecha")) router.refresh();
      setEstado("espera");
      hablar(j.respuesta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "El asistente no respondió.");
      setEstado("espera"); setEncendidos([]);
    }
  }, [estado, historial, encender, hablar, router]);

  async function decidir(a: Accion, accion: "confirmar" | "cancelar" | "deshacer") {
    const poner = (c: Partial<Accion>) => setAcciones((xs) => xs.map((x) => (x.id === a.id ? { ...x, ...c } : x)));
    poner({ ocupado: true, error: undefined });
    try {
      const r = await fetch(`/api/empresa/asistente/${a.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo.");
      poner({ estado: j.estado === "fallida" ? "error" : j.estado, href: j.href ?? a.href, ocupado: false });
      if (accion !== "cancelar") router.refresh();
    } catch (e) {
      poner({ ocupado: false, error: e instanceof Error ? e.message : "No se pudo." });
    }
  }

  const microfono = useCallback(async () => {
    if (rec.current && rec.current.state === "recording") { rec.current.stop(); return; }
    if (estado === "pensando" || estado === "transcribiendo") return;
    setError(null);
    try { window.speechSynthesis?.cancel(); } catch { /* sin voz */ }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((x) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(x)) ?? "";
      const r = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      trozos.current = [];
      r.ondataavailable = (e) => { if (e.data.size) trozos.current.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop());
        rec.current = null;
        const blob = new Blob(trozos.current, { type: r.mimeType || "audio/webm" });
        if (blob.size < 1500) { setEstado("espera"); setEncendidos([]); return; }
        setEstado("transcribiendo");
        try {
          const fd = new FormData();
          fd.append("audio", blob, `voz.${(r.mimeType || "").includes("mp4") ? "m4a" : "webm"}`);
          fd.append("language", "es");
          const res = await fetchLargo("/api/empresa/ai/transcribe", { method: "POST", body: fd });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.transcript?.trim()) throw new Error("No te entendí. Intenta otra vez, más cerca del micrófono.");
          setEstado("espera");
          await procesar(j.transcript);
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo pasar tu voz a texto.");
          setEstado("espera"); setEncendidos([]);
        }
      };
      rec.current = r; r.start();
      setEstado("escuchando"); setNivel(0); encender(["oido"]); setDicho("…"); setRespuesta(""); setAcciones([]);
    } catch {
      setError("No hay permiso para el micrófono. Actívalo en el navegador y vuelve a tocar el núcleo.");
    }
  }, [estado, encender, procesar]);

  // ⌥ Espacio abre y cierra el micrófono; Esc sale de pantalla completa.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") { e.preventDefault(); void microfono(); }
      if (e.key === "Escape" && completa) setCompleta(false);
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [microfono, completa]);
  useEffect(() => { document.documentElement.style.overflow = completa ? "hidden" : ""; return () => { document.documentElement.style.overflow = ""; }; }, [completa]);

  // Escenario: la esfera de partículas con sus regiones, enlaces y nodos (ver esfera.ts).
  useEffect(() => {
    const cv = lienzo.current, st = escenario.current;
    if (!cv || !st) return;
    return iniciarEsfera({ lienzo: cv, escenario: st, vivo, conexiones, memoria });
  }, [conexiones, memoria]);

  const N = conexiones.length;
  const posicion = (i: number) => { const p = posicionEnAnillo(i, N); return { left: `${p.x}%`, top: `${p.y}%` }; };
  const areas = memoria?.areas ?? [];
  const posArea = (i: number) => { const p = posicionEnAnillo(i, areas.length, 45); return { left: `${p.x}%`, top: `${p.y}%` }; };
  const maxN = areas[0]?.n ?? 1;
  const ocupado = estado === "pensando" || estado === "transcribiendo";
  const sugerencias = ["¿Qué tengo hoy?", "¿Quién me debe dinero?", "Abre los leads"];

  return (
    <div ref={raiz} className={`jv${completa ? " jv-full" : ""}`}>
      <div className="jv-top">
        <div className="jv-brand">
          <div className="jv-glyph" aria-hidden>
            <svg viewBox="0 0 100 100" className="jv-logo"><g strokeLinecap="round" strokeLinejoin="round" strokeWidth="8"><path className="jv-c3" d="M20 72 50 84 80 72" fill="none" /><path className="jv-c2" d="M20 54 50 66 80 54" fill="none" /><path className="jv-c1" d="M20 36 50 16 80 36 50 48Z" /></g></svg>
          </div>
          <div className="jv-hola">
            <span className="jv-word">JARVIS</span>
            <h1>{nombre ? `Hola, ${nombre}` : "Hola"}</h1>
            <p><span className="jv-fecha">{fecha}</span> · {resumen}</p>
          </div>
        </div>
        <div className="jv-tele" aria-label="Estado del sistema">
          <div><span className="jv-k">Hora</span><b suppressHydrationWarning>{hora || "--:--:--"}</b></div>
          <div><span className="jv-k">Enlaces</span><b>{enLinea} / {sistemasN.length}</b></div>
          <div><span className="jv-k">Nivel</span><b>{nivel ? `N${nivel}` : "—"}</b></div>
          {memoria && modo === "memoria" && <div><span className="jv-k">Memoria</span><b>{memoria.nodos.toLocaleString("es-PA")} piezas</b></div>}
        </div>
        <div className="jv-tools">
          {principal}
          {memoria && (
            <div className="jv-seg" role="group" aria-label="Vista del núcleo">
              <button type="button" aria-pressed={modo === "conexiones"} onClick={() => { setModo("conexiones"); setDetalle({ d: "Toca cualquier conexión para ver qué aporta." }); }}>Conexiones</button>
              <button type="button" aria-pressed={modo === "memoria"} onClick={() => { setModo("memoria"); setDetalle({ t: "Memoria", d: `El código de Pime mapeado con Graphify: ${memoria.nodos.toLocaleString("es-PA")} piezas y ${memoria.aristas.toLocaleString("es-PA")} conexiones, agrupadas por área. Toca un área.` }); }}>Memoria</button>
            </div>
          )}
          <button type="button" className="jv-ib" aria-pressed={vozActiva} onClick={() => { const v = !vozActiva; setVozActiva(v); try { localStorage.setItem("jarvis-voz", v ? "1" : "0"); if (!v) window.speechSynthesis?.cancel(); } catch { /* sin almacenamiento */ } }} aria-label={vozActiva ? "Apagar la voz de Jarvis" : "Encender la voz de Jarvis"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{vozActiva ? ICONOS.voz : <><path d="M4 10v4h4l5 4V6L8 10Z" /><path d="m17 9 4 6M21 9l-4 6" /></>}</svg><span className="jv-lbl">{vozActiva ? "Voz" : "Sin voz"}</span>
          </button>
          <button type="button" className="jv-ib jv-fs" aria-pressed={completa} onClick={() => setCompleta((c) => !c)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg><span className="jv-lbl">{completa ? "Salir" : "Pantalla completa"}</span>
          </button>
        </div>
      </div>

      <div className="jv-main">
        <div className="jv-col jv-l">{izquierda}</div>

        <div className="jv-st">
          <div className="jv-stage" ref={escenario} data-modo={modo}>
            <canvas ref={lienzo} aria-hidden />
            <button type="button" className="jv-core" onClick={() => { if (Date.now() - vivo.current.finArrastre > 300) void microfono(); }} aria-label={estado === "escuchando" ? "Dejar de escuchar" : "Hablarle a Jarvis"} />
            {conexiones.map((c, i) => (
              <button key={c.id} type="button" className={`jv-node${encendidos.includes(c.id) ? " jv-on" : ""}`} data-ancla={c.id} data-tipo={c.tipo} data-e={c.estado} style={{ ...posicion(i), ["--nc" as string]: `rgb(${colorDe(c.id, false)})`, ["--nc-claro" as string]: `rgb(${colorDe(c.id, true)})` }}
                aria-label={`${c.nombre}: ${c.resumen}`}
                onMouseEnter={() => { vivo.current.hover = c.id; }} onMouseLeave={() => { vivo.current.hover = null; }}
                onFocus={() => { vivo.current.hover = c.id; }} onBlur={() => { vivo.current.hover = null; }}
                onClick={() => { setDetalle({ t: c.nombre, d: c.detalle }); encender([c.id]); setTimeout(() => setEncendidos((e) => (e.length === 1 && e[0] === c.id ? [] : e)), 1800); }}>
                <span className="jv-hex"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONOS[c.tipo === "persona" ? "persona" : c.id]}</svg></span>
                <span className="jv-nl">{c.nombre}</span>
                <span className="jv-ns">{c.resumen}</span>
              </button>
            ))}
            {areas.map((a, i) => {
              const sz = Math.round(8 + 16 * Math.sqrt(a.n / maxN));
              const cruces = (memoria?.links ?? []).filter((l) => l[0] === a.id || l[1] === a.id).slice(0, 3).map((l) => `${l[0] === a.id ? l[1] : l[0]} (${l[2]})`);
              return (
                <button key={a.id} type="button" className={`jv-mnode${encendidos.includes(`m:${a.id}`) ? " jv-on" : ""}`} data-ancla={`m:${a.id}`} style={posArea(i)} aria-label={`${a.id}: ${a.n} piezas de código`}
                  onMouseEnter={() => { vivo.current.hover = `m:${a.id}`; }} onMouseLeave={() => { vivo.current.hover = null; }}
                  onClick={() => { setEncendidos([`m:${a.id}`]); setDetalle({ t: a.id, d: `${a.n.toLocaleString("es-PA")} piezas de código. Lo más conectado: ${a.top.join(", ")}.${cruces.length ? ` Se cruza con ${cruces.join(", ")}.` : ""}` }); }}>
                  <span className="jv-mdot" style={{ width: sz, height: sz }} />
                  <span className="jv-nl">{a.id}</span>
                  <span className="jv-ns">{a.n.toLocaleString("es-PA")}</span>
                </button>
              );
            })}
          </div>

          <div className="jv-titulo" aria-hidden><span>JARVIS</span><small>Núcleo de Pime · {NOMBRES[estado].toLowerCase()}</small></div>
          <div className="jv-voice">
            <div className="jv-state" aria-live="polite">{NOMBRES[estado]}</div>
            {dicho && <p className="jv-said">{dicho}</p>}
            {error ? <p className="jv-reply" data-e="mal" role="alert">{error}</p> : respuesta ? <p className="jv-reply">{respuesta}</p> : !dicho && <p className="jv-reply">Toca el núcleo o pulsa ⌥ Espacio para hablarme, o escríbeme abajo.</p>}
            {acciones.length > 0 && (
              <ul className="jv-acts">
                {acciones.map((a) => (
                  <li key={a.id} className="jv-act" data-e={a.estado}>
                    <p>{a.summary}<small>{a.estado === "propuesta" ? (a.motivo ?? "Por confirmar") : a.estado === "hecha" ? "Hecho" : a.estado === "cancelada" ? "Cancelado" : a.estado === "deshecha" ? "Deshecho" : (a.error ?? "No se pudo")}{a.error && a.estado !== "error" ? ` · ${a.error}` : ""}</small></p>
                    <span className="jv-act-b">
                      {a.estado === "propuesta" && <><button type="button" className="jv-btn" disabled={a.ocupado} onClick={() => void decidir(a, "confirmar")}>Confirmar</button><button type="button" className="jv-btn jv-sec" disabled={a.ocupado} onClick={() => void decidir(a, "cancelar")}>Cancelar</button></>}
                      {a.estado === "hecha" && <button type="button" className="jv-btn jv-sec" disabled={a.ocupado} onClick={() => void decidir(a, "deshacer")}>Deshacer</button>}
                      {a.href && a.estado === "hecha" && <a className="jv-link" href={a.href}>Ver</a>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="jv-levels" aria-label="Nivel del pedido">
              <span className={nivel === 1 ? "jv-on" : ""}>N1 · al instante</span>
              <span className={nivel === 2 ? "jv-on" : ""}>N2 · respuesta</span>
              <span className={nivel === 3 ? "jv-on" : ""}>N3 · hace cambios</span>
            </div>
            <form className="jv-ask" onSubmit={(e) => { e.preventDefault(); void procesar(texto); }}>
              <label htmlFor="jarvis-pedido" className="sr-only">Pídele algo a Jarvis</label>
              <input id="jarvis-pedido" className="jv-in" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pídele algo a Jarvis…" autoComplete="off" disabled={ocupado} enterKeyHint="send" />
              <button type="button" className="jv-mic" aria-pressed={estado === "escuchando"} disabled={ocupado} onClick={() => void microfono()} aria-label={estado === "escuchando" ? "Dejar de escuchar" : "Hablar"}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONOS.oido}</svg>
              </button>
            </form>
            {!dicho && <div className="jv-sug">{sugerencias.map((s) => <button key={s} type="button" onClick={() => void procesar(s)}>{s}</button>)}</div>}
            <p className="jv-detail" aria-live="polite">{detalle.t && <><b>{detalle.t}</b> · </>}{detalle.d}</p>
          </div>
        </div>

        <div className="jv-col jv-r">{derecha}</div>
      </div>

      <div className="jv-more">{abajo}</div>
    </div>
  );
}
