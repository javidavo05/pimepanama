import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";

import dynamicImport from "next/dynamic";

import { prisma } from "@/lib/prisma";

import { ensureAuthenticated } from "../actions";

const AdminClientShell = dynamicImport(() => import("./client-shell"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-xs uppercase tracking-[0.4em] text-white/30">
      Initializing console…
    </div>
  ),
});

export const dynamic = "force-dynamic";

const requiredString = z
  .string()
  .min(1)
  .transform((value) => value.trim());

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  });

const revalidateTargets = ["/admin", "/", "/en", "/es"];

function revalidateAll() {
  revalidateTargets.forEach((path) => revalidatePath(path));
}

const heroSchema = z.object({
  id: requiredString,
  headline_en: requiredString,
  headline_es: requiredString,
  subheadline_en: requiredString,
  subheadline_es: requiredString,
  highlight_en: optionalString,
  highlight_es: optionalString,
  backgroundImageUrl: optionalString,
  backgroundVideoUrl: optionalString,
  ctaPrimaryLabel_en: optionalString,
  ctaPrimaryLabel_es: optionalString,
  ctaPrimaryLink: optionalString,
  ctaSecondaryLabel_en: optionalString,
  ctaSecondaryLabel_es: optionalString,
  ctaSecondaryLink: optionalString,
});

async function updateHero(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const raw = Object.fromEntries(formData.entries());
  const parsed = heroSchema.parse(raw);

  await prisma.hero.update({
    where: { id: parsed.id },
    data: {
      headline_en: parsed.headline_en,
      headline_es: parsed.headline_es,
      subheadline_en: parsed.subheadline_en,
      subheadline_es: parsed.subheadline_es,
      highlight_en: parsed.highlight_en,
      highlight_es: parsed.highlight_es,
      backgroundImageUrl: parsed.backgroundImageUrl,
      backgroundVideoUrl: parsed.backgroundVideoUrl,
      ctaPrimaryLabel_en: parsed.ctaPrimaryLabel_en,
      ctaPrimaryLabel_es: parsed.ctaPrimaryLabel_es,
      ctaPrimaryLink: parsed.ctaPrimaryLink,
      ctaSecondaryLabel_en: parsed.ctaSecondaryLabel_en,
      ctaSecondaryLabel_es: parsed.ctaSecondaryLabel_es,
      ctaSecondaryLink: parsed.ctaSecondaryLink,
    },
  });

  revalidateAll();
}

const sectionSchema = z.object({
  id: requiredString,
  slug: requiredString,
  title_en: optionalString,
  title_es: optionalString,
  subtitle_en: optionalString,
  subtitle_es: optionalString,
  body_en: optionalString,
  body_es: optionalString,
});

async function updateSection(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const parsed = sectionSchema.parse(Object.fromEntries(formData.entries()));

  await prisma.pageSection.update({
    where: { id: parsed.id },
    data: {
      title_en: parsed.title_en,
      title_es: parsed.title_es,
      subtitle_en: parsed.subtitle_en,
      subtitle_es: parsed.subtitle_es,
      body_en: parsed.body_en,
      body_es: parsed.body_es,
    },
  });

  revalidateAll();
}

const serviceSchema = z.object({
  id: requiredString,
  slug: requiredString,
  order: z.coerce.number().int(),
  title_en: requiredString,
  title_es: requiredString,
  description_en: requiredString,
  description_es: requiredString,
  icon: optionalString,
  imageUrl: optionalString,
});

async function updateService(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const parsed = serviceSchema.parse(Object.fromEntries(formData.entries()));

  await prisma.service.update({
    where: { id: parsed.id },
    data: {
      slug: parsed.slug,
      order: parsed.order,
      title_en: parsed.title_en,
      title_es: parsed.title_es,
      description_en: parsed.description_en,
      description_es: parsed.description_es,
      icon: parsed.icon,
      imageUrl: parsed.imageUrl,
    },
  });

  revalidateAll();
}

const sectorSchema = z.object({
  id: requiredString,
  slug: requiredString,
  order: z.coerce.number().int(),
  title_en: requiredString,
  title_es: requiredString,
  description_en: optionalString,
  description_es: optionalString,
});

async function updateSector(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const parsed = sectorSchema.parse(Object.fromEntries(formData.entries()));

  await prisma.sector.update({
    where: { id: parsed.id },
    data: {
      slug: parsed.slug,
      order: parsed.order,
      title_en: parsed.title_en,
      title_es: parsed.title_es,
      description_en: parsed.description_en,
      description_es: parsed.description_es,
    },
  });

  revalidateAll();
}

async function updateDifferentiator(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const differentiatorSchema = z.object({
    id: requiredString,
    slug: requiredString,
    order: z.coerce.number().int(),
    title_en: requiredString,
    title_es: requiredString,
    description_en: requiredString,
    description_es: requiredString,
  });
  const parsed = differentiatorSchema.parse(Object.fromEntries(formData.entries()));

  await prisma.differentiator.update({
    where: { id: parsed.id },
    data: {
      slug: parsed.slug,
      order: parsed.order,
      title_en: parsed.title_en,
      title_es: parsed.title_es,
      description_en: parsed.description_en,
      description_es: parsed.description_es,
    },
  });

  revalidateAll();
}

const portfolioSchema = z.object({
  id: requiredString,
  slug: requiredString,
  order: z.coerce.number().int(),
  title_en: requiredString,
  title_es: requiredString,
  summary_en: requiredString,
  summary_es: requiredString,
  outcome_en: optionalString,
  outcome_es: optionalString,
  clientName: optionalString,
  industry_en: optionalString,
  industry_es: optionalString,
  imageUrl: optionalString,
  caseStudyUrl: optionalString,
});

async function updatePortfolioItem(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const parsed = portfolioSchema.parse(Object.fromEntries(formData.entries()));

  await prisma.portfolioItem.update({
    where: { id: parsed.id },
    data: {
      slug: parsed.slug,
      order: parsed.order,
      title_en: parsed.title_en,
      title_es: parsed.title_es,
      summary_en: parsed.summary_en,
      summary_es: parsed.summary_es,
      outcome_en: parsed.outcome_en,
      outcome_es: parsed.outcome_es,
      clientName: parsed.clientName,
      industry_en: parsed.industry_en,
      industry_es: parsed.industry_es,
      imageUrl: parsed.imageUrl,
      caseStudyUrl: parsed.caseStudyUrl,
    },
  });

  revalidateAll();
}

const ctaSchema = z.object({
  id: requiredString,
  slug: requiredString,
  order: z.coerce.number().int(),
  eyebrow_en: optionalString,
  eyebrow_es: optionalString,
  title_en: requiredString,
  title_es: requiredString,
  description_en: optionalString,
  description_es: optionalString,
  buttonLabel_en: optionalString,
  buttonLabel_es: optionalString,
  buttonLink: optionalString,
});

async function updateCallToAction(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const parsed = ctaSchema.parse(Object.fromEntries(formData.entries()));

  await prisma.callToAction.update({
    where: { id: parsed.id },
    data: {
      slug: parsed.slug,
      order: parsed.order,
      eyebrow_en: parsed.eyebrow_en,
      eyebrow_es: parsed.eyebrow_es,
      title_en: parsed.title_en,
      title_es: parsed.title_es,
      description_en: parsed.description_en,
      description_es: parsed.description_es,
      buttonLabel_en: parsed.buttonLabel_en,
      buttonLabel_es: parsed.buttonLabel_es,
      buttonLink: parsed.buttonLink,
    },
  });

  revalidateAll();
}

const seoSchema = z.object({
  id: requiredString,
  page: requiredString,
  metaTitle_en: requiredString,
  metaTitle_es: requiredString,
  metaDescription_en: requiredString,
  metaDescription_es: requiredString,
  ogImageUrl: optionalString,
  keywords_en: optionalString,
  keywords_es: optionalString,
});

async function updateSeo(formData: FormData) {
  "use server";

  await ensureAuthenticated();
  const parsed = seoSchema.parse(Object.fromEntries(formData.entries()));

  await prisma.seoSetting.update({
    where: { id: parsed.id },
    data: {
      page: parsed.page,
      metaTitle_en: parsed.metaTitle_en,
      metaTitle_es: parsed.metaTitle_es,
      metaDescription_en: parsed.metaDescription_en,
      metaDescription_es: parsed.metaDescription_es,
      ogImageUrl: parsed.ogImageUrl,
      keywords_en: parsed.keywords_en,
      keywords_es: parsed.keywords_es,
    },
  });

  revalidateAll();
}

function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/40 backdrop-blur">
      <div className="mb-6 space-y-2">
        <h2 className="text-lg font-semibold uppercase tracking-[0.3em] text-white">{title}</h2>
        {description ? <p className="text-sm text-white/40">{description}</p> : null}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

const inputStyles =
  "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40";

const textareaStyles =
  "w-full rounded-md border border-white/15 bg-black/40 px-3 py-3 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40";

function FormField({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">{label}</span>
      <input
        className={inputStyles}
        name={name}
        defaultValue={defaultValue ?? ""}
        type={type}
        autoComplete="off"
      />
    </label>
  );
}

function FormTextarea({
  label,
  name,
  defaultValue,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">{label}</span>
      <textarea className={textareaStyles} name={name} defaultValue={defaultValue ?? ""} rows={rows} />
    </label>
  );
}

function SubmitBar({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-end">
      <button
        type="submit"
        className="rounded-md border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40 hover:text-white"
      >
        {label ?? "Save changes"}
      </button>
    </div>
  );
}

export default async function AdminPage() {
  const [hero, sections, services, sectors, differentiators, portfolio, ctas, seo] = await Promise.all([
    prisma.hero.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.pageSection.findMany(),
    prisma.service.findMany({ orderBy: { order: "asc" } }),
    prisma.sector.findMany({ orderBy: { order: "asc" } }),
    prisma.differentiator.findMany({ orderBy: { order: "asc" } }),
    prisma.portfolioItem.findMany({ orderBy: { order: "asc" } }),
    prisma.callToAction.findMany({ orderBy: { order: "asc" } }),
    prisma.seoSetting.findMany(),
  ]);

  if (!hero) {
    notFound();
  }

  const sectionBySlug = new Map(sections.map((section) => [section.slug, section]));
  const seoHome = seo.find((item) => item.page === "home");

  return (
    <AdminClientShell>
      <AdminSection
        title="Hero"
        description="Update the primary bilingual messaging, media, and hero calls to action."
      >
        <form action={updateHero} className="grid gap-6">
          <input type="hidden" name="id" defaultValue={hero.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Headline (EN)" name="headline_en" defaultValue={hero.headline_en} />
            <FormField label="Headline (ES)" name="headline_es" defaultValue={hero.headline_es} />
            <FormTextarea
              label="Subheadline (EN)"
              name="subheadline_en"
              defaultValue={hero.subheadline_en}
              rows={3}
            />
            <FormTextarea
              label="Subheadline (ES)"
              name="subheadline_es"
              defaultValue={hero.subheadline_es}
              rows={3}
            />
            <FormTextarea label="Highlight (EN)" name="highlight_en" defaultValue={hero.highlight_en} rows={2} />
            <FormTextarea label="Highlight (ES)" name="highlight_es" defaultValue={hero.highlight_es} rows={2} />
            <FormField
              label="Background Image URL"
              name="backgroundImageUrl"
              defaultValue={hero.backgroundImageUrl}
            />
            <FormField
              label="Background Video URL"
              name="backgroundVideoUrl"
              defaultValue={hero.backgroundVideoUrl}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Primary CTA Label (EN)" name="ctaPrimaryLabel_en" defaultValue={hero.ctaPrimaryLabel_en} />
            <FormField label="Primary CTA Label (ES)" name="ctaPrimaryLabel_es" defaultValue={hero.ctaPrimaryLabel_es} />
            <FormField label="Primary CTA Link" name="ctaPrimaryLink" defaultValue={hero.ctaPrimaryLink} />
            <FormField
              label="Secondary CTA Label (EN)"
              name="ctaSecondaryLabel_en"
              defaultValue={hero.ctaSecondaryLabel_en}
            />
            <FormField
              label="Secondary CTA Label (ES)"
              name="ctaSecondaryLabel_es"
              defaultValue={hero.ctaSecondaryLabel_es}
            />
            <FormField label="Secondary CTA Link" name="ctaSecondaryLink" defaultValue={hero.ctaSecondaryLink} />
          </div>
          <SubmitBar />
        </form>
      </AdminSection>

      <AdminSection
        title="Page Sections"
        description="Control headings and copy for core sections that appear on the public site."
      >
        {["services", "value", "sectors", "differentials", "portfolio", "cta"].map((slug) => {
          const section = sectionBySlug.get(slug);
          if (!section) return null;
          return (
            <form key={slug} action={updateSection} className="grid gap-4 rounded-xl border border-white/10 p-6">
              <input type="hidden" name="id" defaultValue={section.id} />
              <input type="hidden" name="slug" defaultValue={section.slug} />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Title (EN)" name="title_en" defaultValue={section.title_en} />
                <FormField label="Title (ES)" name="title_es" defaultValue={section.title_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea label="Subtitle (EN)" name="subtitle_en" defaultValue={section.subtitle_en} rows={3} />
                <FormTextarea label="Subtitle (ES)" name="subtitle_es" defaultValue={section.subtitle_es} rows={3} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea label="Body (EN)" name="body_en" defaultValue={section.body_en} rows={4} />
                <FormTextarea label="Body (ES)" name="body_es" defaultValue={section.body_es} rows={4} />
              </div>
              <SubmitBar label="Save section" />
            </form>
          );
        })}
      </AdminSection>

      <AdminSection
        title="Services"
        description="Edit the four strategic service pillars. Use the order field to control display sequencing."
      >
        <div className="grid gap-6">
          {services.map((service) => (
            <form key={service.id} action={updateService} className="grid gap-4 rounded-xl border border-white/10 p-6">
              <input type="hidden" name="id" defaultValue={service.id} />
              <div className="grid gap-4 md:grid-cols-4">
                <FormField label="Slug" name="slug" defaultValue={service.slug} />
                <FormField label="Order" name="order" type="number" defaultValue={service.order} />
                <FormField label="Icon Name" name="icon" defaultValue={service.icon} />
                <FormField label="Image URL" name="imageUrl" defaultValue={service.imageUrl} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Title (EN)" name="title_en" defaultValue={service.title_en} />
                <FormField label="Title (ES)" name="title_es" defaultValue={service.title_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea
                  label="Description (EN)"
                  name="description_en"
                  defaultValue={service.description_en}
                  rows={4}
                />
                <FormTextarea
                  label="Description (ES)"
                  name="description_es"
                  defaultValue={service.description_es}
                  rows={4}
                />
              </div>
              <SubmitBar />
            </form>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Sectors"
        description="Manage the industry coverage list shown on the one-page experience."
      >
        <div className="grid gap-6">
          {sectors.map((sector) => (
            <form key={sector.id} action={updateSector} className="grid gap-4 rounded-xl border border-white/10 p-6">
              <input type="hidden" name="id" defaultValue={sector.id} />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Slug" name="slug" defaultValue={sector.slug} />
                <FormField label="Order" name="order" type="number" defaultValue={sector.order} />
                <FormField label="Title (EN)" name="title_en" defaultValue={sector.title_en} />
                <FormField label="Title (ES)" name="title_es" defaultValue={sector.title_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea
                  label="Description (EN)"
                  name="description_en"
                  defaultValue={sector.description_en}
                  rows={3}
                />
                <FormTextarea
                  label="Description (ES)"
                  name="description_es"
                  defaultValue={sector.description_es}
                  rows={3}
                />
              </div>
              <SubmitBar />
            </form>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Differentiators"
        description="Showcase the competitive advantages that distinguish PIME Panama."
      >
        <div className="grid gap-6">
          {differentiators.map((valuePoint) => (
            <form
              key={valuePoint.id}
              action={updateDifferentiator}
              className="grid gap-4 rounded-xl border border-white/10 p-6"
            >
              <input type="hidden" name="id" defaultValue={valuePoint.id} />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Slug" name="slug" defaultValue={valuePoint.slug} />
                <FormField label="Order" name="order" type="number" defaultValue={valuePoint.order} />
                <FormField label="Title (EN)" name="title_en" defaultValue={valuePoint.title_en} />
                <FormField label="Title (ES)" name="title_es" defaultValue={valuePoint.title_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea
                  label="Description (EN)"
                  name="description_en"
                  defaultValue={valuePoint.description_en}
                  rows={3}
                />
                <FormTextarea
                  label="Description (ES)"
                  name="description_es"
                  defaultValue={valuePoint.description_es}
                  rows={3}
                />
              </div>
              <SubmitBar />
            </form>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Portfolio Systems"
        description="Update the flagship platforms that appear in the public case study carousel."
      >
        <div className="grid gap-6">
          {portfolio.map((item) => (
            <form key={item.id} action={updatePortfolioItem} className="grid gap-4 rounded-xl border border-white/10 p-6">
              <input type="hidden" name="id" defaultValue={item.id} />
              <div className="grid gap-4 md:grid-cols-4">
                <FormField label="Slug" name="slug" defaultValue={item.slug} />
                <FormField label="Order" name="order" type="number" defaultValue={item.order} />
                <FormField label="Client Name" name="clientName" defaultValue={item.clientName} />
                <FormField label="Image URL" name="imageUrl" defaultValue={item.imageUrl} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Industry (EN)" name="industry_en" defaultValue={item.industry_en} />
                <FormField label="Industry (ES)" name="industry_es" defaultValue={item.industry_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Title (EN)" name="title_en" defaultValue={item.title_en} />
                <FormField label="Title (ES)" name="title_es" defaultValue={item.title_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea label="Summary (EN)" name="summary_en" defaultValue={item.summary_en} rows={4} />
                <FormTextarea label="Summary (ES)" name="summary_es" defaultValue={item.summary_es} rows={4} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea label="Outcome (EN)" name="outcome_en" defaultValue={item.outcome_en} rows={3} />
                <FormTextarea label="Outcome (ES)" name="outcome_es" defaultValue={item.outcome_es} rows={3} />
              </div>
              <FormField label="Case Study URL" name="caseStudyUrl" defaultValue={item.caseStudyUrl} />
              <SubmitBar />
            </form>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Calls to Action"
        description="Maintain the conversion-oriented CTAs that appear throughout the landing page."
      >
        <div className="grid gap-6">
          {ctas.map((cta) => (
            <form key={cta.id} action={updateCallToAction} className="grid gap-4 rounded-xl border border-white/10 p-6">
              <input type="hidden" name="id" defaultValue={cta.id} />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Slug" name="slug" defaultValue={cta.slug} />
                <FormField label="Order" name="order" type="number" defaultValue={cta.order} />
                <FormField label="Eyebrow (EN)" name="eyebrow_en" defaultValue={cta.eyebrow_en} />
                <FormField label="Eyebrow (ES)" name="eyebrow_es" defaultValue={cta.eyebrow_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Title (EN)" name="title_en" defaultValue={cta.title_en} />
                <FormField label="Title (ES)" name="title_es" defaultValue={cta.title_es} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormTextarea
                  label="Description (EN)"
                  name="description_en"
                  defaultValue={cta.description_en}
                  rows={3}
                />
                <FormTextarea
                  label="Description (ES)"
                  name="description_es"
                  defaultValue={cta.description_es}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  label="Button Label (EN)"
                  name="buttonLabel_en"
                  defaultValue={cta.buttonLabel_en}
                />
                <FormField
                  label="Button Label (ES)"
                  name="buttonLabel_es"
                  defaultValue={cta.buttonLabel_es}
                />
                <FormField label="Button Link" name="buttonLink" defaultValue={cta.buttonLink} />
              </div>
              <SubmitBar />
            </form>
          ))}
        </div>
      </AdminSection>

      {seoHome ? (
        <AdminSection title="SEO Metadata" description="Control meta tags for the bilingual landing experience.">
          <form action={updateSeo} className="grid gap-4 rounded-xl border border-white/10 p-6">
            <input type="hidden" name="id" defaultValue={seoHome.id} />
            <FormField label="Page Slug" name="page" defaultValue={seoHome.page} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Meta Title (EN)" name="metaTitle_en" defaultValue={seoHome.metaTitle_en} />
              <FormField label="Meta Title (ES)" name="metaTitle_es" defaultValue={seoHome.metaTitle_es} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormTextarea
                label="Meta Description (EN)"
                name="metaDescription_en"
                defaultValue={seoHome.metaDescription_en}
                rows={3}
              />
              <FormTextarea
                label="Meta Description (ES)"
                name="metaDescription_es"
                defaultValue={seoHome.metaDescription_es}
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="OG Image URL" name="ogImageUrl" defaultValue={seoHome.ogImageUrl} />
              <FormTextarea label="Keywords (EN)" name="keywords_en" defaultValue={seoHome.keywords_en} rows={2} />
              <FormTextarea label="Keywords (ES)" name="keywords_es" defaultValue={seoHome.keywords_es} rows={2} />
            </div>
            <SubmitBar />
          </form>
        </AdminSection>
      ) : null}
    </AdminClientShell>
  );
}

