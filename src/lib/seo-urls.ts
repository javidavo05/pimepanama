import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";

/**
 * El idioma vive en la URL: el español es la raíz (mercado principal) y el
 * inglés cuelga de /en. Con dos URLs reales se puede declarar hreflang de
 * verdad, cosa imposible cuando las dos versiones compartían la misma.
 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return locale === "en" ? `/en${clean}` : clean || "/";
}

export function absoluteUrl(path: string, locale: Locale): string {
  const p = localizedPath(path, locale);
  return `${getSiteUrl()}${p === "/" ? "" : p}`;
}

/**
 * Canonical + hreflang para una página que existe en los dos idiomas.
 * `x-default` apunta al español: si Google no sabe qué servir, gana el
 * mercado al que le vendemos.
 */
export function alternatesFor(path: string, locale: Locale): Metadata["alternates"] {
  const es = absoluteUrl(path, "es");
  const en = absoluteUrl(path, "en");
  return {
    canonical: absoluteUrl(path, locale),
    languages: { "es-PA": es, es, en, "x-default": es },
  };
}

/** Canonical para una página que solo existe en español. */
export function spanishOnlyAlternates(path: string): Metadata["alternates"] {
  const es = absoluteUrl(path, "es");
  return { canonical: es, languages: { "es-PA": es, es, "x-default": es } };
}

export const ROBOTS_INDEX: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};
