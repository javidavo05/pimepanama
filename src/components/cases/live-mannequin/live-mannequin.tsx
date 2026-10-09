"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SAMPLE_MEASUREMENTS, VIEW_LABELS, type QuickView } from "./data";
import { computePose } from "./pose";
import "./live-mannequin.css";

/* El Canvas (three.js) se descarga solo en el navegador, nunca en el servidor. */
const Scene = dynamic(() => import("./scene"), { ssr: false });

type Support = "checking" | "yes" | "no";

/* La detección es propiedad del dispositivo: se sondea una sola vez (cada sondeo ocupa un contexto WebGL). */
let webglCached: boolean | null = null;
function detectWebgl(): boolean {
  if (webglCached !== null) return webglCached;
  webglCached = probeWebgl();
  return webglCached;
}
const noop = () => () => {};
const useWebgl = (): Support =>
  useSyncExternalStore(noop, () => (detectWebgl() ? "yes" : "no"), () => "checking" as Support);

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => true);

function probeWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    (gl?.getExtension("WEBGL_lose_context") as { loseContext: () => void } | null | undefined)?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** Silueta simple para quien no tiene WebGL. */
function Silhouette() {
  return (
    <svg className="lm-silhouette" viewBox="0 0 120 240" role="img" aria-label="Silueta de un maniquí con saco">
      <circle cx="60" cy="24" r="14" />
      <path d="M44 44h32l22 14 6 78-14 4-4-52-4 140H62l-2-70-2 70H46L42 88l-4 52-14-4 6-78z" />
    </svg>
  );
}

function Fallback({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="lm-fallback" role="status">
      <Silhouette />
      <p className="lm-fallback-title">{title}</p>
      <p className="lm-fallback-text">{text}</p>
      {action}
    </div>
  );
}

class Boundary extends Component<{ onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Fallback
        title="No se pudo dibujar el maniquí"
        text="Ocurrió un error al cargar la vista 3D. Las medidas no se perdieron."
        action={
          <button
            type="button"
            className="lm-retry"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onRetry();
            }}
          >
            Volver a cargar la vista 3D
          </button>
        }
      />
    );
  }
}

export interface LiveMannequinProps {
  /** Medidas en cm. Por defecto, las de muestra. */
  measurements?: Record<string, number>;
  activeField?: string | null;
  onActiveFieldChange?: (field: string) => void;
  className?: string;
}

export default function LiveMannequin({ measurements = SAMPLE_MEASUREMENTS, activeField = null, onActiveFieldChange, className }: LiveMannequinProps) {
  const support = useWebgl();
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [view, setView] = useState<{ v: QuickView; n: number }>({ v: "front", n: 0 });
  const reduced = useReducedMotion();
  const [stopped, setStopped] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Sin dibujar fuera de pantalla ni con la pestaña en segundo plano. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setTabHidden(document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const pose = useMemo(() => computePose(measurements), [measurements]);
  const onReady = useCallback(() => setReady(true), []);
  const onLost = useCallback(() => setLost(true), []);
  const onInteract = useCallback(() => setStopped(true), []);
  const onActive = useCallback((f: string) => onActiveFieldChange?.(f), [onActiveFieldChange]);

  const retry = () => {
    setLost(false);
    setReady(false);
    setGeneration((g) => g + 1);
  };

  const pickView = (v: QuickView) => {
    setStopped(true);
    setView((prev) => ({ v, n: prev.n + 1 }));
  };

  const autoRotate = !reduced && !stopped;

  return (
    <div ref={wrapRef} className={`lm-viewer${className ? ` ${className}` : ""}`} data-motion="orbit">
      {support === "no" && (
        <Fallback title="Tu navegador no muestra la vista 3D" text="Las medidas se leen igual en la lista. Prueba con otro navegador para ver el maniquí." />
      )}

      {support === "yes" && !lost && (
        <Boundary key={generation} onRetry={retry}>
          <Scene
            pose={pose}
            activeField={activeField}
            onActiveChange={onActive}
            view={view}
            autoRotate={autoRotate}
            paused={!visible || tabHidden}
            onInteract={onInteract}
            onReady={onReady}
            onLost={onLost}
          />
        </Boundary>
      )}

      {support === "yes" && lost && (
        <Fallback
          title="Se interrumpió la vista 3D"
          text="El navegador liberó el contexto gráfico. Las medidas están intactas."
          action={
            <button type="button" className="lm-retry" onClick={retry}>
              Recargar vista 3D
            </button>
          }
        />
      )}

      {support !== "no" && !ready && !lost && (
        <div className="lm-skeleton" aria-hidden="true">
          <span className="lm-skeleton-head" />
          <span className="lm-skeleton-body" />
        </div>
      )}

      {ready && !lost && (
        <>
          <p className="lm-label">Midiendo · Saco</p>
          <div className="lm-views" role="group" aria-label="Vista del maniquí">
            {(Object.keys(VIEW_LABELS) as QuickView[]).map((v) => (
              <button key={v} type="button" className="lm-view" aria-pressed={view.v === v} onClick={() => pickView(v)}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <p className="lm-hint">{stopped || reduced ? "Arrastra para girar" : "Gira solo · arrastra para tomar el control"}</p>
        </>
      )}
    </div>
  );
}
