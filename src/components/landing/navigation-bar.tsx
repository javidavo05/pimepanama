"use client";

import Link from "next/link";
import Image from "next/image";

import type { Locale } from "@/lib/i18n";
import { localeNames, locales } from "@/lib/i18n";

type NavigationItem = {
  label: string;
  href: string;
};

export function NavigationBar({
  locale,
  items,
}: {
  locale: Locale;
  items: NavigationItem[];
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030a16]/80 shadow-[0_1px_0_rgba(37,99,235,0.25)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} className="flex items-center gap-3 transition hover:opacity-80">
          <Image
            src="/pime-icon.svg"
            alt="PIME Panama Logo"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <div className="space-y-0.5">
            <p className="text-lg font-bold tracking-wide text-white">PIME</p>
            <p className="text-xs text-white/60">
              {locale === "es" ? "Ingeniería Industrial" : "Industrial Engineering"}
            </p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-[0.65rem] uppercase tracking-[0.35em] text-white/50 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-transparent px-3 py-1 transition hover:border-[#2563EB]/40 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {locales.map((lang) => (
            <Link
              key={lang}
              href={lang === locale ? `/${locale}` : `/${lang}`}
              className={`text-xs uppercase tracking-[0.3em] transition ${
                lang === locale ? "text-[#60A5FA]" : "text-white/40 hover:text-white/70"
              }`}
            >
              {localeNames[lang]}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

