"use client";

import Link from "@/components/empresa/link";
import { useCallback, useEffect, useRef, useState } from "react";
import "./control-slides.css";

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

interface Acuse {
  a: Orden["a"];
  /** Ida y vuelta hasta la Mac; null cuando fue por internet (sin confirmación). */
  ms: number | null;
  via: "wifi" | "internet" | "fallo";
  n: number;
}

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
  /** La última orden y cuánto tardó la Mac en confirmarla (solo por Wi-Fi hay confirmación). */
  const [ultimo, setUltimo] = useState<Acuse | null>(null);

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
      const anotar = o.a !== "move";
      if (base && canal) {
        const t0 = performance.now();
        postLocal(base, "/cmd", { ...o, k: canal }, 2_500).then((r) => {
          if (r) {
            if (anotar)
              setUltimo({
                a: o.a,
                ms: Math.round(performance.now() - t0),
                via: "wifi",
                n: Date.now(),
              });
            if (r.app)
              setEstado((e) =>
                e && e.app !== r.app ? { ...e, app: r.app } : e,
              );
            return;
          }
          // Se cortó el Wi-Fi directo: esta orden y las siguientes van por internet.
          usarDirecto(null);
          const ok = enviar("cmd", o as unknown as Record<string, unknown>);
          if (anotar)
            setUltimo({
              a: o.a,
              ms: null,
              via: ok ? "internet" : "fallo",
              n: Date.now(),
            });
        });
        return true;
      }
      const ok = enviar("cmd", o as unknown as Record<string, unknown>);
      if (anotar)
        setUltimo({
          a: o.a,
          ms: null,
          via: ok ? "internet" : "fallo",
          n: Date.now(),
        });
      return ok;
    },
    [enviar, canal],
  );
  const reconectar = useCallback(() => setIntento((n) => n + 1), []);

  return { conexion, estado, ordenar, preguntar, reconectar, directo, ultimo };
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

const ETIQUETA: Record<Orden["a"], string> = {
  next: "Siguiente",
  prev: "Anterior",
  first: "Primera slide",
  last: "Última slide",
  black: "Pantalla negra",
  chrome: "Chrome al frente",
  click: "Clic",
  move: "Mover",
};

/** Cronómetro de la presentación: tocar arranca y pausa; con la pausa aparece reiniciar. */
function useCronometro() {
  const [desde, setDesde] = useState<number | null>(null);
  const [acumulado, setAcumulado] = useState(0);
  const [, setTic] = useState(0);
  useEffect(() => {
    if (desde === null) return;
    const t = setInterval(() => setTic((n) => n + 1), 1_000);
    return () => clearInterval(t);
  }, [desde]);
  const total = acumulado + (desde !== null ? Date.now() - desde : 0);
  const s = Math.floor(total / 1000);
  const texto =
    s >= 3600
      ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
      : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return {
    texto,
    corre: desde !== null,
    hayTiempo: total > 0,
    alternar: () => {
      if (desde === null) setDesde(Date.now());
      else {
        setAcumulado((a) => a + Date.now() - desde);
        setDesde(null);
      }
    },
    reiniciar: () => {
      setDesde(null);
      setAcumulado(0);
    },
  };
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
  const { conexion, estado, ordenar, preguntar, reconectar, directo, ultimo } =
    useCanal(realtime, mac?.canal ?? null);
  const crono = useCronometro();
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
    <div className="cs">
      <header className="cs-top">
        <Link
          href="/empresa"
          className="cs-icon-btn"
          aria-label="Salir del control de slides"
        >
          <Icono d="M15.75 19.5 8.25 12l7.5-7.5" />
        </Link>

        <div className="cs-mac">
          <p className="cs-mac-name">
            <span>{estado?.nombre ?? mac?.name ?? "Control de slides"}</span>
            {macs.length > 1 && (
              <Icono d="m19.5 8.25-7.5 7.5-7.5-7.5" size={14} />
            )}
          </p>
          <EstadoLinea
            conexion={conexion}
            estado={estado}
            directo={directo !== null}
            ultimo={ultimo}
          />
          {macs.length > 1 && (
            <select
              value={macId ?? ""}
              onChange={(e) => setMacId(e.target.value)}
              aria-label="Elegir la Mac"
            >
              {macs.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.detalle}
                </option>
              ))}
            </select>
          )}
        </div>

        {macs.length > 0 ? (
          <div style={{ display: "flex", gap: 8 }}>
            {!crono.corre && crono.hayTiempo && (
              <button
                className="cs-icon-btn"
                onClick={crono.reiniciar}
                aria-label="Reiniciar el cronómetro"
              >
                <Icono
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  size={18}
                />
              </button>
            )}
            <button
              className="cs-timer"
              data-corre={crono.corre}
              onClick={crono.alternar}
              aria-label={
                crono.corre ? "Pausar el cronómetro" : "Arrancar el cronómetro"
              }
            >
              <Icono
                d={
                  crono.corre
                    ? "M15.75 5.25v13.5m-7.5-13.5v13.5"
                    : "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                }
                size={16}
              />
              {crono.texto}
            </button>
          </div>
        ) : (
          <span />
        )}
      </header>

      {macs.length === 0 ? (
        <SinMac />
      ) : (
        <>
          <Aviso
            conexion={conexion}
            estado={estado}
            onBuscar={preguntar}
            onReconectar={reconectar}
          />

          <div
            role="tablist"
            aria-label="Modo"
            className="cs-modo"
            data-modo={modo}
          >
            <span className="cs-modo-pista" aria-hidden />
            {(["slides", "puntero"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modo === m}
                onClick={() => setModo(m)}
              >
                {m === "slides" ? "Slides" : "Puntero"}
              </button>
            ))}
          </div>

          {modo === "slides" ? (
            <>
              <div className="cs-escena">
                <button
                  className="cs-prev"
                  onClick={() => tocar({ a: "prev" })}
                  aria-label="Slide anterior"
                >
                  {ultimo?.a === "prev" && (
                    <span key={ultimo.n} className="cs-onda" aria-hidden />
                  )}
                  <span className="cs-flecha">
                    <Icono d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" size={28} />
                  </span>
                  <span className="cs-label">Anterior</span>
                </button>
                <button
                  className="cs-next"
                  onClick={() => tocar({ a: "next" })}
                  aria-label="Slide siguiente"
                >
                  {ultimo?.a === "next" && (
                    <span key={ultimo.n} className="cs-onda" aria-hidden />
                  )}
                  <span className="cs-flecha">
                    <Icono d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" size={36} />
                  </span>
                  <span className="cs-label">Siguiente</span>
                </button>
              </div>
              <Acuse ultimo={ultimo} />
              <div className="cs-tools">
                <Herramienta
                  onClick={() => tocar({ a: "first" })}
                  titulo="Inicio"
                  ayuda="Primera slide (tecla Inicio)"
                  d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5"
                />
                <Herramienta
                  onClick={() => tocar({ a: "last" })}
                  titulo="Final"
                  ayuda="Última slide (tecla Fin)"
                  d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5"
                />
                <Herramienta
                  onClick={() => tocar({ a: "black" })}
                  titulo="Negro"
                  ayuda="Pantalla negra (tecla B)"
                  d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                />
                <Herramienta
                  onClick={() => tocar({ a: "chrome" })}
                  titulo="Chrome"
                  ayuda="Trae Chrome al frente"
                  d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18M5.25 6h.008v.008H5.25V6ZM7.5 6h.008v.008H7.5V6Zm2.25 0h.008v.008H9.75V6Z"
                />
              </div>
            </>
          ) : (
            <Puntero ordenar={ordenar} tocar={tocar} ultimo={ultimo} />
          )}
        </>
      )}
    </div>
  );
}

function Icono({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function EstadoLinea({
  conexion,
  estado,
  directo,
  ultimo,
}: {
  conexion: Conexion;
  estado: EstadoMac | null;
  directo: boolean;
  ultimo: Acuse | null;
}) {
  let tono = "bad";
  let texto = "Sin conexión, reintentando…";
  if (conexion === "lista") {
    tono = "ok";
    const ms = directo && ultimo?.ms != null ? ` · ${ultimo.ms} ms` : "";
    texto = `${directo ? "Wi-Fi directo" : "Por internet"}${ms}${estado?.app ? ` · ${estado.app.replace(/^Google /, "")}` : ""}`;
  } else if (conexion === "buscando" || conexion === "conectando") {
    tono = "wait";
    texto = "Buscando la Mac…";
  } else if (conexion === "apagada") {
    tono = "warn";
    texto = "Control apagado en la Mac";
  } else if (conexion === "sin-mac") {
    tono = "warn";
    texto = "La Mac no contesta";
  }
  return (
    <p className="cs-status" aria-live="polite">
      <span className="cs-dot" data-tono={tono} aria-hidden />
      <span>{texto}</span>
    </p>
  );
}

/** Confirma cada orden: por Wi-Fi la Mac contesta y se ve cuánto tardó. */
function Acuse({ ultimo }: { ultimo: Acuse | null }) {
  let contenido: React.ReactNode =
    "Las flechas van a la app que esté al frente en la Mac";
  if (ultimo) {
    const que = <b>{ETIQUETA[ultimo.a]}</b>;
    contenido =
      ultimo.via === "wifi" ? (
        <>
          {que} · recibido en {ultimo.ms} ms
        </>
      ) : ultimo.via === "internet" ? (
        <>{que} · enviado por internet</>
      ) : (
        <>{que} · no salió: sin conexión</>
      );
  }
  return (
    <p className="cs-acuse" aria-live="polite">
      {contenido}
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
  let tono = "warn";
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
    tono = "bad";
    accion = { texto: "Reintentar ahora", fn: onReconectar };
  } else if (conexion === "lista" && estado?.accesibilidad === false) {
    titulo = "Falta un permiso en la Mac";
    detalle =
      "Ajustes del Sistema → Privacidad y seguridad → Device Control and Data Access (antes Accesibilidad) → activa PIME Guard.";
  }
  if (!titulo) return null;

  return (
    <div className="cs-aviso" data-tono={tono} role="status">
      <Icono
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        size={20}
      />
      <div>
        <p className="cs-aviso-t">{titulo}</p>
        <p className="cs-aviso-d">{detalle}</p>
        {accion && (
          <button onClick={accion.fn} className="cs-aviso-a">
            {accion.texto}
          </button>
        )}
      </div>
    </div>
  );
}

function SinMac() {
  return (
    <div className="cs-vacio">
      <span className="cs-vacio-icono">
        <Icono
          d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
          size={32}
        />
      </span>
      <h1>Vincula tu Mac primero</h1>
      <p>
        El control manda Siguiente, Anterior y clics a una Mac con PIME Guard.
        Vincúlala una vez y vuelve aquí.
      </p>
      <Link href="/empresa/configuracion/mac" className="cs-cta">
        Vincular la Mac
      </Link>
    </div>
  );
}

function Herramienta({
  onClick,
  titulo,
  ayuda,
  d,
}: {
  onClick: () => void;
  titulo: string;
  ayuda: string;
  d: string;
}) {
  return (
    <button
      onClick={onClick}
      title={ayuda}
      aria-label={ayuda}
      className="cs-tool"
    >
      <Icono d={d} size={22} />
      {titulo}
    </button>
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
  ultimo,
}: {
  ordenar: (o: Orden) => boolean;
  tocar: (o: Orden) => void;
  ultimo: Acuse | null;
}) {
  const ultimoPunto = useRef<{ x: number; y: number; t: number } | null>(null);
  const inicio = useRef<{
    x: number;
    y: number;
    t: number;
    recorrido: number;
  } | null>(null);
  const pendiente = useRef({ dx: 0, dy: 0 });
  const frame = useRef<number | null>(null);
  const ultimoEnvio = useRef(0);
  const [dedo, setDedo] = useState<{ x: number; y: number } | null>(null);
  const [usado, setUsado] = useState(false);

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

  const soltar = () => {
    ultimoPunto.current = null;
    inicio.current = null;
    setDedo(null);
  };

  return (
    <>
      <div
        className="cs-pad"
        data-activo={usado}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          const t = performance.now();
          ultimoPunto.current = { x: e.clientX, y: e.clientY, t };
          inicio.current = { x: e.clientX, y: e.clientY, t, recorrido: 0 };
          setDedo({ x: e.clientX - r.left, y: e.clientY - r.top });
          setUsado(true);
        }}
        onPointerMove={(e) => {
          const u = ultimoPunto.current;
          if (!u) return;
          const r = e.currentTarget.getBoundingClientRect();
          const t = performance.now();
          const mx = e.clientX - u.x;
          const my = e.clientY - u.y;
          const vel = Math.hypot(mx, my) / Math.max(t - u.t, 1); // px por ms
          const factor = 1.4 + Math.min(vel * 1.6, 3);
          pendiente.current.dx += mx * factor;
          pendiente.current.dy += my * factor;
          if (inicio.current) inicio.current.recorrido += Math.hypot(mx, my);
          ultimoPunto.current = { x: e.clientX, y: e.clientY, t };
          setDedo({ x: e.clientX - r.left, y: e.clientY - r.top });
          if (!frame.current) frame.current = requestAnimationFrame(vaciar);
        }}
        onPointerUp={() => {
          const i = inicio.current;
          if (i && i.recorrido < 8 && performance.now() - i.t < 280)
            tocar({ a: "click" });
          soltar();
        }}
        onPointerCancel={soltar}
      >
        <div className="cs-pad-hint">
          <Icono
            d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
            size={28}
          />
          <span>
            Arrastra para mover el puntero.
            <br />
            Toca para hacer clic.
          </span>
        </div>
        {dedo && (
          <span
            className="cs-dedo"
            style={{ left: dedo.x, top: dedo.y }}
            aria-hidden
          />
        )}
      </div>
      <Acuse ultimo={ultimo} />
      <div className="cs-pad-row">
        <button
          onClick={() => tocar({ a: "prev" })}
          aria-label="Slide anterior"
        >
          Anterior
        </button>
        <button onClick={() => tocar({ a: "click" })}>Clic</button>
        <button
          onClick={() => tocar({ a: "next" })}
          className="cs-pad-next"
          aria-label="Slide siguiente"
        >
          Siguiente
        </button>
      </div>
    </>
  );
}
