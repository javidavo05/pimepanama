import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import "../../globals.css";
import { Reveal } from "@/components/motion/reveal";
import { Nav } from "@/components/sections/nav";
import { Footer } from "@/components/sections/footer";
import { LANGS, type Lang } from "../../../../content/site";

export const metadata: Metadata = {
  title: "Pime Panamá",
  description: "Software a medida para empresas en Panamá.",
  robots: { index: false, follow: false },
};

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
        <Reveal />
      </body>
    </html>
  );
}
