import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/landing/contact-form";
import { DifferentiatorsSection } from "@/components/landing/differentiators-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/footer";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { SectorsSection } from "@/components/landing/sectors-section";
import { ServicesSection } from "@/components/landing/services-section";
import { ValueSection } from "@/components/landing/value-section";
import { getLandingContent } from "@/lib/content";
import { defaultLocale, isValidLocale, type Locale } from "@/lib/i18n";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const navLabels = {
  en: {
    services: "Services",
    sectors: "Sectors",
    differentiators: "Advantages",
    contact: "Contact",
  },
  es: {
    services: "Servicios",
    sectors: "Sectores",
    differentiators: "Diferenciales",
    contact: "Contacto",
  },
} satisfies Record<Locale, Record<string, string>>;

function localized<T extends Record<string, unknown>>(entry: T, field: string, locale: Locale) {
  return (entry as Record<string, string | null | undefined>)[`${field}_${locale}`] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: paramLocale } = await params;
  const locale = isValidLocale(paramLocale) ? paramLocale : defaultLocale;
  const { seo } = await getLandingContent();
  const seoHome = seo.find((item) => item.page === "home");

  if (!seoHome) {
    return {};
  }

  const title = localized(seoHome, "metaTitle", locale);
  const description = localized(seoHome, "metaDescription", locale);

  const keywords = locale === "en" 
    ? "industrial engineering Panama, equipment supply Panama, turnkey projects, engineering consulting, industrial maintenance, Maersk, Svitzer, PIME Panama, industrial solutions, project management, ISO certified, ASME standards"
    : "ingeniería industrial Panamá, suministro equipos industriales, proyectos llave en mano, consultoría ingeniería, mantenimiento industrial, Maersk, Svitzer, PIME Panama, soluciones industriales, gestión proyectos, certificación ISO, estándares ASME";

  return {
    title: title ?? undefined,
    description: description ?? undefined,
    keywords,
    authors: [{ name: "PIME Panama" }],
    creator: "PIME Panama",
    publisher: "PIME Panama",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://pimepanama.com"),
    openGraph: {
      title: title ?? undefined,
      description: description ?? undefined,
      url: `/${locale}`,
      siteName: "PIME Panama",
      locale: locale === "es" ? "es_PA" : "en_US",
      type: "website",
      images: seoHome.ogImageUrl ? [{ url: seoHome.ogImageUrl }] : [{ url: "/pime-icon.svg", width: 420, height: 420, alt: "PIME Panama Logo" }],
    },
    twitter: {
      card: "summary_large_image",
      title: title ?? undefined,
      description: description ?? undefined,
      images: ["/pime-icon.svg"],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        es: "/es",
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: paramLocale } = await params;
  if (!isValidLocale(paramLocale)) {
    notFound();
  }

  const locale = paramLocale;
  const content = await getLandingContent();

  const sectionsBySlug = new Map(content.sections.map((section) => [section.slug, section]));
  const services = content.services.map((service) => ({
    id: service.id,
    order: service.order,
    title: localized(service, "title", locale) ?? "",
    description: localized(service, "description", locale) ?? "",
    icon: service.icon,
  }));

  const sectors = content.sectors.map((sector) => ({
    id: sector.id,
    title: localized(sector, "title", locale) ?? "",
    description: localized(sector, "description", locale),
  }));

  const differentiators = content.differentiators.map((item) => ({
    id: item.id,
    title: localized(item, "title", locale) ?? "",
    description: localized(item, "description", locale) ?? "",
  }));

  const hero = content.hero;

  const navigationItems = [
    { label: navLabels[locale].services, href: "#services" },
    { label: navLabels[locale].sectors, href: "#sectors" },
    { label: navLabels[locale].differentiators, href: "#differentiators" },
    { label: navLabels[locale].contact, href: "#contact" },
  ];

  const heroContent = {
    locale,
    headline: localized(hero, "headline", locale) ?? "",
    subheadline: localized(hero, "subheadline", locale) ?? "",
    highlight: localized(hero, "highlight", locale),
    backgroundImageUrl: hero.backgroundImageUrl,
    backgroundVideoUrl: hero.backgroundVideoUrl,
    primaryCta: {
      label: localized(hero, "ctaPrimaryLabel", locale),
      href: hero.ctaPrimaryLink,
    },
    secondaryCta: {
      label: localized(hero, "ctaSecondaryLabel", locale),
      href: hero.ctaSecondaryLink,
    },
  };

  const servicesSection = sectionsBySlug.get("services");
  const valueSection = sectionsBySlug.get("value");
  const sectorsSection = sectionsBySlug.get("sectors");
  const differentiatorsSection = sectionsBySlug.get("differentials");

  return (
    <>
      <NavigationBar locale={locale} items={navigationItems} />
      <HeroSection hero={heroContent} navigation={navigationItems} />
      {servicesSection ? (
        <ServicesSection
          heading={localized(servicesSection, "title", locale) ?? ""}
          subheading={localized(servicesSection, "subtitle", locale)}
          services={services}
        />
      ) : null}
      {valueSection ? (
        <ValueSection
          heading={localized(valueSection, "title", locale) ?? ""}
          body={localized(valueSection, "body", locale)}
        />
      ) : null}
      {sectorsSection ? (
        <SectorsSection
          heading={localized(sectorsSection, "title", locale) ?? ""}
          subheading={localized(sectorsSection, "subtitle", locale)}
          sectors={sectors}
        />
      ) : null}
      {differentiatorsSection ? (
        <DifferentiatorsSection
          heading={localized(differentiatorsSection, "title", locale) ?? ""}
          subheading={localized(differentiatorsSection, "subtitle", locale)}
          items={differentiators}
        />
      ) : null}
      <section id="contact" className="relative overflow-hidden bg-black px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(5,134,254,0.1),_transparent_70%)]" />
        <div className="relative z-10 mx-auto max-w-3xl">
          <ContactForm locale={locale} />
        </div>
      </section>
      <LandingFooter locale={locale} />
    </>
  );
}

