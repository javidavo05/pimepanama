import { notFound } from "next/navigation";
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
  return c ? { title: `${c.nombre} · ${c.cliente}`, description: c.resumen[lang] } : {};
}

export default async function CasePage({ params }: { params: Promise<{ lang: Lang; slug: string }> }) {
  const { lang, slug } = await params;
  const caso = CASOS.find((x) => x.slug === slug && x.publicable);
  if (!LANGS.includes(lang) || !caso) notFound();
  return <CaseDetail caso={caso} lang={lang} />;
}
