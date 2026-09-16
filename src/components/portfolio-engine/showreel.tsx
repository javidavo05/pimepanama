"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Icon } from "@iconify/react";
import { shotFor, shotRoutes, type LocalizedProject } from "@/lib/portfolio/localize";
import type { EngineUi } from "./i18n";
import { SiteWindow } from "./site-window";
import { Kicker, LevelMeter, PressButton, PressLink, RingButton, StatusDot, hostOf, projectYears } from "./ui";

/** Tiempo mínimo en escena por sistema, y tiempo por cada pantalla suya. */
const STAGE_MIN_MS = 8000;
const PER_SCREEN_MS = 2600;

/** La primera ruta con captura real; si no hay, la primera del catálogo. */
export function heroRoute(p: LocalizedProject) {
  return p.routes.find((r) => p.shots[r.path]) ?? p.routes[0];
}

/**
 * Escenario principal: un proyecto a la vez, nombre gigante que se solapa con
 * la ventana, índice numérico, botón circular giratorio y transporte tipo
 * reproductor. Cada sistema recorre todas sus pantallas antes de pasar al
 * siguiente, con las dos próximas asomando detrás; se pausa al posar el cursor.
 */
export function Showreel({
  projects,
  ui,
  onOpenIndex,
}: {
  projects: LocalizedProject[];
  ui: EngineUi;
  onOpenIndex: () => void;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  // Cada salto deja una onda en el botón que lo disparó y un pulso en el arco.
  const [burst, setBurst] = useState<{ id: number; dir: number } | null>(null);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const total = projects.length;
  const project = projects[i];
  const screens = shotRoutes(project);
  const screenCount = Math.max(1, screens.length);
  const stageMs = Math.max(STAGE_MIN_MS, screenCount * PER_SCREEN_MS);
  // La pantalla visible sale del mismo reloj que el anillo: no hay un segundo temporizador.
  const screenIndex = reduce ? 0 : Math.min(screenCount - 1, Math.floor(progress * screenCount));
  const route = screens[screenIndex] ?? heroRoute(project);
  const within = reduce ? 0 : progress * screenCount - screenIndex;

  const go = useCallback(
    (delta: number) => {
      setDir(delta);
      setI((v) => (v + delta + total) % total);
      elapsedRef.current = 0;
      setProgress(0);
      setBurst({ id: Date.now(), dir: delta });
    },
    [total],
  );

  // Reloj del autoplay: acumula solo mientras no está pausado.
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    startRef.current = performance.now() - elapsedRef.current;
    const tick = (t: number) => {
      if (!paused) {
        elapsedRef.current = t - startRef.current;
        const p = elapsedRef.current / stageMs;
        if (p >= 1) {
          go(1);
          startRef.current = t;
        } else {
          setProgress(p);
        }
      } else {
        startRef.current = t - elapsedRef.current;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, go, reduce, i, stageMs]);

  const jumpToScreen = (k: number) => {
    elapsedRef.current = (k / screenCount) * stageMs;
    startRef.current = performance.now() - elapsedRef.current;
    setProgress(k / screenCount);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Parallax de las letras fantasma con el puntero.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const ghostL = useTransform(sx, (v) => v * -40);
  const ghostR = useTransform(sx, (v) => v * 40);
  const ghostY = useTransform(sy, (v) => v * 20);
  const winRx = useTransform(sy, (v) => v * -4);
  const winRy = useTransform(sx, (v) => v * 6);

  const onMove = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const idx = String(i + 1).padStart(2, "0");
  const ghost = project.name.split(" ")[0];

  return (
    <section
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      onMouseMove={reduce ? undefined : onMove}
      aria-roledescription="carousel"
      aria-label={ui.hero.kicker}
    >
      {/* Letras fantasma */}
      <motion.div className="pf-ghost absolute -left-[6vw] top-[22%] text-[28vw]" style={{ x: ghostL, y: ghostY }} aria-hidden>
        {ghost.slice(0, 2)}
      </motion.div>
      <motion.div className="pf-ghost absolute -right-[8vw] bottom-[8%] text-[28vw]" style={{ x: ghostR, y: ghostY }} aria-hidden>
        {ghost.slice(-2)}
      </motion.div>

      {/* Cabecera del escenario */}
      <div className="mx-auto flex w-full max-w-7xl items-start justify-between px-6 pt-8 sm:px-8">
        <Kicker accent>{ui.hero.kicker}</Kicker>
        <p className="pf-mono tabular-nums" style={{ color: "var(--pf-ink-3)" }}>
          <span style={{ color: "var(--pf-ink)" }}>{idx}</span> / {String(total).padStart(2, "0")}
        </p>
      </div>

      {/* Escenario */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-6 py-8 sm:px-8 sm:py-12">
        <div
          className="relative w-full max-w-[860px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Las dos pantallas siguientes asoman detrás: se ven varias partes del sistema a la vez. */}
          {!reduce && screens.length > 1
            ? [2, 1].map((offset) => {
                if (screens.length <= offset) return null;
                const r = screens[(screenIndex + offset) % screens.length];
                const side = offset === 1 ? 1 : -1;
                return (
                  <motion.div
                    key={`deck-${project.slug}-${offset}`}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 aspect-[16/10] w-full"
                    initial={{ opacity: 0, x: 0, rotate: 0, scale: 0.9 }}
                    animate={{ opacity: offset === 1 ? 0.55 : 0.3, x: `${side * (offset === 1 ? 9 : 14)}%`, y: `${offset === 1 ? -5 : -9}%`, rotate: side * (offset === 1 ? 4 : 7), scale: offset === 1 ? 0.86 : 0.76 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <SiteWindow brand={project.brand} screen={r.screen} path={r.path} host={hostOf(project)} live={false} showCursor={false} className="h-full w-full" radius={16} image={shotFor(project, r.path)} sampleLabel={ui.window.sample} sampleNote={ui.window.sampleNote} />
                  </motion.div>
                );
              })
            : null}

          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.div
              key={project.slug}
              custom={dir}
              initial={reduce ? false : { opacity: 0, x: dir * 80, rotate: dir * 3, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, rotate: -1.5, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, x: dir * -80, rotate: dir * -3, scale: 0.96 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ rotateX: winRx, rotateY: winRy, transformPerspective: 1400 }}
              className="relative aspect-[16/10] w-full"
            >
              <SiteWindow brand={project.brand} screen={route.screen} path={route.path} host={hostOf(project)} live className="h-full w-full" radius={16} image={shotFor(project, route.path)} priority={i === 0} sampleLabel={ui.window.sample} sampleNote={ui.window.sampleNote} />
            </motion.div>
          </AnimatePresence>

          {/* Una pieza por pantalla: la actual se llena con el reloj y cualquiera se puede elegir. */}
          {screens.length > 1 ? (
            <div className="relative mx-auto mt-4 flex w-full max-w-md items-center gap-3">
              <div className="flex flex-1 items-center gap-1" role="group" aria-label={ui.hero.screens(screens.length)}>
                {screens.map((r, k) => {
                  const fill = k < screenIndex ? 1 : k === screenIndex ? within : 0;
                  return (
                    <button
                      key={r.path}
                      type="button"
                      onClick={() => jumpToScreen(k)}
                      aria-label={ui.hero.screen(k + 1, screens.length, r.label)}
                      aria-current={k === screenIndex ? "true" : undefined}
                      className="group flex h-11 flex-1 items-center"
                    >
                      <span className="relative block h-1 w-full overflow-hidden rounded-full transition-[height] duration-300 group-hover:h-1.5" style={{ background: "var(--pf-line-2)" }}>
                        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${fill * 100}%`, background: k === screenIndex ? "var(--pf-accent)" : "var(--pf-ink-3)" }} />
                      </span>
                    </button>
                  );
                })}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={route.path}
                  className="pf-mono flex shrink-0 items-center gap-2 tabular-nums"
                  style={{ color: "var(--pf-ink-2)" }}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="hidden max-w-[10rem] truncate sm:inline">{route.label}</span>
                  <span style={{ color: "var(--pf-ink)" }}>
                    {String(screenIndex + 1).padStart(2, "0")}/{String(screens.length).padStart(2, "0")}
                  </span>
                </motion.p>
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        {/* Nombre gigante que cruza la ventana */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-2 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={project.slug}
                className="pf-display text-[clamp(2.1rem,9vw,8.5rem)]"
                style={{ color: "var(--pf-ink)", textShadow: "0 12px 60px rgba(0,0,0,0.6)" }}
                initial={reduce ? false : { opacity: 0, y: 30, filter: "blur(10px)", letterSpacing: "0.02em" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "-0.035em" }}
                exit={reduce ? undefined : { opacity: 0, y: -24, filter: "blur(10px)" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {project.name}
              </motion.h1>
            </AnimatePresence>
        </div>

        {/* Meta izquierda */}
        <div className="pointer-events-none absolute bottom-10 left-6 hidden max-w-xs flex-col gap-3 sm:px-2 lg:flex">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={project.slug} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="flex flex-col gap-2">
              <p className="pf-kicker" style={{ color: "var(--pf-ink-2)" }}>{project.client ?? "Pime Panamá"} · {projectYears(project)}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--pf-ink-2)" }}>{project.tagline}</p>
              <div className="flex items-center gap-4">
                <StatusDot status={project.status} label={project.statusLabel} />
                <span className="inline-flex items-center gap-2 text-[0.7rem]" style={{ color: "var(--pf-ink-3)" }}>
                  <LevelMeter level={project.complexity} label={project.complexityLabel} />
                  {project.complexityLabel}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Botón circular derecha */}
        <div className="absolute bottom-6 right-6 hidden lg:block">
          <RingButton text={ui.hero.next} onClick={() => go(1)} ariaLabel={ui.hero.next} progress={reduce ? undefined : progress}>
            <Icon icon="ph:skip-forward-fill" className="h-5 w-5" style={{ color: "var(--pf-ink)" }} />
          </RingButton>
        </div>
      </div>

      {/* Transporte inferior */}
      <div className="relative mx-auto w-full max-w-7xl px-6 pb-12 sm:px-8">
        <div className="relative mx-auto flex max-w-lg flex-col items-center">
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 600 90" className="pointer-events-none absolute -bottom-6 left-1/2 w-[min(100vw,600px)] -translate-x-1/2" aria-hidden>
              <path d="M0 90 A 300 300 0 0 1 600 90" fill="none" stroke="var(--pf-line-2)" strokeWidth="1" />
              <motion.path
                key={burst?.id ?? "idle"}
                d="M240 12 A 300 300 0 0 1 360 12"
                fill="none"
                stroke="var(--pf-accent)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={reduce || !burst ? false : { pathLength: 0, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <div className="relative flex items-center gap-8 pb-2 pt-8">
              <TransportButton onClick={() => go(-1)} label={ui.hero.prev} icon="ph:skip-back-fill" burst={burst?.dir === -1 ? burst.id : null} />
              <PressButton onClick={onOpenIndex} className="min-h-[44px] px-4 text-xs font-semibold uppercase tracking-[0.3em] transition-colors hover:text-white" style={{ color: "var(--pf-ink-2)" }}>
                {ui.hero.menu}
              </PressButton>
              <TransportButton onClick={() => go(1)} label={ui.hero.next} icon="ph:skip-forward-fill" burst={burst?.dir === 1 ? burst.id : null} />
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-4">
            <span className="lg:hidden"><StatusDot status={project.status} label={project.statusLabel} /></span>
            <PressLink href={project.href} strength="firm" className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.2em] transition hover:brightness-110" style={{ background: "var(--pf-accent)", color: "var(--pf-accent-ink)" }}>
              {ui.hero.open}
              <Icon icon="ph:arrow-right" className="h-3.5 w-3.5" />
            </PressLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Botón de transporte: al presionarlo emite una onda con el color de acento. */
function TransportButton({ onClick, label, icon, burst }: { onClick: () => void; label: string; icon: string; burst: number | null }) {
  const reduce = useReducedMotion();
  return (
    <PressButton onClick={onClick} strength="firm" aria-label={label} className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/5">
      <AnimatePresence>
        {burst && !reduce ? (
          <motion.span
            key={burst}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ border: "1.5px solid var(--pf-accent)" }}
            initial={{ scale: 0.6, opacity: 0.9 }}
            animate={{ scale: 1.9, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : null}
      </AnimatePresence>
      <Icon icon={icon} className="h-5 w-5" />
    </PressButton>
  );
}
