import { getSiteUrl } from "@/lib/site-url";

/**
 * Datos estructurados del sitio público.
 *
 * Regla: solo hechos verificables. Nada de reseñas, calificaciones ni
 * teléfonos inventados — Google penaliza el marcado que no se corresponde
 * con lo que hay en la página, y una estrella falsa cuesta más que la que
 * gana.
 */

const SITE = getSiteUrl();

export const ORG_ID = `${SITE}/#organization`;
export const WEBSITE_ID = `${SITE}/#website`;

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "ProfessionalService"],
  "@id": ORG_ID,
  name: "Pime Panamá",
  alternateName: ["PIME", "Pime Panama", "Empresa de Desarrollo de Software en Panamá"],
  slogan: "Desarrollo de software a medida en Panamá",
  url: SITE,
  logo: {
    "@type": "ImageObject",
    url: `${SITE}/logo-pime.png`,
    width: 3023,
    height: 1666,
  },
  image: `${SITE}/og-image.png`,
  description:
    "Empresa de desarrollo de software en Panamá especializada en software a medida, sistemas empresariales tipo ERP, plataformas SaaS, CRM, aplicaciones web y aplicaciones móviles.",
  email: "info@pimepanama.com",
  foundingDate: "2019",
  founder: {
    "@type": "Person",
    name: "Javier Vallejo",
    jobTitle: "CEO y desarrollador principal",
  },
  numberOfEmployees: { "@type": "QuantitativeValue", value: 5 },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ciudad de Panamá",
    addressRegion: "Panamá",
    addressCountry: "PA",
  },
  areaServed: [
    { "@type": "Country", name: "Panamá" },
    { "@type": "Place", name: "Centroamérica" },
    { "@type": "Place", name: "Latinoamérica" },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@pimepanama.com",
    contactType: "sales",
    availableLanguage: ["Spanish", "English"],
    areaServed: "PA",
  },
  knowsLanguage: ["es", "en"],
  priceRange: "$$",
  // Se llena cuando existan los perfiles; una URL rota acá es peor que el vacío.
  sameAs: [] as string[],
  knowsAbout: [
    "Desarrollo de software a medida",
    "Sistemas empresariales ERP",
    "Plataformas SaaS",
    "Desarrollo de CRM",
    "Aplicaciones web",
    "Aplicaciones móviles",
    "Automatización de procesos",
    "Transformación digital",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE,
  name: "Pime Panamá",
  inLanguage: "es-PA",
  publisher: { "@id": ORG_ID },
};

/** Migas de pan: Google las muestra en el resultado en vez de la URL cruda. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: `${SITE}${step.path === "/" ? "" : step.path}`,
    })),
  };
}

/** Una página de servicio concreto (no la empresa entera). */
export function serviceSchema(input: {
  name: string;
  description: string;
  path: string;
  serviceTypes: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: `${SITE}${input.path}`,
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "Country", name: "Panamá" },
    serviceType: input.serviceTypes,
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${SITE}${input.path}`,
      availableLanguage: ["es", "en"],
    },
  };
}

/**
 * Preguntas frecuentes. Google las puede desplegar bajo el resultado, lo que
 * ocupa más alto en la página y sube el CTR sin subir de posición.
 */
export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
