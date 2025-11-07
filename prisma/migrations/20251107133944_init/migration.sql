-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'STAFF');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hero" (
    "id" TEXT NOT NULL,
    "headline_en" TEXT NOT NULL,
    "headline_es" TEXT NOT NULL,
    "subheadline_en" TEXT NOT NULL,
    "subheadline_es" TEXT NOT NULL,
    "highlight_en" TEXT,
    "highlight_es" TEXT,
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "ctaPrimaryLabel_en" TEXT,
    "ctaPrimaryLabel_es" TEXT,
    "ctaPrimaryLink" TEXT,
    "ctaSecondaryLabel_en" TEXT,
    "ctaSecondaryLabel_es" TEXT,
    "ctaSecondaryLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageSection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title_en" TEXT,
    "title_es" TEXT,
    "subtitle_en" TEXT,
    "subtitle_es" TEXT,
    "body_en" TEXT,
    "body_es" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "imageUrl" TEXT,
    "title_en" TEXT NOT NULL,
    "title_es" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_es" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title_en" TEXT NOT NULL,
    "title_es" TEXT NOT NULL,
    "description_en" TEXT,
    "description_es" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Differentiator" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title_en" TEXT NOT NULL,
    "title_es" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_es" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Differentiator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "clientName" TEXT,
    "industry_en" TEXT,
    "industry_es" TEXT,
    "title_en" TEXT NOT NULL,
    "title_es" TEXT NOT NULL,
    "summary_en" TEXT NOT NULL,
    "summary_es" TEXT NOT NULL,
    "outcome_en" TEXT,
    "outcome_es" TEXT,
    "caseStudyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallToAction" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "eyebrow_en" TEXT,
    "eyebrow_es" TEXT,
    "title_en" TEXT NOT NULL,
    "title_es" TEXT NOT NULL,
    "description_en" TEXT,
    "description_es" TEXT,
    "buttonLabel_en" TEXT,
    "buttonLabel_es" TEXT,
    "buttonLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallToAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSetting" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "metaTitle_en" TEXT NOT NULL,
    "metaTitle_es" TEXT NOT NULL,
    "metaDescription_en" TEXT NOT NULL,
    "metaDescription_es" TEXT NOT NULL,
    "ogImageUrl" TEXT,
    "keywords_en" TEXT,
    "keywords_es" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PageSection_slug_key" ON "PageSection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_slug_key" ON "Sector"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Differentiator_slug_key" ON "Differentiator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItem_slug_key" ON "PortfolioItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CallToAction_slug_key" ON "CallToAction"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SeoSetting_page_key" ON "SeoSetting"("page");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
