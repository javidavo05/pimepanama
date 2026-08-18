import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const PDF_FONT_TRACE = ["./public/fonts/pdf/**/*"] as const;

const nextConfig: NextConfig = {
  // react-pdf reads TTFs from disk in API routes; Vercel lambdas don't get public/ unless traced.
  outputFileTracingIncludes: {
    "/api/empresa/documents/[id]/pdf": [...PDF_FONT_TRACE],
    "/api/empresa/documents/preview": [...PDF_FONT_TRACE],
    "/api/empresa/contracts/[id]/pdf": [...PDF_FONT_TRACE],
    "/api/empresa/contracts/preview": [...PDF_FONT_TRACE],
    "/api/empresa/contracts/preview/html": [...PDF_FONT_TRACE],
    "/api/empresa/projects/[id]/proposal-pdf": [...PDF_FONT_TRACE],
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
  async headers() {
    // HSTS solo en producción: en dev Chrome cachea la política para
    // "localhost" y fuerza https://, que no existe en el servidor local.
    const isProd = process.env.NODE_ENV === "production";
    return [
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
