"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/app/(empresa)/empresa/actions";
import { NotificationBell } from "@/components/empresa/mail/notification-bell";
import { BrandMenu } from "@/components/empresa/brand-menu";

const NAV_ITEMS = [
  { href: "/empresa", label: "Dashboard", icon: "⬛", exact: true },
  { href: "/empresa/tareas", label: "Tareas", icon: "✅" },
  { href: "/empresa/clientes", label: "Clientes", icon: "👥" },
  { href: "/empresa/leads", label: "Leads", icon: "🎯" },
  { href: "/empresa/citas", label: "Citas", icon: "📅" },
  { href: "/empresa/proyectos", label: "Proyectos", icon: "🗂️" },
  { href: "/empresa/contratos", label: "Contratos", icon: "📑" },
  { href: "/empresa/cotizaciones", label: "Cotizaciones", icon: "📋" },
  { href: "/empresa/facturas", label: "Facturas", icon: "📄" },
  { href: "/empresa/cuentas-por-cobrar", label: "Por Cobrar", icon: "💰" },
  { href: "/empresa/por-pagar", label: "Por pagar", icon: "💸" },
  { href: "/empresa/platforms", label: "Platforms", icon: "🖥️" },
  { href: "/empresa/reuniones", label: "Reuniones", icon: "🎙️" },
  { href: "/empresa/bitacoras", label: "Bitácoras", icon: "📝" },
  { href: "/empresa/correos/hub", label: "Correos", icon: "✉️" },
];

const BOTTOM_ITEMS = [
  {
    href: "/empresa/configuracion",
    label: "Configuración",
    icon: "⚙️",
  },
];

interface SidebarNavProps {
  userEmail: string;
  companyName: string;
  logoUrl?: string;
}

export function SidebarNav({ userEmail, companyName, logoUrl }: SidebarNavProps) {
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const logoSrc = logoFailed ? "/logo-pime.png" : (logoUrl ?? "/logo-pime.png");

  // La pestaña tocada se marca y el menú se cierra en el mismo toque, sin
  // esperar a que llegue la página: esperar la respuesta del servidor era lo
  // que hacía sentir lenta la navegación en el celular.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setPendingHref(null);
  }, [pathname]);

  function isActive(href: string, exact = false) {
    if (pendingHref) return pendingHref === href;
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function onNavigate(e: React.MouseEvent, href: string) {
    // Abrir en otra pestaña no cambia esta página: nada que marcar.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    setOpen(false);
    if (href !== pathname) setPendingHref(href);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-panel-2 border-b border-line pt-[env(safe-area-inset-top)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="-ml-1 w-11 h-11 flex items-center justify-center rounded-lg text-fg-mute hover:text-fg hover:bg-fill-2 transition-all text-lg shrink-0"
          >
            {open ? "✕" : "☰"}
          </button>
          <div className="relative w-7 h-7 rounded-md bg-brand/10 border border-brand/25 flex items-center justify-center shrink-0 overflow-hidden">
            <Image src={logoSrc} alt={companyName} fill sizes="28px" className="object-contain p-0.5" onError={() => setLogoFailed(true)} />
          </div>
          <p className="text-fg text-xs font-semibold tracking-widest uppercase flex-1 truncate">{companyName}</p>
          <NotificationBell />
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          // theme-ok: velo de modal — oscurece el fondo en ambos temas a propósito
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-panel-2 border-r border-line flex flex-col z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:pt-0 md:pb-0 transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="px-4 py-6 border-b border-line">
          <div className="flex items-center gap-2">
            <BrandMenu
              companyName={companyName}
              logoSrc={logoSrc}
              onLogoError={() => setLogoFailed(true)}
            />
            <NotificationBell align="left" />
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => onNavigate(e, item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(item.href, item.exact)
                  ? "bg-brand/10 text-brand-fg border border-brand/20"
                  : "text-fg-faint hover:text-fg-soft hover:bg-fill"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="px-3 py-3 border-t border-line space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => onNavigate(e, item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(item.href)
                  ? "bg-brand/10 text-brand-fg border border-brand/20"
                  : "text-fg-faint hover:text-fg-soft hover:bg-fill"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* User + sign out */}
          <div className="mt-2 px-3 py-3 rounded-lg bg-fill border border-line">
            <p className="text-fg-dim text-xs truncate">{userEmail}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="-mx-2 px-2 min-h-8 inline-flex items-center rounded-md text-fg-dim hover:text-danger text-xs transition-colors"
              >
                Cerrar sesión →
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
