import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { spanishOnlyAlternates, ROBOTS_INDEX } from "@/lib/seo-urls";
import esMessages from "../../../../../messages/es.json";

export const dynamic = "force-static";

const TITLE = "Plataforma de venta de tickets para eventos en Panamá — Caso Tickets";
const DESCRIPTION = "Plataforma de ticketing multi-tenant dimensionada para más de 50.000 transacciones diarias. Software a medida para eventos, con demo navegable.";

export const metadata: Metadata = {
  title: `${TITLE} | Pime Panamá`,
  description: DESCRIPTION,
  alternates: spanishOnlyAlternates("/portfolio/demos/tickets"),
  robots: ROBOTS_INDEX,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article", locale: "es_PA" },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale("es");
  return (
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Portafolio", path: "/portfolio" },
          { name: "Tickets — Plataforma de Ticketing Empresarial", path: "/portfolio/demos/tickets" },
        ])}
      />
      {children}
    </NextIntlClientProvider>
  );
}
