import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

import { ServicePage } from "@/components/landing/service-page";
import { getService } from "@/lib/services-content";
import { spanishOnlyAlternates, ROBOTS_INDEX } from "@/lib/seo-urls";
import { JsonLd, breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/structured-data";
import esMessages from "../../../messages/es.json";

export const dynamic = "force-static";

const SLUG = "desarrollo-de-aplicaciones-web";
const service = getService(SLUG)!;

export const metadata: Metadata = {
  title: service.metaTitle,
  description: service.metaDescription,
  alternates: spanishOnlyAlternates(`/${SLUG}`),
  robots: ROBOTS_INDEX,
  openGraph: {
    title: service.metaTitle,
    description: service.metaDescription,
    url: `https://pimepanama.com/${SLUG}`,
    siteName: "Pime Panamá",
    locale: "es_PA",
    type: "website",
  },
};

export default function Page() {
  setRequestLocale("es");
  return (
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <JsonLd
        data={[
          serviceSchema({
            name: service.h1,
            description: service.metaDescription,
            path: `/${SLUG}`,
            serviceTypes: service.serviceTypes,
          }),
          faqSchema(service.faqs.map((f) => ({ q: f.q, a: f.a }))),
          breadcrumbSchema([
            { name: "Inicio", path: "/" },
            { name: service.shortName, path: `/${SLUG}` },
          ]),
        ]}
      />
      <ServicePage service={service} />
    </NextIntlClientProvider>
  );
}
