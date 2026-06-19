/**
 * Build Supabase Postgres connection strings for Prisma.
 * Copy exact URIs from Supabase Dashboard → Settings → Database if pooler host differs.
 */
const PROJECT_REF = "onodhoqfybzmpaorhyve";

function encodePassword(password) {
  return encodeURIComponent(password);
}

/**
 * @param {string} password - Database password from Supabase project creation
 * @param {{ poolerHost?: string }} [options]
 */
function buildSupabaseDatabaseUrls(password, options = {}) {
  const poolerHost = options.poolerHost ?? "aws-1-us-east-1.pooler.supabase.com";
  const encoded = encodePassword(password);

  return {
    DATABASE_URL: `postgresql://postgres.${PROJECT_REF}:${encoded}@${poolerHost}:6543/postgres?pgbouncer=true`,
    DIRECT_URL: `postgresql://postgres.${PROJECT_REF}:${encoded}@${poolerHost}:5432/postgres`,
    // Direct (non-pooler) — use if pooler host fails during migrate deploy
    DIRECT_DB_URL: `postgresql://postgres:${encoded}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
  };
}

module.exports = { PROJECT_REF, buildSupabaseDatabaseUrls };
