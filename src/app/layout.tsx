import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030611",
};

export const metadata: Metadata = {
  icons: {
    icon: "/pime-icon.svg",
    apple: "/pime-icon.svg",
  },
  verification: {
    google: "OTj-RcT9lrWRDHTA8ZWZUWcBn3G4-fuM_V9EfjPLyAQ",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Pime Panamá",
  alternateName: ["PIME", "Pime Panama", "Empresa de Desarrollo de Software en Panama"],
  slogan: "Empresa de Desarrollo de Software en Panama",
  url: "https://pimepanama.com",
  logo: "https://pimepanama.com/pime-icon.svg",
  description:
    "Empresa de desarrollo de software en Panama especializada en software a medida, sistemas empresariales, SaaS, CRM y transformación digital.",
  email: "info@pimepanama.com",
  address: {
    "@type": "PostalAddress",
    addressCountry: "PA",
    addressLocality: "Panama City",
  },
  // SEO TODO: Create LinkedIn company page at linkedin.com/company/pimepanama and add the URL below
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@pimepanama.com",
    contactType: "customer service",
    availableLanguage: ["Spanish", "English"],
  },
  areaServed: [
    { "@type": "Country", name: "Panama" },
    { "@type": "Place", name: "Latin America" },
    { "@type": "Place", name: "Central America" },
  ],
  knowsAbout: [
    "Software Development",
    "SaaS Development",
    "Enterprise Systems",
    "CRM Development",
    "Web Applications",
    "Mobile Applications",
    "Digital Transformation",
    "Panama Software",
  ],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Pime Panamá",
  description:
    "Empresa de desarrollo de software en Panama: software a medida, sistemas empresariales, SaaS, CRM y plataformas web.",
  serviceType: [
    "Desarrollo de software a medida",
    "Desarrollo de plataformas SaaS",
    "Desarrollo de sistemas empresariales",
    "Desarrollo web",
  ],
  url: "https://pimepanama.com",
  email: "info@pimepanama.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Panama City",
    addressCountry: "PA",
  },
  areaServed: ["Panama", "Latin America"],
  priceRange: "$$",
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: "https://pimepanama.com",
  name: "Pime Panamá",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://pimepanama.com/portfolio?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
      </head>
      <body
        className={`${syne.variable} ${inter.variable} text-white antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <div className="relative min-h-screen">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
