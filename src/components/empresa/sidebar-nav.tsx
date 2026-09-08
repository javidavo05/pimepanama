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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 z-40 bg-panel-2 border-b border-line flex items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-fg-mute hover:text-fg hover:bg-fill-2 transition-all text-lg shrink-0"
        >
          {open ? "✕" : "☰"}
        </button>
        <div className="relative w-7 h-7 rounded-md bg-brand/10 border border-brand/25 flex items-center justify-center shrink-0 overflow-hidden">
          <Image src={logoSrc} alt={companyName} fill sizes="28px" className="object-contain p-0.5" onError={() => setLogoFailed(true)} />
        </div>
        <p className="text-fg text-xs font-semibold tracking-widest uppercase flex-1 truncate">{companyName}</p>
        <NotificationBell />
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
        className={`fixed left-0 top-0 h-full w-60 bg-panel-2 border-r border-line flex flex-col z-50 transform transition-transform duration-200 ease-out ${
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
            <form action={signOutAction} className="mt-1.5">
              <button
                type="submit"
                className="text-fg-dim hover:text-danger text-xs transition-colors"
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
