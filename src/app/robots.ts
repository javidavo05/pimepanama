import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/empresa", "/cliente", "/admin", "/api/", "/avance"] },
    sitemap: "https://pimepanama.com/sitemap.xml",
    host: "https://pimepanama.com",
  };
}
