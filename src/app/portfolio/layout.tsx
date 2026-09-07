import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { spanishOnlyAlternates, ROBOTS_INDEX } from "@/lib/seo-urls";
import esMessages from "../../../messages/es.json";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Portafolio de proyectos de software en Panamá | Pime Panamá",
  description:
    "Sistemas a medida entregados por Pime Panamá: ticketing de transporte nacional, marketplaces inmobiliarios, CRM para academias, SaaS de gestión y plataformas multi-tenant. Con demos navegables.",
  alternates: spanishOnlyAlternates("/portfolio"),
  robots: ROBOTS_INDEX,
  openGraph: {
    title: "Portafolio de proyectos de software en Panamá | Pime Panamá",
    description:
      "Más de 30 sistemas entregados: ticketing, marketplaces, CRM, SaaS y plataformas empresariales. Demos navegables de cada uno.",
    type: "website",
    locale: "es_PA",
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale("es");
  return (
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Portafolio", path: "/portfolio" },
        ])}
      />
      {children}
    </NextIntlClientProvider>
  );
}
