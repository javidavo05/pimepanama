import { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";
import { SERVICES } from "@/lib/services-content";

export const dynamic = "force-static";

const LAUNCH_DATE = new Date("2026-06-17");
const UPDATED = new Date("2026-09-07");

const DEMOS = [
  "academyx",
  "bnb-real-estate",
  "godmode",
  "sembradores",
  "tdp",
  "tickets",
  "wedding-saas",
  "wedding-site",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();

  return [
    // Portada: existe en los dos idiomas, con URLs distintas.
    {
      url: base,
      lastModified: UPDATED,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: { "es-PA": base, es: base, en: `${base}/en`, "x-default": base },
      },
    },
    {
      url: `${base}/en`,
      lastModified: UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: { "es-PA": base, es: base, en: `${base}/en`, "x-default": base },
      },
    },

    // Páginas de servicio: son las que compiten por las consultas comerciales.
    ...SERVICES.map((s) => ({
      url: `${base}/${s.slug}`,
      lastModified: UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),

    {
      url: `${base}/portfolio`,
      lastModified: UPDATED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...DEMOS.map((demo) => ({
      url: `${base}/portfolio/demos/${demo}`,
      lastModified: LAUNCH_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
