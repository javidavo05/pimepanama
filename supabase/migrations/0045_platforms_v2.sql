-- 0045 · Platforms v2
-- 1. Cada plataforma pertenece a un cliente y, si aplica, a un proyecto de ese cliente.
-- 2. Ids reales de lo que la sostiene: repo de GitHub (cuenta + owner/nombre), proyecto de Vercel y
--    proyecto de Supabase. Los correos se quedan: siguen diciendo en qué cuenta vive cada cosa.
-- 3. PlatformAccount guarda el token de Vercel / Supabase cifrado (misma clave que GitHub), el equipo u
--    organización, cuándo se verificó, el último error y de dónde salió el plan (API o a mano).
-- 4. PlatformApiCache: caché en servidor de las listas de GitHub, Vercel y Supabase (≥ 30 min), para no
--    llamar a las APIs en cada carga ni gastar funciones de Vercel.
-- Idempotente. RLS activo y sin políticas: solo el servidor lee y escribe.

-- ─── Platform ───────────────────────────────────────────────────────────────
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "clientId"           TEXT;
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "projectId"          TEXT;
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "githubAccountId"    TEXT;
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "githubRepo"         TEXT;
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "vercelProjectId"    TEXT;
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "vercelProjectName"  TEXT;
ALTER TABLE "Platform" ADD COLUMN IF NOT EXISTS "supabaseProjectRef" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Platform_clientId_fkey') THEN
    ALTER TABLE "Platform" ADD CONSTRAINT "Platform_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Platform_projectId_fkey') THEN
    ALTER TABLE "Platform" ADD CONSTRAINT "Platform_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Platform_githubAccountId_fkey') THEN
    ALTER TABLE "Platform" ADD CONSTRAINT "Platform_githubAccountId_fkey"
      FOREIGN KEY ("githubAccountId") REFERENCES "GithubAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Platform_clientId_idx"        ON "Platform" ("clientId");
CREATE INDEX IF NOT EXISTS "Platform_projectId_idx"       ON "Platform" ("projectId");
CREATE INDEX IF NOT EXISTS "Platform_githubAccountId_idx" ON "Platform" ("githubAccountId");

-- ─── PlatformAccount ────────────────────────────────────────────────────────
ALTER TABLE "PlatformAccount" ADD COLUMN IF NOT EXISTS "tokenEnc"      TEXT;
ALTER TABLE "PlatformAccount" ADD COLUMN IF NOT EXISTS "label"         TEXT;
ALTER TABLE "PlatformAccount" ADD COLUMN IF NOT EXISTS "teamId"        TEXT;
ALTER TABLE "PlatformAccount" ADD COLUMN IF NOT EXISTS "orgSlug"       TEXT;
ALTER TABLE "PlatformAccount" ADD COLUMN IF NOT EXISTS "planSource"    TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "PlatformAccount" ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);
ALTER TABLE "PlatformAccount" ADD COLUMN IF NOT EXISTS "lastError"     TEXT;

-- ─── Caché de las APIs externas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlatformApiCache" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- "github:<accountId>:repos" · "vercel:<accountId>:projects" · "supabase:<accountId>:projects" · "github:commit:<owner/repo>"
  "key"       TEXT NOT NULL,
  "data"      JSONB,
  "error"     TEXT,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformApiCache_userId_key_key" ON "PlatformApiCache" ("userId", "key");

ALTER TABLE "PlatformApiCache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformAccount"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Platform"         ENABLE ROW LEVEL SECURITY;
