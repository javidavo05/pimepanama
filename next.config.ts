import type { NextConfig } from "next";
import { CASES_V } from "./content/cases-version";

const nextConfig: NextConfig = {
  images: { localPatterns: [{ pathname: "/cases/**", search: `?v=${CASES_V}` }, { pathname: "/**", search: "" }] },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { inlineCss: true, globalNotFound: true },
  // Solo cambia el front end (Javier, 2026-10-10): el CMS sigue en el proyecto anterior de Vercel. Desde
  // pimepanama.com, todo lo que es del CMS se reenvía allá sin que el navegador lo note: panel /empresa, cuenta del
  // cliente /cliente, admin,
  // firmas y agenda de clientes, y la API (menos /api/leads, que es de este sitio y a su vez llama al CMS).
  // Los recursos /_next que este sitio no tiene (los del CMS) también se reenvían, en último lugar.
  async rewrites() {
    const CMS = process.env.CMS_ORIGIN ?? "https://pimepanama-wt62.vercel.app";
    const prefijos = ["empresa", "cliente", "admin", "firmar", "agendar", "resume", "baja", "api"];
    return {
      afterFiles: [
        ...prefijos.flatMap((p) => [
          { source: `/${p}`, destination: `${CMS}/${p}` },
          { source: `/${p}/:path*`, destination: `${CMS}/${p}/:path*` },
        ]),
        // Archivos públicos del CMS que pide /empresa (app instalable, íconos, logo de correos y PDFs, sistema de
        // diseño de contratos). Van después de los archivos propios: si este sitio tiene el archivo, gana el suyo.
        ...["/logo-pime.png", "/pime-icon.svg", "/pime-logo.svg", "/manifest.webmanifest", "/sw-empresa.js", "/offline-empresa.html"].map(
          (f) => ({ source: f, destination: `${CMS}${f}` }),
        ),
        ...["icons", "design-system", "brand", "fonts/pdf"].map((d) => ({ source: `/${d}/:path*`, destination: `${CMS}/${d}/:path*` })),
      ],
      fallback: [{ source: "/_next/:path*", destination: `${CMS}/_next/:path*` }],
    };
  },
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
