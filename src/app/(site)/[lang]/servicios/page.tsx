import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ServicesPage } from "@/components/sections/services-page";
import { SERVICIOS } from "../../../../../content/paginas";
import { LANGS, type Lang } from "../../../../../content/site";

export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params; return { title: `${SERVICIOS[lang].eyebrow} · Pime Panamá`, description: SERVICIOS[lang].bajada };
}
export default async function Servicios({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params; if (!LANGS.includes(lang)) notFound();
  return <ServicesPage lang={lang} />;
}
