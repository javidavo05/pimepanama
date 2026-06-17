"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { Locale } from "@/lib/i18n";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function LanguageToggle({ currentLocale }: { currentLocale: Locale }) {
  // On mount: sync localStorage preference with cookie (handles returning users)
  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_NAME) as Locale | null;
    if (stored && stored !== currentLocale && (stored === "en" || stored === "es")) {
      setLocale(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setLocale(locale: Locale) {
    document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    localStorage.setItem(COOKIE_NAME, locale);
    window.location.reload();
  }

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
          <button
            key={lang}
            onClick={() => !active && setLocale(lang)}
            aria-pressed={active}
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
          </button>
        );
      })}
    </div>
  );
}
