"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/app/(empresa)/empresa/actions";
import { NotificationBell } from "@/components/empresa/mail/notification-bell";

const NAV_ITEMS = [
  { href: "/empresa", label: "Dashboard", icon: "⬛", exact: true },
  { href: "/empresa/clientes", label: "Clientes", icon: "👥" },
  { href: "/empresa/proyectos", label: "Proyectos", icon: "🗂️" },
  { href: "/empresa/contratos", label: "Contratos", icon: "📑" },
  { href: "/empresa/cotizaciones", label: "Cotizaciones", icon: "📋" },
  { href: "/empresa/facturas", label: "Facturas", icon: "📄" },
  { href: "/empresa/cuentas-por-cobrar", label: "Por Cobrar", icon: "💰" },
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
  const logoSrc = logoFailed ? "/logo-pime.png" : (logoUrl ?? "/logo-pime.png");

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#07070e] border-r border-white/[0.05] flex flex-col z-50">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 flex items-center justify-center shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt={companyName}
              className="w-full h-full object-contain p-0.5"
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
              className="text-white/30 hover:text-red-400 text-xs transition-colors"
            >
              Cerrar sesión →
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
