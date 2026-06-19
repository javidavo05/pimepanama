import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { AboutSection } from "@/components/landing/about-section";
import { AffordableSection } from "@/components/landing/affordable-section";
import { ContactForm } from "@/components/landing/contact-form";
import { DifferentiatorsSection } from "@/components/landing/differentiators-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/footer";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { PortfolioSection } from "@/components/landing/portfolio-section";
import { SectorsSection } from "@/components/landing/sectors-section";
import { ServicesSection } from "@/components/landing/services-section";
import { getLandingContent } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
import { ScrollProgressBar } from "@/components/ui/scroll-progress";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// SEO TODO: Create a /blog route with articles targeting long-tail keywords:
// - "¿Cuánto cuesta desarrollar un sistema empresarial en Panama?"
// - "CRM vs software a medida: ¿qué necesita tu empresa?"
// - "Cómo digitalizar una academia o instituto en Panama"
// - "Ventajas de una plataforma SaaS para iglesias y organizaciones sin fines de lucro"
// - "Desarrollo web en Panama: precios, plazos y qué esperar"
// Each article should be 1,200–2,000 words, answer a real business question,
// and include a CTA to contact Pime Panamá.

// SEO TODO: Register and optimize Google Business Profile for Pime Panamá
// at https://business.google.com — this is critical for local Panama rankings.
// Add: category "Software Company", service area "Panama City", photos, description.

// SEO TODO: Build backlinks from:
// - Panama Chamber of Commerce directory
// - Local tech community sites and directories
// - LinkedIn articles linking back to pimepanama.com
// - Guest posts on Latin American tech blogs

// SEO TODO: Add Google Search Console — verify site at https://search.google.com/search-console
// Submit sitemap.xml after deployment.
// Monitor: which keywords are generating impressions, click-through rates, page rankings.

// SEO TODO: Consider adding client testimonials with schema markup (Review schema)
// to improve CTR from search results with star ratings.

function localized<T extends Record<string, unknown>>(entry: T, field: string, locale: Locale) {
  return (entry as Record<string, string | null | undefined>)[`${field}_${locale}`] ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "seo" });
  const { seo } = await getLandingContent();
  const seoHome = seo.find((item) => item.page === "home");

  const title = localized(seoHome ?? {}, "metaTitle", locale) ?? t("home_title");
  const description = localized(seoHome ?? {}, "metaDescription", locale) ?? t("home_description");
  const siteUrl = getSiteUrl();

  const keywords =
    locale === "es"
      ? "empresa de desarrollo de software en Panama, desarrollo de software en Panama, empresa de software Panama, software a medida Panama, desarrollador web Panama, sistemas empresariales Panama, aplicaciones web Panama, CRM Panama, plataformas SaaS Panama, transformacion digital Panama, agencia digital Panama"
      : "software development company in Panama, software development Panama, web development Panama, custom software Panama, SaaS development Latin America, Panama software architect, Next.js developer Panama";

  // TODO: Replace /public/og-image.png with real branded image (1200×630 px)
  const ogImage = `${siteUrl}/og-image.png`;

  return {
    title,
    description,
    keywords,
    authors: [{ name: "Pime Panamá" }],
    creator: "Pime Panamá",
    publisher: "Pime Panamá",
    formatDetection: { email: false, address: false, telephone: false },
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "Pime Panamá",
      locale: locale === "es" ? "es_PA" : "en_US",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Pime Panamá — Desarrollo de Software en Panama" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      // Cookie-based i18n: both locales share the same canonical URL
      canonical: siteUrl,
      languages: {
        es: siteUrl,
        en: siteUrl,
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

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: "nav" });
  const tp = await getTranslations({ locale, namespace: "portfolio" });
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

  const portfolioItems = content.portfolio.map((item) => ({
    id: item.id,
    title: localized(item, "title", locale) ?? "",
    summary: localized(item, "summary", locale) ?? "",
    outcome: localized(item, "outcome", locale),
    clientName: item.clientName,
    industry: localized(item, "industry", locale),
    imageUrl: item.imageUrl,
    caseStudyUrl: item.caseStudyUrl,
    liveUrl: "liveUrl" in item ? (item.liveUrl as string | null) : null,
    techStack: "techStack" in item ? (item.techStack as string) : undefined,
    value: "value" in item ? (item.value as number) : 0,
    category: "category" in item ? (item.category as string) : undefined,
  }));

  const navigationItems = [
    { label: t("services"), href: "#services" },
    { label: t("projects"), href: "#projects" },
    { label: t("whyPime"), href: "#differentiators" },
    { label: t("websites"), href: "#websites" },
    { label: t("sectors"), href: "#sectors" },
    { label: t("about"), href: "#about" },
    { label: t("contact"), href: "#contact" },
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
  const sectorsSection = sectionsBySlug.get("sectors");
  const differentiatorsSection = sectionsBySlug.get("differentials");

  return (
    <>
      <ScrollProgressBar />
      <NavigationBar locale={locale} items={navigationItems} />
      <HeroSection hero={heroContent} navigation={navigationItems} />
      {servicesSection ? (
        <ServicesSection
          heading={localized(servicesSection, "title", locale) ?? ""}
          subheading={localized(servicesSection, "subtitle", locale)}
          services={services}
        />
      ) : null}
      <PortfolioSection
        heading={tp("heading")}
        subheading={tp("subheading")}
        items={portfolioItems}
        locale={locale}
      />
      {differentiatorsSection ? (
        <DifferentiatorsSection
          heading={localized(differentiatorsSection, "title", locale) ?? ""}
          subheading={localized(differentiatorsSection, "subtitle", locale)}
          items={differentiators}
        />
      ) : null}
      <AffordableSection />
      {sectorsSection ? (
        <SectorsSection
          heading={localized(sectorsSection, "title", locale) ?? ""}
          subheading={localized(sectorsSection, "subtitle", locale)}
          sectors={sectors}
        />
      ) : null}
      <AboutSection locale={locale} />
      <section
        id="contact"
        className="relative overflow-hidden px-6 py-24"
        style={{ background: "linear-gradient(180deg, #04050c 0%, #020308 100%)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, rgba(37,99,235,0.05), transparent 70%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl">
          <ContactForm locale={locale} />
        </div>
      </section>
      <LandingFooter locale={locale} />
    </>
  );
}
