import { Hero } from "@/components/sections/hero";
import { Proof } from "@/components/sections/proof";
import { Capabilities } from "@/components/sections/capabilities";
import { FeaturedWork } from "@/components/sections/featured-work";
import { Process } from "@/components/sections/process";
import { Portal } from "@/components/sections/portal";
import { Industries } from "@/components/sections/industries";
import { Closing } from "@/components/sections/closing";
import { Faq } from "@/components/sections/faq";
import { jsonLdFaq } from "../../../../content/faq";
import type { Metadata } from "next";
import type { Lang } from "../../../../content/site";
import { SEO } from "../../../../content/seo";
import { metaDePagina } from "@/lib/seo";
import "./home.css";

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return metaDePagina(lang, "", SEO.home[lang].titulo, SEO.home[lang].descripcion);
}

/* La home, sección por sección. El footer vive en el layout. */
export default async function Home({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  return (
    <main className="home-skel">
      <Hero lang={lang} />
      <Proof lang={lang} />
      <Capabilities lang={lang} />
      <FeaturedWork lang={lang} />
      <Process lang={lang} />
      <Portal lang={lang} />
      <Industries lang={lang} />
      <Faq lang={lang} />
      <Closing lang={lang} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq(lang)) }} />
    </main>
  );
}
