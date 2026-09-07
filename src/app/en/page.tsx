import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

import { LandingPage } from "@/components/landing/landing-page";
import { getLandingContent } from "@/lib/content";
import { alternatesFor, absoluteUrl, ROBOTS_INDEX } from "@/lib/seo-urls";
import { getSiteUrl } from "@/lib/site-url";
import enMessages from "../../../messages/en.json";

/**
 * Portada en inglés. Antes vivía en la misma URL que la española y se elegía
 * por geolocalización de IP; como Googlebot rastrea desde Estados Unidos,
 * esta era la versión que Google tenía indexada de pimepanama.com. Ahora
 * tiene su propia URL y las dos se declaran con hreflang.
 */
export const dynamic = "force-static";

const LOCALE = "en" as const;

export async function generateMetadata(): Promise<Metadata> {
  setRequestLocale(LOCALE);
  const t = await getTranslations({ locale: LOCALE, namespace: "seo" });
  const { seo } = await getLandingContent();
  const home = seo.find((item) => item.page === "home");

  const title = home?.metaTitle_en ?? t("home_title");
  const description = home?.metaDescription_en ?? t("home_description");
  const siteUrl = getSiteUrl();
  const ogImage = `${siteUrl}/og-image.png`;

  return {
    title,
    description,
    authors: [{ name: "Pime Panamá" }],
    creator: "Pime Panamá",
    publisher: "Pime Panamá",
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      url: absoluteUrl("/", LOCALE),
      siteName: "Pime Panamá",
      locale: "en_US",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Pime Panamá — Custom software development in Panama" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    alternates: alternatesFor("/", LOCALE),
    robots: ROBOTS_INDEX,
  };
}

export default async function HomePageEn() {
  setRequestLocale(LOCALE);
  return (
    <NextIntlClientProvider locale={LOCALE} messages={enMessages}>
      {/* El <html lang> del layout raíz es "es" (el sitio canónico). Para esta
          rama se corrige en el cliente: Google renderiza JS y lo lee bien. */}
      <script
        dangerouslySetInnerHTML={{ __html: `document.documentElement.lang='en'` }}
      />
      <LandingPage locale={LOCALE} />
    </NextIntlClientProvider>
  );
}
