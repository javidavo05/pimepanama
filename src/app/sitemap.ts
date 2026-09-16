import { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";
import { SERVICES } from "@/lib/services-content";
import { projects } from "@/lib/portfolio/catalog";

export const dynamic = "force-static";

const LAUNCH_DATE = new Date("2026-06-17");
const UPDATED = new Date("2026-09-07");
const PORTFOLIO_UPDATED = new Date("2026-09-15");

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
      lastModified: PORTFOLIO_UPDATED,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: { "es-PA": `${base}/portfolio`, es: `${base}/portfolio`, en: `${base}/en/portfolio`, "x-default": `${base}/portfolio` },
      },
    },
    {
      url: `${base}/en/portfolio`,
      lastModified: PORTFOLIO_UPDATED,
      changeFrequency: "weekly",
      priority: 0.6,
      alternates: {
        languages: { "es-PA": `${base}/portfolio`, es: `${base}/portfolio`, en: `${base}/en/portfolio`, "x-default": `${base}/portfolio` },
      },
    },
    ...projects.flatMap((p) => {
      const es = `${base}/portfolio/${p.slug}`;
      const en = `${base}/en/portfolio/${p.slug}`;
      const languages = { "es-PA": es, es, en, "x-default": es };
      return [
        { url: es, lastModified: PORTFOLIO_UPDATED, changeFrequency: "monthly" as const, priority: 0.7, alternates: { languages } },
        { url: en, lastModified: PORTFOLIO_UPDATED, changeFrequency: "monthly" as const, priority: 0.5, alternates: { languages } },
      ];
    }),
    ...DEMOS.map((demo) => ({
      url: `${base}/portfolio/demos/${demo}`,
      lastModified: LAUNCH_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
