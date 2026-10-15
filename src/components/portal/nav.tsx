"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconCuenta, IconFacturas, IconInicio, IconProyectos, IconSalir, IconTickets } from "./iconos";
import { LogoPime } from "./marca";
import { cerrarSesion } from "@/components/auth/totp";

const ITEMS = [
  { href: "/cliente", label: "Inicio", Icon: IconInicio },
  { href: "/cliente/proyectos", label: "Proyectos", Icon: IconProyectos },
  { href: "/cliente/tickets", label: "Tickets", Icon: IconTickets },
  { href: "/cliente/facturas", label: "Facturas", Icon: IconFacturas },
  { href: "/cliente/cuenta", label: "Cuenta", Icon: IconCuenta },
];

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Navegación de la cuenta, como la del sitio: banda de capas arriba, barra que se compacta al bajar, una línea
 * que marca cuánto se leyó y un indicador que se desliza a la sección activa. En el teléfono las secciones bajan
 * a una barra fija al alcance del pulgar, con una pastilla que se desliza.
 */
export function NavPortal({ empresa, persona, logo }: { linea: "normal" | "premium"; empresa: string; persona: string; logo?: string | null }) {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/cliente" ? ruta === "/cliente" : ruta.startsWith(href));
  const k = Math.max(0, ITEMS.findIndex((x) => activo(x.href)));
  const [compacta, setCompacta] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number; o: number }>({ x: 0, w: 0, o: 0 });
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    const medir = () => setCompacta(window.scrollY > 8);
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);

  useIso(() => {
    const cont = tabs.current; if (!cont) return;
    const medir = () => {
      const n = cursor ?? (ITEMS.some((x) => activo(x.href)) ? k : -1);
      const a = n >= 0 ? cont.querySelectorAll<HTMLElement>("[data-tab]")[n] : null;
      if (!a) { setInd((p) => ({ ...p, o: 0 })); return; }
      setInd({ x: a.offsetLeft, w: a.offsetWidth, o: 1 });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [k, cursor, ruta]);

  return (
    <>
      <header className="p-nav" data-compacta={compacta ? "" : undefined} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="p-banda" aria-hidden><i /><i /><i /></div>
        <div className="p-nav-bar mx-auto flex w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/cliente" className="p-nav-logo flex items-center gap-3 min-w-0 min-h-11" aria-label="Inicio de tu cuenta">
            <LogoPime height={24} className="shrink-0" />
            <span className={`${logo ? "block" : "hidden lg:block"} h-6 w-px bg-line-mid`} aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element -- logo del cliente, servido desde su cuenta */}
            {logo && <img src={logo} alt={empresa} className="h-8 w-auto max-w-28 shrink-0 object-contain" />}
            <span className={`text-fg-dim text-sm font-semibold truncate ${logo ? "hidden xl:block" : "sm:hidden lg:block"}`}>{empresa}</span>
          </Link>
          <nav className="hidden sm:block ml-auto" aria-label="Secciones">
            <div ref={tabs} className="p-tabs flex items-center gap-1" onMouseLeave={() => setCursor(null)}>
              <span className="p-tab-ind" aria-hidden style={{ "--x": `${ind.x}px`, "--w": `${ind.w}px`, "--o": ind.o } as React.CSSProperties} />
              {ITEMS.map(({ href, label }, i) => (
                <Link key={href} href={href} data-tab aria-current={activo(href) ? "page" : undefined} onMouseEnter={() => setCursor(i)} onFocus={() => setCursor(i)} onBlur={() => setCursor(null)}
                  className={`p-tab rounded-lg px-3 min-h-11 inline-flex items-center text-sm font-semibold focus-visible:outline-none ${activo(href) ? "text-brand-fg" : "text-fg-dim hover:text-fg"}`}>
                  {label}
                </Link>
              ))}
            </div>
          </nav>
          <button type="button" onClick={() => void cerrarSesion("/cliente/acceso")} className="ml-auto sm:ml-2 inline-flex items-center gap-2 rounded-lg px-3 min-h-11 text-sm font-semibold text-fg-dim hover:text-fg hover:bg-fill transition-colors" title={`Salir (${persona})`}>
            <IconSalir /><span className="sr-only sm:not-sr-only">Salir</span>
          </button>
        </div>
        <span className="p-nav-progreso" aria-hidden />
      </header>
      <nav className="p-dock sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Secciones">
        <ul className="grid grid-cols-5">
          <li className="p-dock-ind" role="presentation" aria-hidden style={{ "--k": k } as React.CSSProperties} />
          {ITEMS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} aria-current={activo(href) ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-16 text-xs font-semibold transition-colors ${activo(href) ? "text-brand-fg" : "text-fg-faint"}`}>
                <Icon width={22} height={22} />{label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
