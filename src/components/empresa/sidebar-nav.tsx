"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/app/(empresa)/empresa/actions";
import { NotificationBell } from "@/components/empresa/mail/notification-bell";
import { BrandMenu } from "@/components/empresa/brand-menu";

/**
 * Íconos de la navegación: una sola familia, trazo de 1.5 px sobre 24×24.
 * Antes eran emojis, que cambian de estilo según el teléfono y no combinan con
 * la barra de pestañas.
 */
const ICONS = {
  home: "m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  check: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  users:
    "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  funnel:
    "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z",
  calendar:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  folder:
    "M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z",
  contract:
    "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  clipboard:
    "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z",
  invoice:
    "M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
  cash: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  card: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z",
  desktop:
    "M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25",
  mic: "M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z",
  pencil:
    "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
  mail: "M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75",
  settings:
    "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75",
  more: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
} as const;

type IconName = keyof typeof ICONS;

function NavIcon({ name, className = "w-5 h-5" }: { name: IconName; className?: string }) {
  return (
    <svg className={`${className} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name]} />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** Prefijo que marca la sección como activa, si no es el propio href. */
  match?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/empresa", label: "Dashboard", icon: "home", exact: true },
  { href: "/empresa/tareas", label: "Tareas", icon: "check" },
  { href: "/empresa/clientes", label: "Clientes", icon: "users" },
  { href: "/empresa/leads", label: "Leads", icon: "funnel" },
  { href: "/empresa/citas", label: "Citas", icon: "calendar" },
  { href: "/empresa/proyectos", label: "Proyectos", icon: "folder" },
  { href: "/empresa/contratos", label: "Contratos", icon: "contract" },
  { href: "/empresa/cotizaciones", label: "Cotizaciones", icon: "clipboard" },
  { href: "/empresa/facturas", label: "Facturas", icon: "invoice" },
  { href: "/empresa/cuentas-por-cobrar", label: "Por cobrar", icon: "cash" },
  { href: "/empresa/por-pagar", label: "Por pagar", icon: "card" },
  { href: "/empresa/platforms", label: "Platforms", icon: "desktop" },
  { href: "/empresa/reuniones", label: "Reuniones", icon: "mic" },
  { href: "/empresa/bitacoras", label: "Bitácoras", icon: "pencil" },
  { href: "/empresa/correos/hub", label: "Correos", icon: "mail", match: "/empresa/correos" },
];

const BOTTOM_ITEMS: NavItem[] = [{ href: "/empresa/configuracion", label: "Configuración", icon: "settings" }];

/**
 * Pestañas de abajo en el celular: lo que se usa todos los días, a un toque.
 * El resto de las secciones queda en «Más», que abre el menú completo.
 */
const TAB_HREFS = ["/empresa", "/empresa/tareas", "/empresa/reuniones", "/empresa/correos/hub"];
const TAB_ITEMS = TAB_HREFS.map((href) => NAV_ITEMS.find((i) => i.href === href)!);

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

  function matches(item: NavItem, path: string) {
    if (item.exact) return path === item.href;
    return path.startsWith(item.match ?? item.href);
  }

  function isActive(item: NavItem) {
    if (pendingHref) return pendingHref === item.href;
    return matches(item, pathname);
  }

  // «Más» se marca cuando la sección abierta no tiene pestaña propia.
  const moreActive = open || !TAB_ITEMS.some((t) => matches(t, pendingHref ?? pathname));

  function onNavigate(e: React.MouseEvent, href: string) {
    // Abrir en otra pestaña no cambia esta página: nada que marcar.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    setOpen(false);
    if (href !== pathname) setPendingHref(href);
  }

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 min-h-11 md:min-h-10 rounded-lg text-sm transition-colors ${
      active ? "bg-brand/10 text-brand-fg border border-brand/20" : "text-fg-faint hover:text-fg-soft hover:bg-fill border border-transparent"
    }`;

  return (
    <>
      {/* Barra superior del celular: marca y avisos. La navegación va abajo. */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-panel-2 border-b border-line pt-[env(safe-area-inset-top)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="h-14 flex items-center gap-3">
          <div className="relative w-7 h-7 rounded-md bg-brand/10 border border-brand/25 flex items-center justify-center shrink-0 overflow-hidden">
            <Image src={logoSrc} alt={companyName} fill sizes="28px" className="object-contain p-0.5" onError={() => setLogoFailed(true)} />
          </div>
          <p className="text-fg text-xs font-semibold tracking-widest uppercase flex-1 truncate">{companyName}</p>
          <NotificationBell />
        </div>
      </div>

      {/* Barra de pestañas del celular, como en una app nativa */}
      <nav
        aria-label="Secciones principales"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-panel-2 border-t border-line pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <div className="grid grid-cols-5 h-16">
          {TAB_ITEMS.map((item) => {
            const active = !open && isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => onNavigate(e, item.href)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-brand-fg" : "text-fg-faint hover:text-fg-soft"
                }`}
              >
                <NavIcon name={item.icon} className="w-6 h-6" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Cerrar menú" : "Más secciones"}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              moreActive ? "text-brand-fg" : "text-fg-faint hover:text-fg-soft"
            }`}
          >
            <NavIcon name="more" className="w-6 h-6" />
            Más
          </button>
        </div>
      </nav>

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
        className={`fixed left-0 top-0 h-full w-64 md:w-60 bg-panel-2 border-r border-line flex flex-col z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:pt-0 md:pb-0 transform transition-transform duration-200 ease-out ${
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
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => onNavigate(e, item.href)}
              className={linkClass(isActive(item))}
            >
              <NavIcon name={item.icon} />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="px-3 py-3 border-t border-line space-y-1">
          {BOTTOM_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => onNavigate(e, item.href)}
              className={linkClass(isActive(item))}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          ))}

          {/* User + sign out */}
          <div className="mt-2 px-3 py-3 rounded-lg bg-fill border border-line">
            <p className="text-fg-dim text-xs truncate">{userEmail}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="-mx-2 px-2 min-h-11 md:min-h-8 inline-flex items-center rounded-md text-fg-dim hover:text-danger text-xs transition-colors"
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
