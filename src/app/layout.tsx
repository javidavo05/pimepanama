import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/structured-data";

// Una sola familia en todo el producto (manual de marca): Manrope para títulos y texto.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060E1E",
};

export const metadata: Metadata = {
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/pime-icon.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon-180.png",
  },
  verification: {
    google: "OTj-RcT9lrWRDHTA8ZWZUWcBn3G4-fuM_V9EfjPLyAQ",
  },
};

/**
 * Layout raíz. No lee cookies ni cabeceras a propósito: en cuanto lo hace,
 * todas las páginas que cuelgan de él pasan a renderizarse dinámicas, la
 * metadata deja de salir en el <head> y se pierde la caché del CDN.
 *
 * El idioma se declara acá como español porque es el sitio canónico; la rama
 * /en lo corrige para su subárbol.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <JsonLd data={[organizationSchema, websiteSchema]} />
      </head>
      <body
        className={`${manrope.variable} text-white antialiased`}
        suppressHydrationWarning
      >
        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
