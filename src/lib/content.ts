import { cache } from "react";

import { prisma } from "./prisma";
import { staticContent } from "./static-content";

export const getLandingContent = cache(async () => {
  try {
    const [hero, sections, services, sectors, differentiators, portfolio, callsToAction, seo] = await Promise.all([
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
      console.warn("Database hero content missing, using static fallback");
      return staticContent;
    }

    return {
      hero,
      sections,
      services,
      sectors,
      differentiators,
      portfolio,
      callsToAction,
      seo,
    };
  } catch (error) {
    console.error("Database connection failed, using static content:", error);
    return staticContent;
  }
});

