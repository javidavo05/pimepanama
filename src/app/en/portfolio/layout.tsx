import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { alternatesFor, ROBOTS_INDEX } from "@/lib/seo-urls";
import { getCatalogStats } from "@/lib/portfolio/catalog";
import enMessages from "../../../../messages/en.json";

export const dynamic = "force-static";

const stats = getCatalogStats();

export const metadata: Metadata = {
  title: `Portfolio: ${stats.total} systems built in Panama | Pime Panamá`,
  description: `From institutional websites to multi-tenant platforms with terminals in the field: ${stats.total} systems with their routes, screens and stack. ${stats.inProduction} in production.`,
  alternates: alternatesFor("/portfolio", "en"),
  robots: ROBOTS_INDEX,
  openGraph: {
    title: `Portfolio: ${stats.total} systems built in Panama | Pime Panamá`,
    description: "Pime Panamá's portfolio engine: every system with its access routes, its screen and its complexity level.",
    type: "website",
    locale: "en_US",
  },
};

export default function PortfolioLayoutEn({ children }: { children: React.ReactNode }) {
  setRequestLocale("en");
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang='en'` }} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/en" },
          { name: "Portfolio", path: "/en/portfolio" },
        ])}
      />
      {children}
    </NextIntlClientProvider>
  );
}
