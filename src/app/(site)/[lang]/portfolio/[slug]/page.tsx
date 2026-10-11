import { notFound } from "next/navigation";
import { metaDePagina } from "@/lib/seo";
import type { Metadata } from "next";
import { CaseDetail } from "@/components/sections/case-detail";
import { CASOS } from "../../../../../../content/portfolio";
import { LANGS, type Lang } from "../../../../../../content/site";

export const instant = false; // todas las fichas se prerenderizan con generateStaticParams

export function generateStaticParams() {
  return LANGS.flatMap((lang) => CASOS.filter((c) => c.publicable).map((c) => ({ lang, slug: c.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const c = CASOS.find((x) => x.slug === slug && x.publicable);
  if (!c) return {};
  const titulo = lang === "es" ? `${c.cliente}: ${c.tipo.es} a medida | Pime` : `${c.cliente}: custom ${c.tipo.en} | Pime`;
  return metaDePagina(lang, `/portfolio/${c.slug}`, titulo, c.resumen[lang]);
}

export default async function CasePage({ params }: { params: Promise<{ lang: Lang; slug: string }> }) {
  const { lang, slug } = await params;
  const caso = CASOS.find((x) => x.slug === slug && x.publicable);
  if (!LANGS.includes(lang) || !caso) notFound();
  return <CaseDetail caso={caso} lang={lang} />;
}
