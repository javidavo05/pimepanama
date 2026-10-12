import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UsPage } from "@/components/sections/us-page";
import { EEUU, jsonLdEeuu } from "../../../../../content/eeuu";
import { jsonLdFaq } from "../../../../../content/faq";
import type { Lang } from "../../../../../content/site";
import { BASE } from "@/lib/seo";

/** Página para empresas de EE. UU.: solo en inglés (pregunta 38). /es/… no existe. */
export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== "en") return {};
  const ruta = "/en/nearshore-software-development";
  return {
    title: { absolute: EEUU.seo.titulo },
    description: EEUU.seo.descripcion,
    alternates: { canonical: ruta, languages: { "en-US": ruta, "x-default": ruta } },
    openGraph: { type: "website", siteName: "Pime Panamá", locale: "en_US", url: ruta, title: EEUU.seo.titulo, description: EEUU.seo.descripcion },
    twitter: { card: "summary_large_image", title: EEUU.seo.titulo, description: EEUU.seo.descripcion },
  };
}

export default async function Nearshore({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  if (lang !== "en") notFound();
  return (
    <>
      <UsPage />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLdEeuu(BASE), jsonLdFaq("en")]) }} />
    </>
  );
}
