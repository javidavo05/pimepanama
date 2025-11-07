import { isValidLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  
  if (!isValidLocale(locale)) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PIME Panama",
    alternateName: "PIME",
    url: `https://pimepanama.com/${locale}`,
    logo: "https://pimepanama.com/pime-icon.svg",
    description:
      locale === "es"
        ? "Líderes en Panamá y Latinoamérica en consultoría especializada, suministro de equipos de alta gama y gestión de proyectos con estándares internacionales."
        : "Leaders across Panama and Latin America in specialized consulting, world-class equipment sourcing, and turnkey project management with international standards.",
    email: "info@pimepanama.com",
    address: {
      "@type": "PostalAddress",
      addressCountry: "PA",
      addressLocality: "Panama",
    },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@pimepanama.com",
      contactType: "customer service",
      availableLanguage: ["English", "Spanish"],
    },
    areaServed: [
      {
        "@type": "Country",
        name: "Panama",
      },
      {
        "@type": "Place",
        name: "Central America",
      },
      {
        "@type": "Place",
        name: "Caribbean",
      },
      {
        "@type": "Place",
        name: "Latin America",
      },
    ],
    knowsAbout: [
      "Industrial Engineering",
      "Equipment Supply",
      "Turnkey Projects",
      "Engineering Consulting",
      "Industrial Maintenance",
      "Project Management",
      "ISO Standards",
      "ASME Standards",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
