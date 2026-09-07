import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/structured-data";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030611",
};

export const metadata: Metadata = {
  icons: {
    icon: "/pime-icon.svg",
    apple: "/pime-icon.svg",
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
        className={`${syne.variable} ${inter.variable} text-white antialiased`}
        suppressHydrationWarning
      >
        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
