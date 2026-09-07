import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { spanishOnlyAlternates, ROBOTS_INDEX } from "@/lib/seo-urls";
import esMessages from "../../../../../messages/es.json";

export const dynamic = "force-static";

const TITLE = "CRM para academias deportivas en Panamá — Caso Academyx";
const DESCRIPTION = "CRM y SaaS de gestión para academias de fútbol: inscripciones multi-rol, cobros y seguimiento de alumnos. Software a medida con demo navegable.";

export const metadata: Metadata = {
  title: `${TITLE} | Pime Panamá`,
  description: DESCRIPTION,
  alternates: spanishOnlyAlternates("/portfolio/demos/academyx"),
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
          { name: "Academyx — CRM para Academia de Fútbol", path: "/portfolio/demos/academyx" },
        ])}
      />
      {children}
    </NextIntlClientProvider>
  );
}
