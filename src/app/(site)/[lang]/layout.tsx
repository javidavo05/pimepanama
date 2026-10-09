import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../globals.css";
import { Reveal } from "@/components/motion/reveal";
import { Nav } from "@/components/sections/nav";
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
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
      </head>
      <body>
        <Nav lang={lang as Lang} />
        {children}
        <Reveal />
      </body>
    </html>
  );
}
