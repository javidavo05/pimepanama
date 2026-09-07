"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";

/**
 * El idioma cambia de URL, no de cookie: / es español y /en es inglés.
 * Antes recargaba la página con `window.location.reload()` tras escribir una
 * cookie, lo que obligaba a renderizar todo dinámico y dejaba a las dos
 * versiones compartiendo una sola URL en Google.
 */
export function LanguageToggle({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname() ?? "/";
  const basePath = pathname.startsWith("/en") ? pathname.slice(3) || "/" : pathname;

  const hrefFor = (lang: Locale) =>
    lang === "en" ? `/en${basePath === "/" ? "" : basePath}` : basePath;

  return (
    <div
      className="relative flex items-center rounded-full p-0.5"
      style={{
        background: "rgba(37,99,235,0.06)",
        border: "1px solid rgba(37,99,235,0.2)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {(["es", "en"] as Locale[]).map((lang) => {
        const active = lang === currentLocale;
        return (
          <Link
            key={lang}
            href={hrefFor(lang)}
            hrefLang={lang}
            aria-current={active ? "true" : undefined}
            aria-label={lang === "es" ? "Ver el sitio en español" : "View the site in English"}
            className={`relative z-10 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-200 ${
              active ? "text-white" : "text-white/45 hover:text-white/75"
            }`}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #2563EB, #0EA5E9)",
                  boxShadow: "0 0 14px rgba(37,99,235,0.4)",
                }}
              />
            )}
            {lang.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
