"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/app/(empresa)/empresa/actions";
import { NotificationBell } from "@/components/empresa/mail/notification-bell";

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
      <div className="md:hidden fixed top-0 inset-x-0 h-14 z-40 bg-[#07070e] border-b border-white/[0.05] flex items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06] transition-all text-lg shrink-0"
        >
          {open ? "✕" : "☰"}
        </button>
        <div className="relative w-7 h-7 rounded-md bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 flex items-center justify-center shrink-0 overflow-hidden">
          <Image src={logoSrc} alt={companyName} fill sizes="28px" className="object-contain p-0.5" onError={() => setLogoFailed(true)} />
        </div>
        <p className="text-white text-xs font-semibold tracking-widest uppercase flex-1 truncate">{companyName}</p>
        <NotificationBell />
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-[#07070e] border-r border-white/[0.05] flex flex-col z-50 transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-md bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src={logoSrc}
                alt={companyName}
                fill
                sizes="32px"
                className="object-contain p-0.5"
                onError={() => setLogoFailed(true)}
              />
            </div>
            <div>
              <p className="text-white text-xs font-semibold tracking-widest uppercase">
                {companyName}
              </p>
              <p className="text-[#1AA7F0] text-[10px] tracking-[0.25em] uppercase mt-0.5">
                Suite
              </p>
            </div>
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
                  ? "bg-[#1AA7F0]/10 text-[#1AA7F0] border border-[#1AA7F0]/20"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/empresa/correos/hub" && <NotificationBell />}
            </Link>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="px-3 py-3 border-t border-white/[0.05] space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(item.href)
                  ? "bg-[#1AA7F0]/10 text-[#1AA7F0] border border-[#1AA7F0]/20"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* User + sign out */}
          <div className="mt-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <p className="text-white/60 text-xs truncate">{userEmail}</p>
            <form action={signOutAction} className="mt-1.5">
              <button
                type="submit"
                className="text-white/55 hover:text-red-400 text-xs transition-colors"
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
