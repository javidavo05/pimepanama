import { getTranslations } from "next-intl/server";

import { AboutSection } from "@/components/landing/about-section";
import { AffordableSection } from "@/components/landing/affordable-section";
import { CallToActionSection, DEFAULT_BOOKING_CTAS } from "@/components/landing/cta-section";
import { ContactForm } from "@/components/landing/contact-form";
import { DifferentiatorsSection } from "@/components/landing/differentiators-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingFooter } from "@/components/landing/footer";
import { NavigationBar } from "@/components/landing/navigation-bar";
import { PortfolioSection } from "@/components/landing/portfolio-section";
import { SectorsSection } from "@/components/landing/sectors-section";
import { ServicesSection } from "@/components/landing/services-section";
import { ScrollProgressBar } from "@/components/ui/scroll-progress";
import { FaqSection } from "@/components/landing/faq-section";
import { getLandingContent } from "@/lib/content";
import { HOME_FAQS } from "@/lib/services-content";
import type { Locale } from "@/lib/i18n";

function localized<T extends Record<string, unknown>>(entry: T, field: string, locale: Locale) {
  return (entry as Record<string, string | null | undefined>)[`${field}_${locale}`] ?? null;
}

export async function LandingPage({ locale }: { locale: Locale }) {
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
      <main>
      <HeroSection hero={heroContent} navigation={navigationItems} />
      {servicesSection ? (
        <ServicesSection
          heading={localized(servicesSection, "title", locale) ?? ""}
          subheading={localized(servicesSection, "subtitle", locale)}
          services={services}
          locale={locale}
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
      {/* Las preguntas están escritas para el mercado panameño; en la versión
          en inglés no aportan y no se muestran. */}
      {locale === "es" ? (
        <FaqSection faqs={HOME_FAQS} heading="Preguntas frecuentes" />
      ) : null}
      <CallToActionSection
        heading={locale === "es" ? "¿Listo para empezar?" : "Ready to get started?"}
        subheading={
          locale === "es"
            ? "Agenda una consulta o escríbenos directamente."
            : "Book a consultation or reach out directly."
        }
        ctas={DEFAULT_BOOKING_CTAS[locale === "es" ? "es" : "en"]}
      />
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
      </main>
      <LandingFooter locale={locale} />
    </>
  );
}
