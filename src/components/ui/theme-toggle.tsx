"use client";
// Tema: Auto (sigue al sistema), Claro u Oscuro. Se guarda en localStorage y se aplica antes del primer
// paint con el script de layout, así no hay destello. El estado se lee del atributo data-theme del html.
import { useSyncExternalStore } from "react";
import type { Lang } from "../../../content/site";

type Tema = "auto" | "light" | "dark";
const L = { es: { auto: "Auto", light: "Claro", dark: "Oscuro", label: "Tema" }, en: { auto: "Auto", light: "Light", dark: "Dark", label: "Theme" } };

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const leer = (): Tema => { const t = document.documentElement.getAttribute("data-theme"); return t === "dark" || t === "light" ? t : "auto"; };

export function ThemeToggle({ lang, compact }: { lang: Lang; compact?: boolean }) {
  const tema = useSyncExternalStore(subscribe, leer, () => "auto" as Tema);
  const apply = (t: Tema) => {
    try { if (t === "auto") localStorage.removeItem("tema"); else localStorage.setItem("tema", t); } catch {}
    if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
    // La barra del navegador del teléfono sigue al tema elegido (los <meta theme-color> con media solo siguen al sistema)
    const oscuro = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => { m.content = oscuro ? "#08142A" : "#FCFDFE"; });
  };
  const l = L[lang];
  return (
    <div className={`theme ${compact ? "compact" : ""}`} role="group" aria-label={l.label} data-motion="swap">
      {(["auto", "light", "dark"] as Tema[]).map((t) => (
        <button key={t} type="button" className="theme-opt" aria-pressed={tema === t} onClick={() => apply(t)} title={l[t]}>
          <span className="theme-ico" data-t={t} aria-hidden="true" /><span className="theme-l">{l[t]}</span>
        </button>
      ))}
    </div>
  );
}
