import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const PDF_FONT_TRACE = ["./public/fonts/pdf/**/*"] as const;

// pimepanama.com lo sirve pime-v2 y reenvía /empresa, /cliente, /firmar… a este proyecto. Next no deja
// reenviar /_next/static (devuelve 404 antes de mirar los reenvíos), así que las páginas de este proyecto
// piden su CSS, JS y fuentes directo a su propio dominio. Sin esto se ven sin formato y no funcionan.
const ORIGEN_PROPIO = process.env.VERCEL_ENV === "production" ? "https://pimepanama-wt62.vercel.app" : undefined;

const nextConfig: NextConfig = {
  assetPrefix: ORIGEN_PROPIO,
  // react-pdf reads TTFs from disk in API routes; Vercel lambdas don't get public/ unless traced.
  outputFileTracingIncludes: {
    "/api/empresa/documents/[id]/pdf": [...PDF_FONT_TRACE],
    "/api/empresa/documents/preview": [...PDF_FONT_TRACE],
    "/api/empresa/contracts/[id]/pdf": [...PDF_FONT_TRACE],
    "/api/empresa/contracts/preview": [...PDF_FONT_TRACE],
    "/api/empresa/contracts/preview/html": [...PDF_FONT_TRACE],
    "/api/empresa/projects/[id]/proposal-pdf": [...PDF_FONT_TRACE],
    "/api/empresa/pulso/paquete": ["./packages/pime-pulso/pulso.ts"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.cloudflarestorage.com",
      },
    ],
  },
  async redirects() {
    // Un solo dominio: la app instalada (PWA) vive en pimepanama.com. Si alguien
    // la instalaba desde www, cualquier enlace a pimepanama.com salía de la app
    // y Android/iOS le ponían encima la barra del navegador.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pimepanama.com" }],
        destination: "https://pimepanama.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    // HSTS solo en producción: en dev Chrome cachea la política para
    // "localhost" y fuerza https://, que no existe en el servidor local.
    const isProd = process.env.NODE_ENV === "production";
    return [
      // Las fuentes se piden desde pimepanama.com a este dominio: necesitan permiso entre orígenes.
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
      {
        source: "/(.*)",
        headers: [
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
