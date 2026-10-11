"use client";
// Contador vivo de un carrusel o de un carril fijado: «03 / 11» y una barra que avanzan con el desplazamiento.
// En teléfono y tableta lee el scroll horizontal del riel; en escritorio, si el carril está fijado (pinned),
// lee el avance de la sección con el scroll de la página. Un solo listener pasivo con rAF; sin estado al montar.
import { useEffect, useRef, useState } from "react";
import "./rail-meter.css";

type Props = { root: string; rail: string; n: number; pinned?: boolean; sufijo?: string; className?: string };

export function RailMeter({ root, rail, n, pinned, sufijo, className = "" }: Props) {
  const [i, setI] = useState(0);
  const [p, setP] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const sec = document.querySelector<HTMLElement>(root); const r = sec?.querySelector<HTMLElement>(rail); if (!sec || !r) return;
    let raf = 0;
    const medir = () => {
      raf = 0;
      let prog = 0;
      const enEscritorio = pinned && matchMedia("(min-width: 1024px)").matches;
      if (enEscritorio) { const rect = sec.getBoundingClientRect(); const recorrido = sec.offsetHeight - innerHeight; prog = recorrido > 0 ? Math.min(1, Math.max(0, -rect.top / recorrido)) : 0; }
      else { const max = r.scrollWidth - r.clientWidth; prog = max > 0 ? Math.min(1, Math.max(0, r.scrollLeft / max)) : 0; }
      const idx = Math.round(prog * (n - 1));
      setP(prog); if (idx !== prev.current) { prev.current = idx; setI(idx); }
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(medir); };
    r.addEventListener("scroll", pedir, { passive: true }); window.addEventListener("scroll", pedir, { passive: true }); window.addEventListener("resize", pedir);
    const id = setTimeout(pedir, 0);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); r.removeEventListener("scroll", pedir); window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); };
  }, [root, rail, n, pinned]);
  const cur = String(i + 1).padStart(2, "0"); const tot = String(n).padStart(2, "0");
  return (
    <span className={`meter ${className}`.trim()} data-motion="counter" aria-live="off">
      <span className="meter-n num"><span className="meter-cur" key={cur}>{cur}</span><span className="meter-sep">/</span>{tot}{sufijo ? <span className="meter-suf"> {sufijo}</span> : null}</span>
      <i className="meter-bar" aria-hidden="true"><b style={{ "--p": `${Math.round(p * 100)}%` } as React.CSSProperties} /></i>
    </span>
  );
}
