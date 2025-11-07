import { cache } from "react";

import { prisma } from "./prisma";

export const getLandingContent = cache(async () => {
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
    throw new Error("Landing hero content missing.");
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
});

