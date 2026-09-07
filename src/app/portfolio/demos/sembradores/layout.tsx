import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";
import { spanishOnlyAlternates, ROBOTS_INDEX } from "@/lib/seo-urls";
import esMessages from "../../../../../messages/es.json";

export const dynamic = "force-static";

const TITLE = "Software de gestión para iglesias en Panamá — Caso Sembradores";
const DESCRIPTION = "SaaS white-label de gestión eclesiástica: miembros, donaciones, eventos y multi-sede. Sistema a medida construido por Pime Panamá, con demo navegable.";

export const metadata: Metadata = {
  title: `${TITLE} | Pime Panamá`,
  description: DESCRIPTION,
  alternates: spanishOnlyAlternates("/portfolio/demos/sembradores"),
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
          { name: "Sembradores — SaaS de Gestión Eclesiástica", path: "/portfolio/demos/sembradores" },
        ])}
      />
      {children}
    </NextIntlClientProvider>
  );
}
