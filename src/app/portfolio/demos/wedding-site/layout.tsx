import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { spanishOnlyAlternates, ROBOTS_INDEX } from "@/lib/seo-urls";
import esMessages from "../../../../../messages/es.json";

export const dynamic = "force-static";

const TITLE = "Aplicación web colaborativa a medida — Caso Wedding Site";
const DESCRIPTION = "App colaborativa con RSVP en tiempo real y galerías compartidas. Ejemplo de aplicación web a medida desarrollada por Pime Panamá, con demo navegable.";

export const metadata: Metadata = {
  title: `${TITLE} | Pime Panamá`,
  description: DESCRIPTION,
  alternates: spanishOnlyAlternates("/portfolio/demos/wedding-site"),
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
          { name: "Wedding Site — App Colaborativa de Bodas", path: "/portfolio/demos/wedding-site" },
        ])}
      />
      {children}
    </NextIntlClientProvider>
  );
}
