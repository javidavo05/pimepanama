import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pimepanama.com";

// TODO: Replace /public/og-image.png with a real branded image (1200×630 px)
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const defaults = {
  es: {
    titleTemplate: (page: string) => `${page} | Pime Panamá — Desarrollo de Software en Panama`,
    description:
      "Empresa de desarrollo de software en Panama especializada en sistemas empresariales, SaaS, CRM y transformación digital. Más de $1.1M en proyectos entregados.",
  },
  en: {
    titleTemplate: (page: string) => `${page} | Pime Panamá — Software Development in Panama`,
    description:
      "Software development company in Panama specializing in enterprise systems, SaaS, CRM, and digital transformation. Over $1.1M in delivered projects.",
  },
};

export function generateSiteMetadata(
  page: string,
  locale: Locale,
  overrides: Partial<Metadata> = {}
): Metadata {
  const d = defaults[locale];
  const title = d.titleTemplate(page);
  const description = d.description;

  return {
    title,
    description,
    authors: [{ name: "Pime Panamá" }],
    creator: "Pime Panamá",
    publisher: "Pime Panamá",
    formatDetection: { email: false, address: false, telephone: false },
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: "Pime Panamá",
      locale: locale === "es" ? "es_PA" : "en_US",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Pime Panamá" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
    alternates: {
      canonical: SITE_URL,
      languages: { es: SITE_URL, en: SITE_URL },
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
    ...overrides,
  };
}
