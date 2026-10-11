"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCuenta, IconFacturas, IconInicio, IconProyectos, IconSalir, IconTickets } from "./iconos";
import { cerrarSesion } from "@/components/auth/totp";

const ITEMS = [
  { href: "/cliente", label: "Inicio", Icon: IconInicio },
  { href: "/cliente/proyectos", label: "Proyectos", Icon: IconProyectos },
  { href: "/cliente/tickets", label: "Tickets", Icon: IconTickets },
  { href: "/cliente/facturas", label: "Facturas", Icon: IconFacturas },
  { href: "/cliente/cuenta", label: "Cuenta", Icon: IconCuenta },
];

/**
 * Navegación de la cuenta. Desde tablet: barra arriba con las cinco secciones. En el teléfono: la
 * cabecera queda con el logo y la empresa, y las secciones bajan a una barra fija abajo, al alcance
 * del pulgar.
 */
export function NavPortal({ linea, empresa, persona }: { linea: "normal" | "premium"; empresa: string; persona: string }) {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/cliente" ? ruta === "/cliente" : ruta.startsWith(href));
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur supports-[backdrop-filter]:bg-panel/80" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 sm:px-6 h-16">
          <Link href="/cliente" className="flex items-center gap-3 min-w-0 min-h-11" aria-label="Inicio de tu cuenta">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de la línea */}
            <img src={`/brand/pime-${linea}-horizontal-color.svg`} alt="Pime" width={84} height={24} className="h-6 w-auto shrink-0" />
            <span className="hidden lg:block h-6 w-px bg-line-mid" aria-hidden />
            <span className="text-fg-dim text-sm font-semibold truncate sm:hidden lg:block">{empresa}</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 ml-auto" aria-label="Secciones">
            {ITEMS.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={activo(href) ? "page" : undefined}
                className={`rounded-lg px-3 min-h-10 inline-flex items-center text-sm font-semibold transition-colors ${activo(href) ? "bg-brand/10 text-brand-fg" : "text-fg-dim hover:text-fg hover:bg-fill"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={() => void cerrarSesion("/cliente/acceso")} className="ml-auto sm:ml-2 inline-flex items-center gap-2 rounded-lg px-3 min-h-10 text-sm font-semibold text-fg-dim hover:text-fg hover:bg-fill" title={`Salir (${persona})`}>
            <IconSalir /><span className="sr-only sm:not-sr-only">Salir</span>
          </button>
        </div>
      </header>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-panel/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Secciones">
        <ul className="grid grid-cols-5">
          {ITEMS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link href={href} aria-current={activo(href) ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-16 text-[11px] font-semibold ${activo(href) ? "text-brand-fg" : "text-fg-faint"}`}>
                <Icon width={22} height={22} />{label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
