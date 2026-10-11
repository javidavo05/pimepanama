import { notFound } from "next/navigation";
import { SEO } from "../../../../../content/seo";
import { metaDePagina } from "@/lib/seo";
import type { Metadata } from "next";
import { ServicesPage } from "@/components/sections/services-page";
import { LANGS, type Lang } from "../../../../../content/site";

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params; return metaDePagina(lang, "/servicios", SEO.servicios[lang].titulo, SEO.servicios[lang].descripcion);
}
export default async function Servicios({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params; if (!LANGS.includes(lang)) notFound();
  return <ServicesPage lang={lang} />;
}
