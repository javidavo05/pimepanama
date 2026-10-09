import type { NextConfig } from "next";
import { CASES_V } from "./content/cases-version";

const nextConfig: NextConfig = {
  images: { localPatterns: [{ pathname: "/cases/**", search: `?v=${CASES_V}` }, { pathname: "/**", search: "" }] },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { inlineCss: true },
  // Redirecciones 301 desde el sitemap del sitio anterior (docs/00-mandato.md, anexo). Las rutas que ya no
  // existen van a la página equivalente; las demos y los casos no publicables, al portfolio.
  async redirects() {
    const viejas = [
      ["/desarrollo-de-software-a-medida", "/es/servicios"],
      ["/sistemas-empresariales-erp", "/es/servicios#erp"],
      ["/desarrollo-de-aplicaciones-web", "/es/servicios#portal"],
      ["/desarrollo-de-aplicaciones-moviles", "/es/servicios#portal"],
      ["/portfolio", "/es/portfolio"],
      ["/portfolio/visita7", "/es/portfolio"],
      ["/en/portfolio/visita7", "/en/portfolio"],
      ["/portfolio/wedding-site", "/es/portfolio"],
      ["/en/portfolio/wedding-site", "/en/portfolio"],
      ["/portfolio/cifrapp", "/es/portfolio"],
      ["/en/portfolio/cifrapp", "/en/portfolio"],
      ["/portfolio/demos/:slug*", "/es/portfolio"],
      ["/contacto", "/es/contacto"],
      ["/en/contact", "/en/contacto"],
    ];
    return [
      { source: "/", destination: "/es", permanent: false },
      ...viejas.map(([source, destination]) => ({ source, destination, permanent: true })),
      // Fichas del sitio anterior con el mismo slug: /portfolio/<slug> → /es/portfolio/<slug>
      { source: "/portfolio/:slug", destination: "/es/portfolio/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
