-- Lock down all CMS tables: enable RLS and revoke PostgREST roles (anon/authenticated).
-- The Next.js app uses Prisma over the Postgres connection string (postgres role),
-- which bypasses RLS. Without policies, the Supabase Data API cannot read or write.

ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Hero" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PageSection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sector" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Differentiator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortfolioItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallToAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SeoSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AdminUser" FROM anon, authenticated;
REVOKE ALL ON TABLE "AdminSession" FROM anon, authenticated;
REVOKE ALL ON TABLE "Hero" FROM anon, authenticated;
REVOKE ALL ON TABLE "PageSection" FROM anon, authenticated;
REVOKE ALL ON TABLE "Service" FROM anon, authenticated;
REVOKE ALL ON TABLE "Sector" FROM anon, authenticated;
REVOKE ALL ON TABLE "Differentiator" FROM anon, authenticated;
REVOKE ALL ON TABLE "PortfolioItem" FROM anon, authenticated;
REVOKE ALL ON TABLE "CallToAction" FROM anon, authenticated;
REVOKE ALL ON TABLE "SeoSetting" FROM anon, authenticated;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;

-- Future Prisma tables: default deny for API roles
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
