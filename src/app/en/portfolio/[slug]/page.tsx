import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectEnginePage } from "@/components/portfolio-engine/project-page";
import { getProject, projects } from "@/lib/portfolio/catalog";
import { localizeProject } from "@/lib/portfolio/localize";
import { alternatesFor, ROBOTS_INDEX } from "@/lib/seo-urls";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raw = getProject(slug);
  if (!raw) return {};
  const p = localizeProject(raw, "en");
  const title = `${p.name}: ${p.tagline} | Pime Panamá`;
  return {
    title,
    description: p.description,
    alternates: alternatesFor(`/portfolio/${slug}`, "en"),
    robots: ROBOTS_INDEX,
    openGraph: { title, description: p.description, type: "article", locale: "en_US" },
  };
}

export default async function ProjectPageEn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getProject(slug)) notFound();
  return <ProjectEnginePage slug={slug} locale="en" />;
}
