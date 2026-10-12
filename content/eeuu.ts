/**
 * Página para empresas de Estados Unidos (/en/nearshore-software-development), pedida por Javier el 2026-10-11
 * para posicionar a Pime en el mercado de EE. UU. Todo lo afirmado está confirmado (pregunta 33 a 39 del
 * artifact) o es un hecho público: Panamá usa el dólar y está en UTC−5 todo el año.
 */
export const EEUU = {
  seo: {
    titulo: "Nearshore Custom Software Development in Panama | Pime",
    descripcion: "Custom ERP, CRM, SaaS and web platforms built from scratch in Panama for US companies. Your hours, US dollars, from USD 40/hour, code 100% yours.",
  },
  eyebrow: "Nearshore custom software development",
  titulo: ["Custom software from Panama,", "for US companies"],
  bajada: "Pime designs and builds custom ERP, CRM, SaaS and web platforms from scratch. You work directly with the team that writes your code: in English, in your hours, billed in US dollars.",
  cta: { href: "/agendar?lang=en", label: "Book a free 30-minute call" },
  secundario: { href: "/en/contacto", label: "Request a proposal" },
  porque: {
    titulo: "Why companies in the US build with us",
    items: [
      { t: "Billed in US dollars", x: "Panama's currency is the US dollar, so there are no exchange-rate surprises on your invoices." },
      { t: "Your working hours", x: "Panama is on UTC−5 all year: New York time in winter, Chicago time in summer. We meet when you're at your desk." },
      { t: "English and Spanish", x: "Calls, proposals, documentation and code reviews in English." },
      { t: "Direct, personal contact", x: "You talk to the people who design and code your system, from the first call to delivery." },
    ],
  },
  precio: {
    titulo: "Clear pricing, before we write a line of code",
    items: [
      { k: "USD 40/h", v: "starting hourly rate" },
      { k: "Fixed price", v: "per phase, set in the proposal" },
      { k: "3 months", v: "of warranty after delivery" },
      { k: "100% yours", v: "code and data" },
    ],
    nota: "Each phase is in use from the day it ships. You decide which phases and in what order.",
  },
  construimos: {
    titulo: "What we build",
    items: ["Custom ERP and internal systems", "CRM and sales pipelines", "Multi-tenant and white-label SaaS", "Client portals, websites and booking", "Integrations and AI automation"],
    ver: { href: "/en/servicios", label: "See all services" },
    trabajo: { href: "/en/portfolio", label: "See systems in production" },
  },
};

export function jsonLdEeuu(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Nearshore custom software development",
    serviceType: "Custom software development",
    url: `${base}/en/nearshore-software-development`,
    provider: { "@id": `${base}/#organizacion` },
    areaServed: { "@type": "Country", name: "United States" },
    availableLanguage: ["English", "Spanish"],
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      priceSpecification: { "@type": "UnitPriceSpecification", price: 40, priceCurrency: "USD", unitText: "HOUR", description: "Starting hourly rate; every project gets a fixed price per phase" },
    },
  };
}
