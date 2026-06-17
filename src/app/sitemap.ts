import { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://pimepanama.com";

  // Cookie-based i18n: single canonical URL per page, hreflang both point to same URL
  const hreflang = (url: string) => ({ languages: { es: url, en: url } });

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: hreflang(base),
    },
    {
      url: `${base}/portfolio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: hreflang(`${base}/portfolio`),
    },
    {
      url: `${base}/portfolio/demos/academyx`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/academyx`),
    },
    {
      url: `${base}/portfolio/demos/bnb-real-estate`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/bnb-real-estate`),
    },
    {
      url: `${base}/portfolio/demos/godmode`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/godmode`),
    },
    {
      url: `${base}/portfolio/demos/sembradores`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/sembradores`),
    },
    {
      url: `${base}/portfolio/demos/tdp`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/tdp`),
    },
    {
      url: `${base}/portfolio/demos/tickets`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/tickets`),
    },
    {
      url: `${base}/portfolio/demos/wedding-saas`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/wedding-saas`),
    },
    {
      url: `${base}/portfolio/demos/wedding-site`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: hreflang(`${base}/portfolio/demos/wedding-site`),
    },
  ];
}
