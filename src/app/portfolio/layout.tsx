import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { alternatesFor, ROBOTS_INDEX } from "@/lib/seo-urls";
import { getCatalogStats } from "@/lib/portfolio/catalog";
import esMessages from "../../../messages/es.json";

export const dynamic = "force-static";

const stats = getCatalogStats();

export const metadata: Metadata = {
  title: `Portafolio: ${stats.total} sistemas construidos en Panamá | Pime Panamá`,
  description: `Desde sitios institucionales hasta plataformas multi-tenant con terminales en la calle: ${stats.total} sistemas con sus rutas, pantallas y stack. ${stats.inProduction} en producción.`,
  alternates: alternatesFor("/portfolio", "es"),
  robots: ROBOTS_INDEX,
  openGraph: {
    title: `Portafolio: ${stats.total} sistemas construidos en Panamá | Pime Panamá`,
    description: `Motor de portafolio de Pime Panamá: cada sistema con sus rutas de acceso, su pantalla y su nivel de complejidad.`,
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
