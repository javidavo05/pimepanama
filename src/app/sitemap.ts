import type { MetadataRoute } from "next";
import { CASOS } from "../../content/portfolio";
import { LANGS } from "../../content/site";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pimepanama.com";
const PAGINAS = ["", "/portfolio", "/servicios", "/empresa", "/contacto"];

/** Sitemap con las dos lenguas y sus alternates; las fichas solo de los casos publicables. */
export default function sitemap(): MetadataRoute.Sitemap {
  const rutas = [...PAGINAS, ...CASOS.filter((c) => c.publicable).map((c) => `/portfolio/${c.slug}`)];
  const base: MetadataRoute.Sitemap = rutas.flatMap((r) => LANGS.map((l) => ({
    url: `${BASE}/${l}${r}`,
    lastModified: new Date("2026-10-12"),
    changeFrequency: r === "" ? "weekly" as const : "monthly" as const,
    priority: r === "" ? 1 : r.startsWith("/portfolio/") ? 0.6 : 0.8,
    alternates: { languages: { "es-PA": `${BASE}/es${r}`, "en-US": `${BASE}/en${r}`, "x-default": `${BASE}/en${r}` } },
  })));
  return [...base, {
    url: `${BASE}/en/nearshore-software-development`,
    lastModified: new Date("2026-10-12"),
    changeFrequency: "monthly" as const,
    priority: 0.9,
    alternates: { languages: { "en-US": `${BASE}/en/nearshore-software-development` } },
  }];
}
