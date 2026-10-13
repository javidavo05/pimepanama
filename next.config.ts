import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Lo que los PDF leen de disco: fuentes .ttf y los logos de cada línea de marca (react-pdf no lee SVG).
const PDF_FONT_TRACE = ["./public/fonts/pdf/**/*", "./public/brand/*.png"] as const;
// El contrato en HTML (Chromium) incrusta su hoja de estilos, fuentes y logos SVG desde public/.
const PDF_HTML_TRACE = [...PDF_FONT_TRACE, "./public/design-system/**/*", "./public/brand/*.svg"] as const;

// pimepanama.com lo sirve pime-v2 y reenvía /empresa, /cliente, /firmar… a este proyecto. Next no deja
// reenviar /_next/static (devuelve 404 antes de mirar los reenvíos), así que las páginas de este proyecto
// piden su CSS, JS y fuentes directo a su propio dominio. Sin esto se ven sin formato y no funcionan.
const ORIGEN_PROPIO = process.env.VERCEL_ENV === "production" ? "https://pimepanama-wt62.vercel.app" : undefined;

// Las que se llaman con fetchLargo (src/lib/fetch-largo.ts).
const RUTAS_LARGAS = [
  "/api/empresa/meetings/:id/:accion(process|audio|materialize|ask)",
  "/api/empresa/voice-notes/:path*",
  "/api/empresa/voice-notes",
  "/api/empresa/ai/:accion(transcribe|analyze-contract)",
  "/api/empresa/projects/:id/repo",
  "/api/empresa/mail/backfill-sent",
  "/api/empresa/mail/accounts/:id/resync-bodies",
];

const nextConfig: NextConfig = {
  assetPrefix: ORIGEN_PROPIO,
  // react-pdf reads TTFs from disk in API routes; Vercel lambdas don't get public/ unless traced.
  outputFileTracingIncludes: {
    "/api/empresa/documents/[id]/pdf": [...PDF_FONT_TRACE],
    "/api/empresa/documents/preview": [...PDF_FONT_TRACE],
    "/api/cliente/facturas/[id]": [...PDF_FONT_TRACE],
    "/api/empresa/pagos/[id]/recibo": [...PDF_FONT_TRACE],
    "/api/cliente/pagos/[id]/recibo": [...PDF_FONT_TRACE],
    "/api/empresa/contracts/[id]/pdf": [...PDF_HTML_TRACE],
    "/api/empresa/contracts/[id]/signing/send": [...PDF_HTML_TRACE],
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
      // Rutas que pueden pasar de 120 s: desde pimepanama.com se llaman directo a este dominio con un permiso
      // firmado (src/lib/directo.ts), porque Vercel corta los reenvíos de pime-v2 a los 120 s.
      ...RUTAS_LARGAS.map((source) => ({
        source,
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://pimepanama.com" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
          { key: "Access-Control-Max-Age", value: "600" },
          { key: "Vary", value: "Origin" },
        ],
      })),
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
