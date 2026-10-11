import { notFound } from "next/navigation";
import { SEO } from "../../../../../content/seo";
import { metaDePagina } from "@/lib/seo";
import type { Metadata } from "next";
import { ContactWizard } from "@/components/sections/contact-wizard";
import { INDUSTRIAS } from "../../../../../content/portfolio";
import { LANGS, type Lang } from "../../../../../content/site";
import "./contacto.css";

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return metaDePagina(lang, "/contacto", SEO.contacto[lang].titulo, SEO.contacto[lang].descripcion);
}

export default async function Contacto({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  return (
    <main className="ct" data-motion="wizard">
      <div className="wrap"><ContactWizard lang={lang} industrias={INDUSTRIAS(lang)} /></div>
    </main>
  );
}
