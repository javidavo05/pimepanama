"use client";
// Paleta ⌘K: buscador global de casos, industrias, capacidades y páginas. Abre con ⌘K / Ctrl+K o con el botón
// de la barra; escala al abrir con el fondo desenfocado, resultados en stagger, flechas y Enter para navegar,
// Esc para cerrar. <dialog> nativo (foco atrapado). Sin resultados: sugiere pedir una propuesta.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CASOS, INDUSTRIAS } from "../../../content/portfolio";
import { CAPACIDADES } from "../../../content/home";
import { NAV, type Lang } from "../../../content/site";
import "./command-palette.css";

type Item = { id: string; grupo: string; titulo: string; detalle?: string; href: string; chip: string };
const T = {
  es: { abrir: "Buscar", placeholder: "Buscar casos, industrias, capacidades o páginas", casos: "Casos", industrias: "Industrias", capacidades: "Capacidades", paginas: "Páginas", nada: "Nada con ese nombre.", pedir: "Pedir una propuesta", cerrar: "Cerrar", ayuda: "↑↓ moverse · Enter abrir · Esc cerrar" },
  en: { abrir: "Search", placeholder: "Search cases, industries, capabilities or pages", casos: "Cases", industrias: "Industries", capacidades: "Capabilities", paginas: "Pages", nada: "Nothing by that name.", pedir: "Request a proposal", cerrar: "Close", ayuda: "↑↓ move · Enter open · Esc close" },
};
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CommandPalette({ lang }: { lang: Lang }) {
  const t = T[lang]; const n = NAV[lang]; const home = `/${lang}`;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const items = useMemo<Item[]>(() => [
    ...CASOS.filter((c) => c.publicable).map((c) => ({ id: `c-${c.slug}`, grupo: t.casos, titulo: c.nombre, detalle: `${c.cliente} · ${c.industria[lang]}`, href: `${home}/portfolio/${c.slug}`, chip: c.cliente.slice(0, 2).toUpperCase() })),
    ...INDUSTRIAS(lang).map((i) => ({ id: `i-${i}`, grupo: t.industrias, titulo: i, href: `${home}/portfolio?industria=${encodeURIComponent(i)}`, chip: i.slice(0, 2).toUpperCase() })),
    ...CAPACIDADES[lang].items.map((c) => ({ id: `k-${c.id}`, grupo: t.capacidades, titulo: c.titulo, detalle: c.apoyo, href: `${home}#capacidades`, chip: c.n })),
    ...n.secciones.map((s) => ({ id: `p-${s.id}`, grupo: t.paginas, titulo: s.label, href: `${home}#${s.id}`, chip: s.label.slice(0, 2).toUpperCase() })),
    ...n.paginas.map((p) => ({ id: `p-${p.href}`, grupo: t.paginas, titulo: p.label, href: p.href, chip: p.label.slice(0, 2).toUpperCase() })),
    { id: "p-contacto", grupo: t.paginas, titulo: n.cta.label, href: n.cta.href, chip: "→" },
  ], [lang, t, n, home]);
  const res = useMemo(() => { const k = norm(q.trim()); return k ? items.filter((i) => norm(`${i.titulo} ${i.detalle ?? ""} ${i.grupo}`).includes(k)) : items; }, [q, items]);
  // Lista plana con índice (para flechas y aria) agrupada por título de grupo
  const grupos = useMemo(() => { const g = new Map<string, { r: Item; i: number }[]>(); res.forEach((r, i) => g.set(r.grupo, [...(g.get(r.grupo) ?? []), { r, i }])); return Array.from(g.entries()); }, [res]);

  const abrir = useCallback(() => { const d = ref.current; if (!d || d.open) return; setQ(""); setSel(0); d.showModal(); setTimeout(() => input.current?.focus(), 30); setOpen(true); }, []);
  const cerrar = useCallback(() => { const d = ref.current; if (!d || !d.open) return; setOpen(false); setTimeout(() => d.close(), 180); }, []);
  const ir = useCallback((href: string) => { cerrar(); router.push(href); }, [cerrar, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (ref.current?.open) cerrar(); else abrir(); }
    };
    const onOpen = () => abrir();
    window.addEventListener("keydown", onKey); window.addEventListener("pime:palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pime:palette", onOpen); };
  }, [abrir, cerrar]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, res.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const r = res[sel]; if (r) ir(r.href); else ir(n.cta.href); }
  };
  useEffect(() => { ref.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);

  return (
    <dialog ref={ref} className="cp" data-motion="palette" data-open={open || undefined} aria-label={t.abrir} onCancel={(e) => { e.preventDefault(); cerrar(); }} onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="cp-panel">
        <div className="cp-top">
          <svg className="cp-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input ref={input} className="cp-input" value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKeyDown} placeholder={t.placeholder} aria-label={t.placeholder} role="combobox" aria-expanded="true" aria-controls="cp-list" aria-activedescendant={res[sel] ? `cp-${res[sel].id}` : undefined} autoComplete="off" spellCheck={false} />
          <button type="button" className="cp-esc" onClick={cerrar} aria-label={t.cerrar}><kbd>Esc</kbd></button>
        </div>
        <div className="cp-list" id="cp-list" role="listbox">
          {res.length === 0 ? (
            <div className="cp-empty"><p>{t.nada}</p><button type="button" className="btn primary sm" onClick={() => ir(n.cta.href)}>{t.pedir} →</button></div>
          ) : grupos.map(([g, lista]) => (
            <div className="cp-group" key={g}>
              <span className="cp-group-t caps">{g}</span>
              {lista.map(({ r, i }) => (
                // eslint-disable-next-line react-hooks/refs -- `ir` solo toca el <dialog> dentro del manejador de clic, no en el render
                <button type="button" key={r.id} id={`cp-${r.id}`} role="option" aria-selected={sel === i} data-i={i} className={`cp-item ${sel === i ? "on" : ""}`} style={{ "--i": i } as React.CSSProperties} onMouseEnter={() => setSel(i)} onClick={() => ir(r.href)}>
                  <span className="cp-chip">{r.chip}</span>
                  <span className="cp-body"><span className="cp-t">{r.titulo}</span>{r.detalle && <span className="cp-d">{r.detalle}</span>}</span>
                  <span className="cp-go" aria-hidden="true">↵</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="cp-foot meta">{t.ayuda}</div>
      </div>
    </dialog>
  );
}

/** Botón de la barra: abre la paleta. */
export function PaletteButton({ lang, className = "" }: { lang: Lang; className?: string }) {
  const t = T[lang];
  return (
    <button type="button" className={`cp-btn ${className}`.trim()} onClick={() => window.dispatchEvent(new Event("pime:palette"))} aria-label={t.abrir} data-motion="palette">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      <span className="cp-btn-l">{t.abrir}</span><kbd className="cp-kbd" aria-hidden="true">⌘K</kbd>
    </button>
  );
}
