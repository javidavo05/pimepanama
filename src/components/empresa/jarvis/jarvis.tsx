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
  const vivo = useRef({ estado: "espera" as Estado, encendidos: [] as string[], hover: null as string | null, modo: "conexiones" as "conexiones" | "memoria", pulsos: [] as { a: string; b?: string; t: number; v: number; grande: boolean }[] });
  const rec = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  const enLinea = conexiones.filter((c) => c.estado === "ok").length;

  useEffect(() => { vivo.current.estado = estado; }, [estado]);
  useEffect(() => { vivo.current.modo = modo; vivo.current.pulsos = []; }, [modo]);
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
    for (const id of ids) for (let i = 0; i < 3; i++) vivo.current.pulsos.push({ a: id, t: 1 + i * 0.14, v: -0.02, grande: true });
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

  // Escenario: núcleo, anillos, líneas y pulsos. 30 cuadros por segundo y en pausa si no se ve.
  useEffect(() => {
    const cv = lienzo.current, st = escenario.current;
    if (!cv || !st) return;
    const ctx0 = cv.getContext("2d");
    if (!ctx0) return;
    const ctx: CanvasRenderingContext2D = ctx0;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Colores del tema actual (claro u oscuro), leídos de las variables de .jv: se releen si cambia el tema.
    const paleta = { c: "111 168 255", aviso: "255 181 71", apagado: "88 115 137", hot: "242 247 255" };
    const leerPaleta = () => {
      const s = getComputedStyle(raiz.current ?? st);
      const v = (n: string, d: string) => s.getPropertyValue(n).trim() || d;
      paleta.c = v("--jv-rgb", paleta.c); paleta.aviso = v("--jv-amber-rgb", paleta.aviso); paleta.apagado = v("--jv-faint-rgb", paleta.apagado);
      paleta.hot = document.documentElement.dataset.theme === "light" ? "255 255 255" : "242 247 255";
    };
    leerPaleta();
    const mo = new MutationObserver(() => { leerPaleta(); if (quieto) dibujar(0); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    let W = 0, H = 0, raf = 0, ultimo = 0, visible = true;
    // Partículas: en espera forman el símbolo de Pime (las tres capas); al hablar, pensar o responder se
    // deshacen en una esfera viva. Coordenadas del símbolo tomadas del SVG de marca (viewBox 100, centro 50,50).
    const NP = Math.min(2400, Math.max(800, Math.round((st.clientWidth || 600) * 3.2)));
    const lx = new Float32Array(NP), ly = new Float32Array(NP), sx = new Float32Array(NP), sy = new Float32Array(NP), sz = new Float32Array(NP);
    const capa = new Uint8Array(NP), retraso = new Float32Array(NP), tam = new Float32Array(NP), fase = new Float32Array(NP);
    const px = new Float32Array(NP), py = new Float32Array(NP), vx = new Float32Array(NP), vy = new Float32Array(NP);
    const dentroRombo = (x: number, y: number) => Math.abs(x - 50) / 30 + Math.abs(y - 36) / (y < 36 ? 20 : 12) <= 1;
    const enLinea = (y0: number) => { const u = Math.random(), x = 20 + u * 60, y = y0 + (u < 0.5 ? u * 2 : (1 - u) * 2) * 12; return [x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6]; };
    for (let i = 0; i < NP; i++) {
      const r = Math.random();
      let x: number, y: number;
      if (r < 0.5) { capa[i] = 0; do { x = 20 + Math.random() * 60; y = 16 + Math.random() * 32; } while (!dentroRombo(x, y)); }
      else if (r < 0.75) { capa[i] = 1; [x, y] = enLinea(54); }
      else { capa[i] = 2; [x, y] = enLinea(72); }
      lx[i] = (x - 50) / 34; ly[i] = (y - 50) / 34;
      // Esfera de Fibonacci: reparto parejo en la superficie.
      const k = i + 0.5, phi = Math.acos(1 - (2 * k) / NP), th = Math.PI * (1 + Math.sqrt(5)) * k;
      sx[i] = Math.cos(th) * Math.sin(phi); sy[i] = Math.cos(phi); sz[i] = Math.sin(th) * Math.sin(phi);
      retraso[i] = Math.random() * 0.45; tam[i] = 1.1 + Math.random() * 1.6; fase[i] = Math.random() * 6.283;
    }
    let morf = 0, iniciado = false;
    const puntero = { x: -9999, y: -9999 };
    const mover = (e: PointerEvent) => { const r = st.getBoundingClientRect(); puntero.x = e.clientX - r.left; puntero.y = e.clientY - r.top; };
    const salir = () => { puntero.x = -9999; puntero.y = -9999; };
    st.addEventListener("pointermove", mover); st.addEventListener("pointerleave", salir);
    const N = conexiones.length;
    const posNodo = (i: number) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / N; return { a, x: W / 2 + Math.cos(a) * W * 0.4, y: H / 2 + Math.sin(a) * H * 0.4 }; };
    const areas = memoria?.areas ?? [];
    const posArea = (i: number) => {
      const interior = i < 8, lista = interior ? 8 : Math.max(1, areas.length - 8), k = interior ? i : i - 8;
      const a = (interior ? -Math.PI / 2 : -Math.PI / 2 + 0.24) + (k * Math.PI * 2) / lista, r = interior ? 0.27 : 0.43;
      return { a, x: W / 2 + Math.cos(a) * W * r, y: H / 2 + Math.sin(a) * H * r };
    };
    const indice = new Map(conexiones.map((c, i) => [c.id, i]));
    const indiceArea = new Map(areas.map((a, i) => [a.id, i]));
    const curva = (i: number) => {
      const p = posNodo(i), R = Math.min(W, H) * 0.2;
      const x0 = W / 2 + Math.cos(p.a) * R * 1.18, y0 = H / 2 + Math.sin(p.a) * R * 1.18, x1 = p.x - Math.cos(p.a) * 24, y1 = p.y - Math.sin(p.a) * 24;
      return { x0, y0, x1, y1, qx: (x0 + x1) / 2 - (y1 - y0) * 0.18, qy: (y0 + y1) / 2 + (x1 - x0) * 0.18 };
    };
    const enCurva = (c: { x0: number; y0: number; x1: number; y1: number; qx: number; qy: number }, t: number) => { const u = 1 - t; return [u * u * c.x0 + 2 * u * t * c.qx + t * t * c.x1, u * u * c.y0 + 2 * u * t * c.qy + t * t * c.y1]; };
    const anillo = (x: number, y: number, r: number, w: number, color: string, a0 = 0, a1 = Math.PI * 2) => { ctx.beginPath(); ctx.arc(x, y, r, a0, a1); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke(); };
    const marcas = (x: number, y: number, r: number, n: number, largo: number, giro: number, color: string, cada: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < n; i++) { const a = giro + (i * Math.PI * 2) / n, L = i % cada === 0 ? largo * 2 : largo; ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * (r - L), y + Math.sin(a) * (r - L)); }
      ctx.stroke();
    };
    const medir = () => {
      const r = st.getBoundingClientRect(); W = r.width; H = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (quieto) dibujar(0);
    };
    function dibujar(ms: number) {
      const v = vivo.current, t = ms / 1000, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.2, C = paleta.c, AM = paleta.aviso, OFF = paleta.apagado;
      const vel = v.estado === "pensando" || v.estado === "transcribiendo" ? 4 : v.estado === "escuchando" ? 1.6 : 1;
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.6); g.addColorStop(0, `rgb(${C} / .16)`); g.addColorStop(1, `rgb(${C} / 0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (v.modo === "memoria" && memoria) {
        const wmax = memoria.links[0]?.[2] ?? 1;
        for (const [a, b, w] of memoria.links) {
          const ia = indiceArea.get(a), ib = indiceArea.get(b); if (ia === undefined || ib === undefined) continue;
          const A = posArea(ia), B = posArea(ib), on = v.hover === `m:${a}` || v.hover === `m:${b}` || v.encendidos.includes(`m:${a}`) || v.encendidos.includes(`m:${b}`);
          const qx = (A.x + B.x) / 2 + (cx - (A.x + B.x) / 2) * 0.35, qy = (A.y + B.y) / 2 + (cy - (A.y + B.y) / 2) * 0.35;
          ctx.save(); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(qx, qy, B.x, B.y);
          ctx.lineWidth = 0.6 + (2 * w) / wmax; ctx.strokeStyle = `rgb(${C} / ${on ? 0.9 : 0.08 + (0.3 * w) / wmax})`;
          if (on) { ctx.shadowColor = `rgb(${C} / .9)`; ctx.shadowBlur = 10; }
          ctx.stroke(); ctx.restore();
          if (!quieto && Math.random() < (0.024 * w) / wmax) v.pulsos.push({ a, b, t: 0, v: 0.008, grande: false });
        }
      } else {
        conexiones.forEach((c, i) => {
          const k = curva(i), on = v.encendidos.includes(c.id) || v.hover === c.id, aviso = c.estado !== "ok";
          ctx.save(); ctx.beginPath(); ctx.moveTo(k.x0, k.y0); ctx.quadraticCurveTo(k.qx, k.qy, k.x1, k.y1);
          if (aviso) ctx.setLineDash([4, 6]);
          const col = c.estado === "aviso" ? AM : c.estado === "apagado" ? OFF : C;
          ctx.lineWidth = on ? 1.6 : 1; ctx.strokeStyle = `rgb(${col} / ${on ? 0.95 : aviso ? 0.45 : 0.24})`;
          if (on) { ctx.shadowColor = `rgb(${col} / .9)`; ctx.shadowBlur = 12; }
          ctx.stroke(); ctx.restore();
          ctx.beginPath(); ctx.arc(k.x0, k.y0, on ? 3 : 2, 0, 6.283); ctx.fillStyle = `rgb(${col} / ${on ? 1 : 0.6})`; ctx.fill();
          if (!aviso && !quieto && Math.random() < 0.004 * vel) v.pulsos.push({ a: c.id, t: 1, v: -0.006 - Math.random() * 0.004, grande: false });
        });
      }
      for (let p = v.pulsos.length - 1; p >= 0; p--) {
        const q = v.pulsos[p]; q.t += quieto ? 0 : q.v;
        if (q.t < 0 || q.t > 1.6) { v.pulsos.splice(p, 1); continue; }
        if (q.t > 1) continue;
        let pt: number[] | null = null;
        if (q.b && v.modo === "memoria") {
          const ia = indiceArea.get(q.a), ib = indiceArea.get(q.b);
          if (ia !== undefined && ib !== undefined) { const A = posArea(ia), B = posArea(ib); pt = enCurva({ x0: A.x, y0: A.y, x1: B.x, y1: B.y, qx: (A.x + B.x) / 2 + (cx - (A.x + B.x) / 2) * 0.35, qy: (A.y + B.y) / 2 + (cy - (A.y + B.y) / 2) * 0.35 }, q.t); }
        } else if (!q.b && v.modo === "conexiones") {
          const i = indice.get(q.a); if (i !== undefined) pt = enCurva(curva(i), q.t);
        }
        if (!pt) { v.pulsos.splice(p, 1); continue; }
        ctx.beginPath(); ctx.arc(pt[0], pt[1], q.grande ? 3.5 : 2, 0, 6.283);
        ctx.fillStyle = q.grande ? `rgb(${paleta.hot})` : `rgb(${C} / .9)`; ctx.shadowColor = `rgb(${C} / 1)`; ctx.shadowBlur = q.grande ? 16 : 8; ctx.fill(); ctx.shadowBlur = 0;
      }
      marcas(cx, cy, R * 1.62, 180, 3, t * 0.03 * vel, `rgb(${C} / .22)`, 15);
      anillo(cx, cy, R * 1.45, 1, `rgb(${C} / .12)`);
      for (let k = 0; k < 3; k++) { const a0 = -t * 0.35 * vel + k * 2.094; anillo(cx, cy, R * 1.45, 2, `rgb(${C} / .75)`, a0, a0 + 0.55); }
      ctx.save(); ctx.setLineDash([2, 8]); anillo(cx, cy, R * 1.25, 1, `rgb(${C} / .4)`); ctx.restore();
      marcas(cx, cy, R * 1.12, 72, 6, -t * 0.12 * vel, `rgb(${C} / .55)`, 6);
      if ((v.estado === "pensando" || v.estado === "transcribiendo") && !quieto) {
        const sw = t * 3; ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 1.6, sw, sw + 0.6); ctx.closePath();
        const gs = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.6); gs.addColorStop(0, `rgb(${C} / 0)`); gs.addColorStop(1, `rgb(${C} / .18)`);
        ctx.fillStyle = gs; ctx.fill(); ctx.restore();
      }
      // Brillo suave detrás de las partículas.
      const gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
      gc.addColorStop(0, `rgb(${C} / ${document.documentElement.dataset.theme === "light" ? 0.1 : 0.22})`); gc.addColorStop(1, `rgb(${C} / 0)`);
      ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, 6.283); ctx.fill();
      // Del símbolo a la esfera según el estado, con un desfase por partícula para que se desarme en cascada.
      const objetivo = v.estado === "espera" ? 0 : 1;
      morf += (objetivo - morf) * (quieto ? 1 : 0.06);
      const claro = document.documentElement.dataset.theme === "light";
      const colores = claro ? ["111 168 255", "31 91 255", "11 29 58"] : ["111 168 255", "76 125 255", "232 240 255"];
      const amp = v.estado === "hablando" ? 0.14 : v.estado === "escuchando" ? 0.09 : v.estado === "pensando" || v.estado === "transcribiendo" ? 0.05 : 0.02;
      const giro = t * (0.25 + 0.5 * vel * 0.25), cg = Math.cos(giro), sg = Math.sin(giro), inc = 0.38, ci = Math.cos(inc), si = Math.sin(inc);
      const vaiven = Math.sin(t * 0.6) * 0.35, cv0 = Math.cos(vaiven), abre = (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.09;
      const RS = R * 1.05, RL = R * 0.95;
      ctx.save();
      if (!claro) ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < NP; i++) {
        // Símbolo: las capas se abren y cierran (capas abiertas) y el conjunto se mece en 3D.
        const dy = capa[i] === 0 ? -abre : capa[i] === 2 ? abre : 0;
        const ax = cx + lx[i] * cv0 * RL, ay = cy + (ly[i] + dy) * RL;
        // Esfera: gira, se inclina y respira con la voz.
        const x1 = sx[i] * cg + sz[i] * sg, z1 = -sx[i] * sg + sz[i] * cg;
        const y2 = sy[i] * ci - z1 * si, z2 = sy[i] * si + z1 * ci;
        const ruido = 1 + amp * Math.sin(t * 7 + fase[i] * 3 + sy[i] * 5);
        const persp = 1 / (1.6 - z2 * 0.6);
        const bx = cx + x1 * RS * ruido * persp * 1.2, by = cy + y2 * RS * ruido * persp * 1.2;
        const m = Math.min(1, Math.max(0, (morf * 1.45 - retraso[i])));
        const e = m * m * (3 - 2 * m);
        let tx = ax + (bx - ax) * e, ty = ay + (by - ay) * e;
        // El puntero empuja las partículas y vuelven solas.
        const ddx = tx + vx[i] - puntero.x, ddy = ty + vy[i] - puntero.y, d2 = ddx * ddx + ddy * ddy;
        if (d2 < 3600 && !quieto) { const f = (1 - d2 / 3600) * 6; const d = Math.sqrt(d2) || 1; vx[i] += (ddx / d) * f; vy[i] += (ddy / d) * f; }
        vx[i] *= 0.9; vy[i] *= 0.9; tx += vx[i]; ty += vy[i];
        if (!iniciado) { px[i] = tx; py[i] = ty; }
        px[i] += (tx - px[i]) * 0.35; py[i] += (ty - py[i]) * 0.35;
        const fondo = e * (1 - (z2 + 1) / 2);
        const a = (claro ? 0.8 + 0.2 * Math.sin(t * 2 + fase[i]) : 0.6 + 0.4 * Math.sin(t * 2 + fase[i])) * (1 - fondo * 0.7);
        const s = tam[i] * (1 + e * (persp - 0.6));
        ctx.fillStyle = `rgb(${colores[capa[i]]} / ${a.toFixed(2)})`;
        ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s);
      }
      ctx.restore();
      iniciado = true;
    }
    const bucle = (ms: number) => {
      raf = requestAnimationFrame(bucle);
      if (!visible || document.hidden || ms - ultimo < 33) return;
      ultimo = ms; dibujar(ms);
    };
    const ro = new ResizeObserver(medir); ro.observe(st); medir();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(st);
    if (!quieto) raf = requestAnimationFrame(bucle);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); st.removeEventListener("pointermove", mover); st.removeEventListener("pointerleave", salir); };
  }, [conexiones, memoria]);

  const N = conexiones.length;
  const posicion = (i: number) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / N; return { left: `${50 + Math.cos(a) * 40}%`, top: `${50 + Math.sin(a) * 40}%` }; };
  const areas = memoria?.areas ?? [];
  const posArea = (i: number) => {
    const interior = i < 8, lista = interior ? 8 : Math.max(1, areas.length - 8), k = interior ? i : i - 8;
    const a = (interior ? -Math.PI / 2 : -Math.PI / 2 + 0.24) + (k * Math.PI * 2) / lista, r = interior ? 27 : 43;
    return { left: `${50 + Math.cos(a) * r}%`, top: `${50 + Math.sin(a) * r}%` };
  };
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
          <div><span className="jv-k">Enlaces</span><b>{enLinea} / {N}</b></div>
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
            <button type="button" className="jv-core" onClick={() => void microfono()} aria-label={estado === "escuchando" ? "Dejar de escuchar" : "Hablarle a Jarvis"} />
            {conexiones.map((c, i) => (
              <button key={c.id} type="button" className={`jv-node${encendidos.includes(c.id) ? " jv-on" : ""}`} data-tipo={c.tipo} data-e={c.estado} style={posicion(i)}
                aria-label={`${c.nombre}: ${c.resumen}`}
                onMouseEnter={() => { vivo.current.hover = c.id; }} onMouseLeave={() => { vivo.current.hover = null; }}
                onFocus={() => { vivo.current.hover = c.id; }} onBlur={() => { vivo.current.hover = null; }}
                onClick={() => { setDetalle({ t: c.nombre, d: c.detalle }); encender([c.id]); setTimeout(() => setEncendidos((e) => (e.length === 1 && e[0] === c.id ? [] : e)), 1800); }}>
                <span className="jv-hex"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONOS[c.id]}</svg></span>
                <span className="jv-nl">{c.nombre}</span>
                <span className="jv-ns">{c.resumen}</span>
              </button>
            ))}
            {areas.map((a, i) => {
              const sz = Math.round(8 + 16 * Math.sqrt(a.n / maxN));
              const cruces = (memoria?.links ?? []).filter((l) => l[0] === a.id || l[1] === a.id).slice(0, 3).map((l) => `${l[0] === a.id ? l[1] : l[0]} (${l[2]})`);
              return (
                <button key={a.id} type="button" className={`jv-mnode${encendidos.includes(`m:${a.id}`) ? " jv-on" : ""}`} style={posArea(i)} aria-label={`${a.id}: ${a.n} piezas de código`}
                  onMouseEnter={() => { vivo.current.hover = `m:${a.id}`; }} onMouseLeave={() => { vivo.current.hover = null; }}
                  onClick={() => { setEncendidos([`m:${a.id}`]); setDetalle({ t: a.id, d: `${a.n.toLocaleString("es-PA")} piezas de código. Lo más conectado: ${a.top.join(", ")}.${cruces.length ? ` Se cruza con ${cruces.join(", ")}.` : ""}` }); }}>
                  <span className="jv-mdot" style={{ width: sz, height: sz }} />
                  <span className="jv-nl">{a.id}</span>
                  <span className="jv-ns">{a.n.toLocaleString("es-PA")}</span>
                </button>
              );
            })}
          </div>

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
