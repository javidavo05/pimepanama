import type { Lang } from "./site";

/**
 * SEO por página (2026-10-11): posicionar a Pime en Panamá («desarrollo de software y sitios a medida en Panamá»)
 * y en Estados Unidos («custom software development», «nearshore software development»).
 * Títulos ≤ 60 caracteres con la palabra clave al inicio; descripciones ≤ 160 con un dato cierto y una acción.
 * Solo afirmaciones verdaderas: Panamá usa el dólar y comparte zona horaria con el este de EE. UU.
 */
export type SeoPagina = { titulo: string; descripcion: string };

export const SEO: Record<"home" | "servicios" | "portfolio" | "empresa" | "contacto", Record<Lang, SeoPagina>> = {
  home: {
    es: {
      titulo: "Desarrollo de software a medida en Panamá | Pime",
      descripcion: "Diseñamos y programamos ERP, CRM, plataformas y sitios web a medida en Panamá, desde cero, con precio cerrado por fase y tres meses de garantía.",
    },
    en: {
      titulo: "Custom Software Development from Panama | Pime",
      descripcion: "Custom ERP, CRM, SaaS and web platforms built from scratch in Panama for US companies. Your time zone, priced in US dollars, fixed price per phase.",
    },
  },
  servicios: {
    es: {
      titulo: "ERP, CRM, SaaS y sitios web a medida en Panamá | Pime",
      descripcion: "Cinco tipos de sistema, todos diseñados desde cero para su operación: ERP, CRM, SaaS, portales y analítica con IA. Precio cerrado y garantía de tres meses.",
    },
    en: {
      titulo: "Custom ERP, CRM & SaaS Development Services | Pime",
      descripcion: "Five kinds of custom system built from scratch: ERP, CRM, SaaS, web portals and AI analytics. Fixed price per phase and a three-month warranty.",
    },
  },
  portfolio: {
    es: {
      titulo: "Portafolio: sistemas a medida en producción | Pime",
      descripcion: "ERP, CRM y plataformas que Pime diseñó y programó para empresas e instituciones en Panamá, en producción hoy. Filtre por industria o por tipo.",
    },
    en: {
      titulo: "Custom Software Portfolio: Systems in Production | Pime",
      descripcion: "ERP, CRM and platforms Pime designed and built for real companies and institutions, running in production today. Filter by industry or type.",
    },
  },
  empresa: {
    es: {
      titulo: "Empresa de desarrollo de software en Panamá | Pime",
      descripcion: "Pime Panamá construye sistemas a medida para empresas: trato directo con quien programa, precio cerrado por fase, su código y sus datos.",
    },
    en: {
      titulo: "Software Development Company in Panama | Pime",
      descripcion: "Pime builds custom systems for companies: direct contact with the people who code, a fixed price per phase, and your code and data stay yours.",
    },
  },
  contacto: {
    es: {
      titulo: "Pida una propuesta de software a medida | Pime",
      descripcion: "Cuéntenos qué necesita en cuatro pasos y le respondemos con una propuesta de precio cerrado por fase para su sistema a medida.",
    },
    en: {
      titulo: "Get a Custom Software Proposal | Pime Panama",
      descripcion: "Tell us what you need in four steps and we'll reply with a fixed-price-per-phase proposal for your custom system.",
    },
  },
};
