"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/empresa/theme/theme-toggle";
import { useTheme } from "@/components/empresa/theme/theme-provider";

interface BrandMenuProps {
  companyName: string;
  logoSrc: string;
  onLogoError: () => void;
}

/**
 * Cabecera de marca del sidebar, que además abre el menú de la suite.
 *
 * El control de tema vivía fijo en el pie: ocupaba alto permanente para un
 * ajuste que se toca poco. Acá queda a un clic y no compite con la navegación.
 * El chevron existe para que se lea como algo accionable — un bloque de marca
 * clickeable sin señal no lo descubre nadie.
 */
export function BrandMenu({ companyName, logoSrc, onLogoError }: BrandMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { preference, resolved, ready } = useTheme();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const themeLabel = !ready
    ? "…"
    : preference === "system"
      ? `Sistema · ${resolved === "dark" ? "oscuro" : "claro"}`
      : preference === "dark"
        ? "Oscuro"
        : "Claro";

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de la suite"
        className={`w-full flex items-center gap-2 -mx-1 px-1 py-1.5 rounded-lg transition-colors ${
          open ? "bg-fill-2" : "hover:bg-fill"
        }`}
      >
        <div className="relative w-8 h-8 rounded-md bg-brand/10 border border-brand/25 flex items-center justify-center shrink-0 overflow-hidden">
          <Image
            src={logoSrc}
            alt={companyName}
            fill
            sizes="32px"
            className="object-contain p-0.5"
            onError={onLogoError}
          />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-fg text-xs font-semibold tracking-widest uppercase truncate">
            {companyName}
          </p>
          <p className="text-brand-fg text-[10px] tracking-[0.25em] uppercase mt-0.5">Suite</p>
        </div>
        <svg
          className={`w-3 h-3 shrink-0 text-fg-ghost transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 w-52 z-50 rounded-xl bg-pop border border-line shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="text-fg-mute text-xs font-medium">Tema</p>
              <p className="text-fg-faint text-[10px] truncate">{themeLabel}</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
