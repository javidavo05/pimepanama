"use client";

import { useEffect } from "react";
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
    <div className="flex items-center gap-1 text-xs uppercase tracking-[0.3em]">
      {(["es", "en"] as Locale[]).map((lang, i) => (
        <span key={lang} className="flex items-center gap-1">
          {i > 0 && <span className="text-white/20">|</span>}
          <button
            onClick={() => lang !== currentLocale && setLocale(lang)}
            className={`transition ${
              lang === currentLocale
                ? "text-[#60A5FA] underline underline-offset-2"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {lang.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
