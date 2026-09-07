import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isValidLocale } from "@/lib/i18n";

/**
 * El idioma llega por la URL, no por cookie.
 *
 * Antes se leía `NEXT_LOCALE` con `cookies()`, y eso tenía dos consecuencias
 * que costaban posiciones en Google:
 *
 * 1. Leer cookies vuelve dinámica toda página que use traducciones. Next 15
 *    entonces manda la metadata (title, description, canonical, Open Graph)
 *    en streaming al final del <body> en vez del <head>, y desactiva la caché
 *    del CDN.
 * 2. El middleware elegía el idioma por geolocalización de IP. Googlebot
 *    rastrea desde Estados Unidos, así que indexaba la versión en inglés de
 *    la portada — justo la que no apunta a "empresa de desarrollo de software
 *    en Panamá".
 *
 * Ahora cada página declara su idioma con `setRequestLocale()`, que no toca
 * cookies ni cabeceras: las dos versiones se generan estáticas.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isValidLocale(requested ?? "") ? requested! : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
