import { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";

const LAUNCH_DATE = new Date("2026-06-17");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();

  // Cookie-based i18n: one canonical URL per page; x-default required by Google for language targeting
  const hreflang = (url: string) => ({ languages: { "x-default": url, es: url, en: url } });

  const demos = [
    "academyx",
    "bnb-real-estate",
    "godmode",
    "sembradores",
    "tdp",
    "tickets",
    "wedding-saas",
    "wedding-site",
  ];

  return [
    {
      url: base,
      lastModified: LAUNCH_DATE,
      changeFrequency: "monthly",
      priority: 1,
      alternates: hreflang(base),
    },
    {
      url: `${base}/portfolio`,
      lastModified: LAUNCH_DATE,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: hreflang(`${base}/portfolio`),
    },
    ...demos.map((demo) => ({
      url: `${base}/portfolio/demos/${demo}`,
      lastModified: LAUNCH_DATE,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/${demo}`),
    })),
  ];
}
