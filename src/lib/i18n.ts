export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

/** El mercado principal es Panamá: el español es el idioma canónico del sitio. */
export const defaultLocale: Locale = "es";

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

