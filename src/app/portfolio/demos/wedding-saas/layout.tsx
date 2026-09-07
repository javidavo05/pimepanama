import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { spanishOnlyAlternates, ROBOTS_INDEX } from "@/lib/seo-urls";
import esMessages from "../../../../../messages/es.json";

export const dynamic = "force-static";

const TITLE = "Plataforma SaaS multi-tenant a medida — Caso Wedding SaaS";
const DESCRIPTION = "SaaS white-label multi-tenant con soporte para 7 idiomas e invitaciones interactivas. Ejemplo de arquitectura multi-inquilino construida por Pime Panamá.";

export const metadata: Metadata = {
  title: `${TITLE} | Pime Panamá`,
  description: DESCRIPTION,
  alternates: spanishOnlyAlternates("/portfolio/demos/wedding-saas"),
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
          { name: "Wedding SaaS — Plataforma de Bodas Multi-tenant", path: "/portfolio/demos/wedding-saas" },
        ])}
      />
      {children}
    </NextIntlClientProvider>
  );
}
