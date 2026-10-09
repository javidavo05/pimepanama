"use client";
// Navegación. Origen: la cabecera de documento de la referencia (ícono + PIME a la izquierda,
// nombre de la sección en mayúsculas a la derecha, línea abajo). Se oculta al bajar y vuelve al subir,
// se compacta con el scroll, el indicador de sección se desliza y el menú móvil abre en coreografía.
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PaletteButton } from "@/components/ui/command-palette";
import { NAV, type Lang } from "../../../content/site";
import "./nav.css";

export function Nav({ lang }: { lang: Lang }) {
  const n = NAV[lang];
  const pathname = usePathname();
  const home = `/${lang}`;
  const onHome = pathname === home;
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const linksRef = useRef<HTMLElement>(null);
  const lastY = useRef(0);

  // Barra de escritorio: las páginas siempre (Portfolio, Servicios, Empresa); las secciones de la home solo en la home.
  const items = [
    ...(onHome ? n.secciones.map((s) => ({ key: s.id, href: `${home}#${s.id}`, label: s.label, sec: true })) : []),
    ...n.paginas.map((p) => ({ key: p.href, href: p.href, label: p.label, sec: false })),
  ];

  // Scroll: dirección, compactación y sección activa (sin IntersectionObserver: un solo listener con rAF).
  useEffect(() => {
    let raf = 0;
    const ids = n.secciones.map((s) => s.id);
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      setCompact(y > 48);
      setHidden(y > 160 && y > lastY.current && !open);
      lastY.current = y;
      if (onHome) {
        let cur = "";
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= 140) cur = id;
        }
        setActive(cur);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [n.secciones, onHome, open]);

  const activeKey = onHome ? active : (items.find((i) => pathname.startsWith(i.href))?.key ?? "");

  // Indicador que se desliza bajo el enlace activo (solo transform).
  const placeIndicator = useCallback(() => {
    const nav = linksRef.current; if (!nav) return;
    const a = nav.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
    if (!a) { nav.style.setProperty("--ind-o", "0"); return; }
    nav.style.setProperty("--ind-x", `${a.offsetLeft}px`);
    nav.style.setProperty("--ind-w", String(a.offsetWidth));
    nav.style.setProperty("--ind-o", "1");
  }, [activeKey]);
  useEffect(() => {
    placeIndicator();
    window.addEventListener("resize", placeIndicator);
    return () => window.removeEventListener("resize", placeIndicator);
  }, [placeIndicator]);

  // Menú móvil: bloquea el scroll y cierra con Escape.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tag = onHome ? (n.secciones.find((s) => s.id === active)?.label ?? n.inicio) : (items.find((i) => i.key === activeKey)?.label ?? "");

  return (
    <>
    <header className="nav" data-motion="nav" data-hidden={hidden || undefined} data-compact={compact || undefined} data-open={open || undefined}>
      <div className="nav-bar wrap">
        <Link href={home} className="nav-brand" aria-label={`${n.marca}: ${n.inicio}`} onClick={() => setOpen(false)}>
          <Image src="/brand/logo_icon.png" alt="" width={16} height={20} priority />
          <span>PIME</span>
        </Link>

        <nav className="nav-links" aria-label={lang === "es" ? "Secciones" : "Sections"} ref={linksRef}>
          {items.map((i) => (
            <Link key={i.key} href={i.href} data-key={i.key} data-sec={i.sec || undefined} aria-current={activeKey === i.key ? "true" : undefined}>{i.label}</Link>
          ))}
          <span className="nav-ind" aria-hidden="true" />
        </nav>

        <div className="nav-right">
          <span className="nav-tag caps" aria-hidden="true"><span key={tag} className="nav-tag-in">{tag}</span></span>
          <PaletteButton lang={lang} />
          <span className="nav-theme"><ThemeToggle lang={lang} compact /></span>
          <Link href={n.idioma.href} className="nav-lang" hrefLang={lang === "es" ? "en" : "es"} title={n.idioma.title}>{n.idioma.label}</Link>
          <Button href={n.cta.href} size="sm" className="nav-cta">{n.cta.label}</Button>
          <button type="button" className="nav-burger" aria-expanded={open} aria-controls="nav-menu" aria-label={open ? n.cerrar : n.abrir} onClick={() => setOpen((v) => !v)}>
            <span /><span />
          </button>
        </div>
      </div>
    </header>

      <div id="nav-menu" className="nav-menu" data-open={open || undefined} inert={!open}>
        <ul className="nav-menu-list">
          {[...n.secciones.map((s) => ({ href: `${home}#${s.id}`, label: s.label })), ...n.paginas].map((i, idx) => (
            <li key={i.href} style={{ "--i": idx } as React.CSSProperties}>
              <Link href={i.href} className="nav-menu-link" onClick={() => setOpen(false)}><span>{i.label}</span></Link>
            </li>
          ))}
        </ul>
        <div className="nav-menu-foot">
          <div className="nav-menu-actions">
            <ThemeToggle lang={lang} />
            <Link href={n.idioma.href} className="nav-lang" title={n.idioma.title}>{n.idioma.label}</Link>
            <Button href={n.cta.href} arrow>{n.cta.label}</Button>
          </div>
        </div>
      </div>
    </>
  );
}
