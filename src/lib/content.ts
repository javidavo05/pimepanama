import { cache } from "react";

import { staticContent } from "./static-content";
import { getFeaturedProjects } from "./portfolio/catalog";
import { copyEn } from "./portfolio/copy-en";

// Option B: the public homepage is fully static — no database required.
// Edit src/lib/static-content.ts and deploy with `git push`. The portfolio
// block of the home reads the featured entries of src/lib/portfolio/catalog.
export const getLandingContent = cache(async () => {
  const portfolio = getFeaturedProjects().map((p) => {
    const en = copyEn[p.slug];
    return {
      id: `portfolio-${p.slug}`,
      title_es: p.name,
      title_en: p.name,
      summary_es: p.tagline,
      summary_en: en?.tagline ?? p.tagline,
      outcome_es: null,
      outcome_en: null,
      clientName: p.client,
      industry_es: p.industry,
      industry_en: en?.industry ?? p.industry,
      imageUrl: null,
      caseStudyUrl: `/portfolio/${p.slug}`,
      liveUrl: p.liveUrl,
      techStack: JSON.stringify(p.stack),
      value: 0,
      category: p.category,
    };
  });
  return { ...staticContent, portfolio };
});
