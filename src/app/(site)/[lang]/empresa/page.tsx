import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CompanyPage } from "@/components/sections/company-page";
import { EMPRESA } from "../../../../../content/paginas";
import { LANGS, type Lang } from "../../../../../content/site";

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params; return { title: `${EMPRESA[lang].eyebrow} · Pime Panamá`, description: EMPRESA[lang].bajada };
}
export default async function Empresa({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params; if (!LANGS.includes(lang)) notFound();
  return <CompanyPage lang={lang} />;
}
