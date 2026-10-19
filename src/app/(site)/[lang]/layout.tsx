import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../../globals.css";
import { Reveal } from "@/components/motion/reveal";
import { Nav } from "@/components/sections/nav";
import { Footer } from "@/components/sections/footer";
import { CommandPalette } from "@/components/ui/command-palette";
import { LANGS, type Lang } from "../../../../content/site";
import { SEO } from "../../../../content/seo";
import { jsonLdEmpresa } from "@/lib/seo";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pimepanama.com";

/** Barra del navegador del teléfono del color del sitio, según el esquema del sistema; el selector de tema la ajusta. */
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FCFDFE" }, { media: "(prefers-color-scheme: dark)", color: "#08142A" }], width: "device-width", initialScale: 1, viewportFit: "cover" };
/** Metadatos base del sitio. Cada página fija su título, descripción y canónica con metaDePagina (src/lib/seo.ts);
 *  aquí no va canónica: antes todas las páginas heredaban la de la home. */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = (LANGS.includes(lang as Lang) ? lang : "es") as Lang;
  return {
    metadataBase: new URL(BASE),
    title: { default: SEO.home[l].titulo, template: "%s · Pime Panamá" },
    description: SEO.home[l].descripcion,
    applicationName: "Pime Panamá",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!LANGS.includes(lang as Lang)) notFound();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/manrope-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* LinkedIn lee la fecha solo con el atributo property (el name= de metadata.other no le basta). */}
        <meta property="og:publish_date" content="2026-10-10T00:00:00-05:00" />
        <meta property="article:published_time" content="2026-10-10T00:00:00-05:00" />
        <Script id="tema" strategy="beforeInteractive">{"try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}"}</Script>
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdEmpresa(lang as Lang)) }} />
        <Nav lang={lang as Lang} />
        {children}
        <Footer lang={lang as Lang} />
        <CommandPalette lang={lang as Lang} />
        <Reveal />
      </body>
    </html>
  );
}
