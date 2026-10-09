import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../../globals.css";
import { Reveal } from "@/components/motion/reveal";
import { Nav } from "@/components/sections/nav";
import { Footer } from "@/components/sections/footer";
import { CommandPalette } from "@/components/ui/command-palette";
import { LANGS, type Lang } from "../../../../content/site";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pimepanama.com";
const META = {
  es: { titulo: "Pime Panamá · ERP y CRM a medida", descripcion: "Diseñamos y programamos ERP, CRM y plataformas a medida desde cero para empresas en Panamá, con precio cerrado por fase y tres meses de garantía." },
  en: { titulo: "Pime Panamá · Custom ERP and CRM", descripcion: "We design and code custom ERP, CRM and platforms from scratch for companies in Panama, with a fixed price per phase and a three-month warranty." },
} as const;

/** Metadatos por idioma: título, descripción, hreflang (es, en, x-default) y Open Graph con su imagen. */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = (LANGS.includes(lang as Lang) ? lang : "es") as Lang;
  const m = META[l];
  return {
    metadataBase: new URL(BASE),
    title: { default: m.titulo, template: "%s · Pime Panamá" },
    description: m.descripcion,
    alternates: { canonical: `/${l}`, languages: { es: "/es", en: "/en", "x-default": "/es" } },
    openGraph: { type: "website", siteName: "Pime Panamá", locale: l === "es" ? "es_PA" : "en_US", alternateLocale: l === "es" ? ["en_US"] : ["es_PA"], url: `/${l}`, title: m.titulo, description: m.descripcion },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
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
        <Script id="tema" strategy="beforeInteractive">{"try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}"}</Script>
      </head>
      <body>
        <Nav lang={lang as Lang} />
        {children}
        <Footer lang={lang as Lang} />
        <CommandPalette lang={lang as Lang} />
        <Reveal />
      </body>
    </html>
  );
}
