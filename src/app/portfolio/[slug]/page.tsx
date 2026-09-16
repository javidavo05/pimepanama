import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectEnginePage } from "@/components/portfolio-engine/project-page";
import { getProject, projects } from "@/lib/portfolio/catalog";
import { localizeProject } from "@/lib/portfolio/localize";
import { alternatesFor, ROBOTS_INDEX } from "@/lib/seo-urls";
import { JsonLd, breadcrumbSchema } from "@/lib/structured-data";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raw = getProject(slug);
  if (!raw) return {};
  const p = localizeProject(raw, "es");
  const title = `${p.name}: ${p.tagline} | Pime Panamá`;
  return {
    title,
    description: p.description,
    alternates: alternatesFor(`/portfolio/${slug}`, "es"),
    robots: ROBOTS_INDEX,
    openGraph: { title, description: p.description, type: "article", locale: "es_PA" },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = getProject(slug);
  if (!raw) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Portafolio", path: "/portfolio" },
          { name: raw.name, path: `/portfolio/${slug}` },
        ])}
      />
      <ProjectEnginePage slug={slug} locale="es" />
    </>
  );
}
