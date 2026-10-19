import type { Metadata } from "next";
import type { Lang } from "../../content/site";

export const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pimepanama.com";
const LOCALE: Record<Lang, string> = { es: "es_PA", en: "en_US" };
const PUBLICADO = "2026-10-10T00:00:00-05:00";

/**
 * Metadatos de una página en un idioma: título exacto (sin la plantilla, para no repetir la marca), canónica
 * propia (antes todas heredaban la de la home), hreflang es-PA / en-US y x-default en inglés (mercado de EE. UU.).
 */
export function metaDePagina(lang: Lang, ruta: string, titulo: string, descripcion: string, extra: Partial<Metadata> = {}): Metadata {
  const url = (l: Lang) => `/${l}${ruta}`;
  return {
    title: { absolute: titulo },
    description: descripcion,
    alternates: { canonical: url(lang), languages: { "es-PA": url("es"), "en-US": url("en"), "x-default": url("en") } },
    openGraph: { type: "website", siteName: "Pime Panamá", locale: LOCALE[lang], alternateLocale: [LOCALE[lang === "es" ? "en" : "es"]], url: url(lang), title: titulo, description: descripcion },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
    // LinkedIn (Post Inspector) busca autor y fecha de publicación: sin ellos marcaba «No author / No publication date».
    // La fecha es la del lanzamiento del sitio nuevo (corte de dominio, 2026-10-10).
    authors: [{ name: "Pime Panamá", url: BASE }],
    other: { publish_date: PUBLICADO, "article:published_time": PUBLICADO, "article:author": "Pime Panamá" },
    ...extra,
  };
}

/** Datos estructurados de la empresa (schema.org) para Google: quién es, dónde está y a quién sirve. */
export function jsonLdEmpresa(lang: Lang) {
  const es = lang === "es";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE}/#organizacion`,
        name: "Pime Panamá",
        alternateName: "Pime",
        url: BASE,
        logo: `${BASE}/icon.svg`,
        description: es
          ? "Empresa de desarrollo de software a medida en Panamá: ERP, CRM, SaaS, portales y sitios web diseñados y programados desde cero."
          : "Custom software development company in Panama: ERP, CRM, SaaS, portals and websites designed and built from scratch.",
      },
      {
        "@type": "ProfessionalService",
        "@id": `${BASE}/#servicio`,
        name: "Pime Panamá",
        url: `${BASE}/${lang}`,
        image: `${BASE}/${lang}/opengraph-image`,
        parentOrganization: { "@id": `${BASE}/#organizacion` },
        address: { "@type": "PostalAddress", addressLocality: "Ciudad de Panamá", addressCountry: "PA" },
        areaServed: [{ "@type": "Country", name: "Panama" }, { "@type": "Country", name: "United States" }],
        currenciesAccepted: "USD",
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: es ? "Desarrollo de software a medida" : "Custom software development",
          itemListElement: (es
            ? ["ERP a medida", "CRM a medida", "Plataformas SaaS", "Portales y sitios web a medida", "Analítica con inteligencia artificial"]
            : ["Custom ERP development", "Custom CRM development", "SaaS platform development", "Custom web portals and websites", "AI analytics"]
          ).map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n } })),
        },
      },
      {
        "@type": "WebSite",
        "@id": `${BASE}/#sitio`,
        url: BASE,
        name: "Pime Panamá",
        inLanguage: ["es-PA", "en-US"],
        publisher: { "@id": `${BASE}/#organizacion` },
      },
    ],
  };
}
