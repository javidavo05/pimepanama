"use client";

import Link from "@/components/empresa/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Mac {
  id: string;
  name: string;
  canal: string;
  /** "usada 27 nov" o "vinculada 3 oct": distingue Macs con el mismo nombre. */
  detalle: string;
}

/** Lo que la Mac cuenta de sí misma al unirse y cada vez que se le pregunta. */
interface EstadoMac {
  on: boolean;
  nombre?: string;
  app?: string;
  accesibilidad?: boolean;
  /** Direcciones de la Mac en la red local, p. ej. http://192.168.1.5:47800 */
  lan?: string[];
}

type Orden =
  | { a: "next" | "prev" | "first" | "last" | "black" | "chrome" | "click" }
  | { a: "move"; dx: number; dy: number };

type Conexion =
  "conectando" | "buscando" | "lista" | "sin-mac" | "apagada" | "error";

const HEARTBEAT_MS = 25_000;
/** Sin respuesta de la Mac en este tiempo, se avisa que no contesta. */
const ESPERA_MAC_MS = 4_000;
/** Mientras la pantalla está a la vista se le pregunta a la Mac si sigue ahí. */
const PING_MS = 15_000;

/**
 * Canal de Supabase Realtime con el protocolo de Phoenix, sin supabase-js: solo
 * se necesita unirse, mandar y escuchar broadcasts. Se reconecta solo.
 */
function useCanal(
  realtime: { url: string; anonKey: string },
  canal: string | null,
) {
  const [conexion, setConexion] = useState<Conexion>("conectando");
  const [estado, setEstado] = useState<EstadoMac | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const refRef = useRef(1);
  const esperaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [intento, setIntento] = useState(0);
  /** Dirección de la Mac por Wi-Fi directo, si el navegador deja llegar (Chrome en Android). */
  const [directo, setDirecto] = useState<string | null>(null);
  const directoRef = useRef<string | null>(null);
  const probando = useRef(new Set<string>());

  const topic = canal ? `realtime:${canal}` : null;

  const enviar = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !topic) return false;
      ws.send(
        JSON.stringify({
          topic,
          event: "broadcast",
          payload: { type: "broadcast", event, payload },
          ref: String(refRef.current++),
        }),
      );
      return true;
    },
    [topic],
  );

  const preguntar = useCallback(() => {
    if (!enviar("ping", {})) return;
    if (esperaRef.current) clearTimeout(esperaRef.current);
    esperaRef.current = setTimeout(
      () =>
        setConexion((c) => (c === "lista" || c === "buscando" ? "sin-mac" : c)),
      ESPERA_MAC_MS,
    );
  }, [enviar]);

  useEffect(() => {
    if (!topic) return;
    let cerrado = false;
    let latido: ReturnType<typeof setInterval> | null = null;
    let reintento: ReturnType<typeof setTimeout> | null = null;
    setConexion("conectando");
    usarDirecto(null);

    const base = realtime.url.replace(/^http/, "ws").replace(/\/$/, "");
    const ws = new WebSocket(
      `${base}/realtime/v1/websocket?apikey=${encodeURIComponent(realtime.anonKey)}&vsn=1.0.0`,
    );
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          topic,
          event: "phx_join",
          payload: {
            config: {
              broadcast: { self: false, ack: false },
              presence: { key: "" },
              private: false,
            },
          },
          ref: "join",
        }),
      );
      latido = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              topic: "phoenix",
              event: "heartbeat",
              payload: {},
              ref: String(refRef.current++),
            }),
          );
        }
      }, HEARTBEAT_MS);
    };

    ws.onmessage = (m) => {
      let d: {
        event?: string;
        ref?: string;
        payload?: { status?: string; event?: string; payload?: EstadoMac };
      };
      try {
        d = JSON.parse(String(m.data));
      } catch {
        return;
      }
      if (d.event === "phx_reply" && d.ref === "join") {
        if (d.payload?.status === "ok") {
          setConexion("buscando");
          preguntarInterno();
        } else setConexion("error");
        return;
      }
      if (
        d.event === "broadcast" &&
        d.payload?.event === "estado" &&
        d.payload.payload
      ) {
        const e = d.payload.payload;
        if (esperaRef.current) clearTimeout(esperaRef.current);
        setEstado(e);
        setConexion(e.on ? "lista" : "apagada");
        if (e.on && e.lan?.length && canal) probarDirecto(e.lan, canal);
        if (!e.on) usarDirecto(null);
      }
    };

    function preguntarInterno() {
      ws.send(
        JSON.stringify({
          topic,
          event: "broadcast",
          payload: { type: "broadcast", event: "ping", payload: {} },
          ref: String(refRef.current++),
        }),
      );
      if (esperaRef.current) clearTimeout(esperaRef.current);
      esperaRef.current = setTimeout(
        () =>
          setConexion((c) =>
            c === "buscando" || c === "lista" ? "sin-mac" : c,
          ),
        ESPERA_MAC_MS,
      );
    }

    ws.onclose = () => {
      if (latido) clearInterval(latido);
      if (cerrado) return;
      setConexion("error");
      reintento = setTimeout(
        () => setIntento((n) => n + 1),
        Math.min(2_000 * 2 ** Math.min(intento, 3), 15_000),
      );
    };

    return () => {
      cerrado = true;
      if (latido) clearInterval(latido);
      if (reintento) clearTimeout(reintento);
      if (esperaRef.current) clearTimeout(esperaRef.current);
      ws.close();
      wsRef.current = null;
    };
    // `intento` reabre el socket tras un corte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, realtime.url, realtime.anonKey, intento]);

  // Se le pregunta a la Mac de vez en cuando, y al volver a la app.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") preguntar();
    }, PING_MS);
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      const ws = wsRef.current;
      if (
        !ws ||
        ws.readyState === WebSocket.CLOSED ||
        ws.readyState === WebSocket.CLOSING
      )
        setIntento((n) => n + 1);
      else preguntar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [preguntar]);

  function usarDirecto(base: string | null) {
    directoRef.current = base;
    setDirecto(base);
  }

  /**
   * Prueba cada dirección local de la Mac. La primera vez Chrome pide el permiso
   * «dispositivos de la red local»: se espera hasta 30 s a que se responda.
   * Mientras tanto todo sigue por internet.
   */
  function probarDirecto(lan: string[], llave: string) {
    if (directoRef.current && lan.includes(directoRef.current)) return;
    for (const base of lan) {
      if (probando.current.has(base)) continue;
      probando.current.add(base);
      postLocal(base, "/ping", { k: llave }, 30_000)
        .then((r) => {
          if (r && !directoRef.current) usarDirecto(base);
        })
        .finally(() => probando.current.delete(base));
    }
  }

  const ordenar = useCallback(
    (o: Orden) => {
      const base = directoRef.current;
      if (base && canal) {
        postLocal(base, "/cmd", { ...o, k: canal }, 2_500).then((r) => {
          // Se cortó el Wi-Fi directo: esta orden y las siguientes van por internet.
          if (!r) {
            usarDirecto(null);
            enviar("cmd", o as unknown as Record<string, unknown>);
          }
        });
        return true;
      }
      return enviar("cmd", o as unknown as Record<string, unknown>);
    },
    [enviar, canal],
  );
  const reconectar = useCallback(() => setIntento((n) => n + 1), []);

  return { conexion, estado, ordenar, preguntar, reconectar, directo };
}

/**
 * POST a la Mac por la red local. `text/plain` evita el preflight de CORS y
 * `targetAddressSpace: "local"` le dice a Chrome que la IP privada es a
 * propósito (Local Network Access): así no lo bloquea como contenido mixto.
 */
async function postLocal(
  base: string,
  path: string,
  body: Record<string, unknown>,
  ms: number,
): Promise<EstadoMac | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
      targetAddressSpace: "local",
    } as RequestInit & { targetAddressSpace: string });
    if (!res.ok) return null;
    return (await res.json()) as EstadoMac;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** La pantalla del celular no se apaga mientras se presenta. */
function usePantallaEncendida() {
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<Lock> };
    };
    if (!nav.wakeLock) return;
    let lock: Lock | null = null;
    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      nav
        .wakeLock!.request("screen")
        .then((l) => (lock = l))
        .catch(() => undefined);
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      lock?.release().catch(() => undefined);
    };
  }, []);
}

function vibrar() {
  if ("vibrate" in navigator) navigator.vibrate?.(12);
}

export function ControlSlides({
  realtime,
  macs,
}: {
  realtime: { url: string; anonKey: string };
  macs: Mac[];
}) {
  const [macId, setMacId] = useState(macs[0]?.id ?? null);
  const mac = macs.find((m) => m.id === macId) ?? null;
  const [modo, setModo] = useState<"slides" | "puntero">("slides");
  const { conexion, estado, ordenar, preguntar, reconectar, directo } =
    useCanal(realtime, mac?.canal ?? null);
  usePantallaEncendida();

  const tocar = (o: Orden) => {
    vibrar();
    ordenar(o);
  };

  // Con teclado (o un clicker Bluetooth conectado al celular) también se avanza.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key))
        ordenar({ a: "next" });
      else if (["ArrowLeft", "PageUp"].includes(e.key)) ordenar({ a: "prev" });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ordenar]);

  return (
    // Pantalla completa, sin la navegación de la suite (grupo (presentar)): se
    // presenta con una mano y nada debe quedar a un toque de cambiar de sección.
    // En pantallas bajas (plegable cerrado) se desplaza en vez de recortar.
    <div className="fixed inset-0 flex flex-col overflow-y-auto overscroll-contain bg-canvas text-fg select-none pt-[max(12px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]">
      <header className="flex items-center gap-3 min-h-12">
        <Link
          href="/empresa"
          className="inline-flex items-center gap-1 min-h-12 pr-3 text-sm text-fg-dim hover:text-fg"
          aria-label="Salir del control de slides"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Salir
        </Link>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm font-semibold truncate">
            {estado?.nombre ?? mac?.name ?? "Control de slides"}
          </p>
          <EstadoLinea
            conexion={conexion}
            estado={estado}
            directo={directo !== null}
          />
        </div>
      </header>

      {macs.length === 0 ? (
        <SinMac />
      ) : (
        <>
          {macs.length > 1 && (
            <label className="mt-2 flex items-center gap-2 text-sm text-fg-dim">
              <span className="shrink-0">Mac</span>
              <select
                value={macId ?? ""}
                onChange={(e) => setMacId(e.target.value)}
                className="min-h-12 flex-1 min-w-0 rounded-xl border border-line bg-canvas px-3 text-base text-fg"
              >
                {macs.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.detalle}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Aviso
            conexion={conexion}
            estado={estado}
            onBuscar={preguntar}
            onReconectar={reconectar}
          />

          <div
            role="tablist"
            aria-label="Modo"
            className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-line p-1"
          >
            {(["slides", "puntero"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modo === m}
                onClick={() => setModo(m)}
                className={`min-h-11 rounded-lg text-sm font-medium transition-colors ${
                  modo === m ? "bg-brand/10 text-fg" : "text-fg-mute"
                }`}
              >
                {m === "slides" ? "Slides" : "Puntero"}
              </button>
            ))}
          </div>

          {modo === "slides" ? (
            <div className="mt-3 flex flex-1 shrink-0 flex-col gap-3">
              {/* En horizontal y en el plegable abierto, Anterior a la izquierda y Siguiente a la derecha. */}
              <div className="flex flex-1 shrink-0 flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => tocar({ a: "prev" })}
                  className="flex flex-[1] min-h-16 items-center justify-center gap-2 rounded-2xl border border-line-mid text-lg font-medium text-fg active:bg-fg-trace"
                >
                  <Flecha dir="izq" />
                  Anterior
                </button>
                <button
                  onClick={() => tocar({ a: "next" })}
                  className="flex flex-[2.4] min-h-24 items-center justify-center gap-3 rounded-2xl bg-brand text-2xl font-semibold text-on-brand active:bg-brand-hi"
                >
                  Siguiente
                  <Flecha dir="der" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Atajo
                  onClick={() => tocar({ a: "first" })}
                  titulo="Inicio"
                  ayuda="Primera slide (tecla Inicio)"
                />
                <Atajo
                  onClick={() => tocar({ a: "last" })}
                  titulo="Final"
                  ayuda="Última slide (tecla Fin)"
                />
                <Atajo
                  onClick={() => tocar({ a: "black" })}
                  titulo="Negro"
                  ayuda="Pantalla negra (tecla B)"
                />
                <Atajo
                  onClick={() => tocar({ a: "chrome" })}
                  titulo="Chrome"
                  ayuda="Trae Chrome al frente"
                />
              </div>
            </div>
          ) : (
            <Puntero ordenar={ordenar} tocar={tocar} />
          )}
        </>
      )}
    </div>
  );
}

function EstadoLinea({
  conexion,
  estado,
  directo,
}: {
  conexion: Conexion;
  estado: EstadoMac | null;
  directo: boolean;
}) {
  const via = directo ? "Wi-Fi directo" : "por internet";
  const { texto, color } =
    conexion === "lista"
      ? {
          texto: estado?.app
            ? `${via} · recibe ${estado.app}`
            : `Conectada ${via}`,
          color: "bg-ok",
        }
      : conexion === "buscando" || conexion === "conectando"
        ? { texto: "Buscando la Mac…", color: "bg-fg-faint" }
        : conexion === "apagada"
          ? { texto: "Control apagado en la Mac", color: "bg-warn" }
          : conexion === "sin-mac"
            ? { texto: "La Mac no contesta", color: "bg-warn" }
            : { texto: "Sin conexión, reintentando…", color: "bg-danger" };
  return (
    <p
      className="flex items-center justify-end gap-2 text-xs text-fg-dim"
      aria-live="polite"
    >
      <span
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`}
        aria-hidden
      />
      <span className="truncate">{texto}</span>
    </p>
  );
}

/** Lo que falta para que la Mac obedezca, con la acción que lo arregla. */
function Aviso({
  conexion,
  estado,
  onBuscar,
  onReconectar,
}: {
  conexion: Conexion;
  estado: EstadoMac | null;
  onBuscar: () => void;
  onReconectar: () => void;
}) {
  let titulo: string | null = null;
  let detalle = "";
  let accion: { texto: string; fn: () => void } | null = null;

  if (conexion === "sin-mac" || conexion === "apagada") {
    titulo =
      conexion === "apagada"
        ? "El control está apagado en la Mac"
        : "La Mac no contesta";
    detalle =
      "En la Mac abre PIME Guard en la barra de menú, pestaña Control, y enciéndelo.";
    accion = { texto: "Buscar la Mac otra vez", fn: onBuscar };
  } else if (conexion === "error") {
    titulo = "Sin conexión";
    detalle = "Revisa el Wi-Fi o los datos del celular. Se reintenta solo.";
    accion = { texto: "Reintentar ahora", fn: onReconectar };
  } else if (conexion === "lista" && estado?.accesibilidad === false) {
    titulo = "Falta un permiso en la Mac";
    detalle =
      "Ajustes del Sistema → Privacidad y seguridad → Accesibilidad → activa PIME Guard. Sin eso la Mac recibe las órdenes pero no puede pulsar teclas.";
  }
  if (!titulo) return null;

  return (
    <div className="mt-3 rounded-xl border border-warn/40 bg-warn/10 p-3">
      <p className="text-sm font-semibold text-fg">{titulo}</p>
      <p className="mt-1 text-sm leading-relaxed text-fg-dim">{detalle}</p>
      {accion && (
        <button
          onClick={accion.fn}
          className="mt-2 min-h-11 rounded-lg border border-line-mid px-3 text-sm font-medium text-fg"
        >
          {accion.texto}
        </button>
      )}
    </div>
  );
}

function SinMac() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-4">
      <p className="text-lg font-semibold">Vincula tu Mac primero</p>
      <p className="max-w-sm text-sm leading-relaxed text-fg-dim">
        El control manda Siguiente, Anterior y clics a una Mac con PIME Guard.
        Vincúlala una vez desde la Mac y vuelve aquí.
      </p>
      <Link
        href="/empresa/configuracion/mac"
        className="mt-2 inline-flex min-h-12 items-center rounded-xl bg-brand px-6 text-base font-semibold text-on-brand"
      >
        Vincular la Mac
      </Link>
    </div>
  );
}

function Atajo({
  onClick,
  titulo,
  ayuda,
}: {
  onClick: () => void;
  titulo: string;
  ayuda: string;
}) {
  return (
    <button
      onClick={onClick}
      title={ayuda}
      aria-label={ayuda}
      className="min-h-12 rounded-xl border border-line text-sm font-medium text-fg-dim active:bg-fg-trace"
    >
      {titulo}
    </button>
  );
}

function Flecha({ dir }: { dir: "izq" | "der" }) {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          dir === "der"
            ? "M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            : "M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
        }
      />
    </svg>
  );
}

/**
 * Panel táctil: arrastrar mueve el puntero de la Mac (con aceleración, como un
 * trackpad) y un toque corto hace clic. Los movimientos se juntan y salen como
 * mucho 30 veces por segundo.
 */
function Puntero({
  ordenar,
  tocar,
}: {
  ordenar: (o: Orden) => boolean;
  tocar: (o: Orden) => void;
}) {
  const ultimo = useRef<{ x: number; y: number; t: number } | null>(null);
  const inicio = useRef<{
    x: number;
    y: number;
    t: number;
    recorrido: number;
  } | null>(null);
  const pendiente = useRef({ dx: 0, dy: 0 });
  const frame = useRef<number | null>(null);
  const ultimoEnvio = useRef(0);

  const vaciar = useCallback(() => {
    frame.current = null;
    const ahora = performance.now();
    if (ahora - ultimoEnvio.current < 33) {
      frame.current = requestAnimationFrame(vaciar);
      return;
    }
    const { dx, dy } = pendiente.current;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    pendiente.current = { dx: 0, dy: 0 };
    ultimoEnvio.current = ahora;
    ordenar({ a: "move", dx: Math.round(dx), dy: Math.round(dy) });
  }, [ordenar]);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return (
    <div className="mt-3 flex flex-1 shrink-0 flex-col gap-3">
      <div
        className="relative flex flex-1 min-h-48 items-center justify-center rounded-2xl border border-line-mid bg-fg-trace/40 touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const t = performance.now();
          ultimo.current = { x: e.clientX, y: e.clientY, t };
          inicio.current = { x: e.clientX, y: e.clientY, t, recorrido: 0 };
        }}
        onPointerMove={(e) => {
          const u = ultimo.current;
          if (!u) return;
          const t = performance.now();
          const mx = e.clientX - u.x;
          const my = e.clientY - u.y;
          const vel = Math.hypot(mx, my) / Math.max(t - u.t, 1); // px por ms
          const factor = 1.4 + Math.min(vel * 1.6, 3);
          pendiente.current.dx += mx * factor;
          pendiente.current.dy += my * factor;
          if (inicio.current) inicio.current.recorrido += Math.hypot(mx, my);
          ultimo.current = { x: e.clientX, y: e.clientY, t };
          if (!frame.current) frame.current = requestAnimationFrame(vaciar);
        }}
        onPointerUp={() => {
          const i = inicio.current;
          if (i && i.recorrido < 8 && performance.now() - i.t < 280)
            tocar({ a: "click" });
          ultimo.current = null;
          inicio.current = null;
        }}
        onPointerCancel={() => {
          ultimo.current = null;
          inicio.current = null;
        }}
      >
        <p className="pointer-events-none px-6 text-center text-sm leading-relaxed text-fg-faint">
          Arrastra para mover el puntero.
          <br />
          Toca para hacer clic.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => tocar({ a: "prev" })}
          className="min-h-14 rounded-xl border border-line-mid text-base font-medium"
          aria-label="Slide anterior"
        >
          Anterior
        </button>
        <button
          onClick={() => tocar({ a: "click" })}
          className="min-h-14 rounded-xl border border-line-mid text-base font-medium"
        >
          Clic
        </button>
        <button
          onClick={() => tocar({ a: "next" })}
          className="min-h-14 rounded-xl bg-brand text-base font-semibold text-on-brand"
          aria-label="Slide siguiente"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
