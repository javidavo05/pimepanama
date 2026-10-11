import { notFound } from "next/navigation";
import { SEO } from "../../../../../content/seo";
import { metaDePagina } from "@/lib/seo";
import type { Metadata } from "next";
import { CompanyPage } from "@/components/sections/company-page";
import { LANGS, type Lang } from "../../../../../content/site";

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params; return metaDePagina(lang, "/empresa", SEO.empresa[lang].titulo, SEO.empresa[lang].descripcion);
}
export default async function Empresa({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params; if (!LANGS.includes(lang)) notFound();
  return <CompanyPage lang={lang} />;
}
