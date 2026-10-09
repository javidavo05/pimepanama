"use client";
// Pop-up de caso: las tarjetas del carril abren aquí el contenido del sistema sin cambiar de pantalla.
// Cada proyecto entra con su propio efecto (EFECTOS → case-modal.css). <dialog> nativo: foco atrapado, Esc
// cierra, la URL lleva ?caso=<slug> para poder compartir y el botón Atrás cierra. Con reduced-motion solo
// se desvanece.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { CaseContent, CASE_T } from "./case-content";
import type { Caso } from "../../../content/portfolio";
import type { Lang } from "../../../content/site";
import "./case-modal.css";

/** Efecto de entrada por proyecto. Los que no están usan "subir". */
export const EFECTOS: Record<string, string> = {
  svitzer: "marea", geogenius: "orbita", "uapa-suite": "telon", academyx: "pliegue", godmode: "iris", "bnb-real-estate": "deslizar",
  "holo-realty": "enfoque", "smart-church": "apertura", "john-henry": "costura", misaza: "giro", "pime-backup": "sello",
};

const Ctx = createContext<(slug: string) => void>(() => {});

export function CaseTrigger({ slug, href, className, children }: { slug: string; href: string; className?: string; children: ReactNode }) {
  const abrir = useContext(Ctx);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // nueva pestaña: deja pasar
    e.preventDefault(); abrir(slug);
  };
  return <Link href={href} className={className} data-motion="tilt" onClick={onClick}>{children}</Link>;
}

export function CaseModalProvider({ casos, lang, children }: { casos: Caso[]; lang: Lang; children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const empujado = useRef(false); // true si abrimos con pushState (Atrás cierra); false si la URL ya traía ?caso=
  const t = CASE_T[lang];
  const caso = casos.find((c) => c.slug === slug) ?? null;

  const abrir = useCallback((s: string) => {
    setCerrando(false); setSlug(s);
    const u = new URL(location.href); u.searchParams.set("caso", s);
    history.pushState({ caso: s }, "", u); empujado.current = true;
  }, []);
  const cerrar = useCallback((volver = true) => {
    const d = ref.current; if (!d || !d.open) return;
    setCerrando(true);
    const fin = () => { d.close(); setCerrando(false); setSlug(null); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) fin(); else setTimeout(fin, 220);
    const u = new URL(location.href);
    if (volver && u.searchParams.has("caso")) { if (empujado.current) history.back(); else { u.searchParams.delete("caso"); history.replaceState(null, "", u); } }
    empujado.current = false;
  }, []);

  useEffect(() => { // abre si la URL ya trae ?caso= y cierra con Atrás
    const s = new URL(location.href).searchParams.get("caso");
    const t0 = s && casos.some((c) => c.slug === s) ? setTimeout(() => setSlug(s), 0) : undefined;
    const pop = () => { if (!new URL(location.href).searchParams.get("caso")) cerrar(false); };
    addEventListener("popstate", pop); return () => { clearTimeout(t0); removeEventListener("popstate", pop); };
  }, [casos, cerrar]);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (caso && !d.open) { d.showModal(); d.scrollTop = 0; }
    document.documentElement.toggleAttribute("data-modal", !!caso);
  }, [caso]);

  return (
    <Ctx.Provider value={abrir}>
      {children}
      <dialog ref={ref} className="cm" data-motion="modal" data-efecto={caso ? EFECTOS[caso.slug] ?? "subir" : undefined} data-cerrando={cerrando || undefined}
        aria-labelledby="cm-title" onCancel={(e) => { e.preventDefault(); cerrar(); }}
        onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
        <div className="cm-panel">
          <div className="cm-bar">
            <Link href={caso ? `/${lang}/portfolio/${caso.slug}` : `/${lang}/portfolio`} className="link tap cm-ficha">{t.ficha} →</Link>
            <button type="button" className="cm-close tap" onClick={() => cerrar()} aria-label={t.cerrar}><span aria-hidden="true">×</span></button>
          </div>
          <div className="cm-wrap">
            {caso ? <CaseContent caso={caso} lang={lang} as="h2" titleId="cm-title" compact /> : null}
          </div>
        </div>
      </dialog>
    </Ctx.Provider>
  );
}
